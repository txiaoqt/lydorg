import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const token = request.headers.get("x-admin-session-token")?.trim();
  if (!token) return json({ error: "Please sign in with an administrator account." }, 401);
  try {
    const { periodId, organizationIds, operationId } = await request.json();
    if (!uuid.test(periodId ?? "") || !uuid.test(operationId ?? "") ||
        !Array.isArray(organizationIds) || !organizationIds.length ||
        organizationIds.some((id) => typeof id !== "string" || !uuid.test(id))) {
      return json({ error: "Select valid organization submissions and a semester." }, 400);
    }
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // RPC validates the custom admin token and YPOP permission inside the transaction.
    const { data, error } = await client.rpc("admin_bulk_delete_ypop_submissions", {
      _session_token: token, _period_id: periodId,
      _organization_ids: organizationIds, _operation_id: operationId,
    });
    if (error) return json({ error: error.message }, 400);

    // Never accept storage paths from the caller. Only the committed manifest
    // produced from the selected submissions may be removed.
    let storageWarning: string | undefined;
    try {
      const { data: job, error: jobError } = await client.from("admin_ypop_deletion_jobs")
        .select("storage_paths,cleaned_at").eq("id", operationId).single();
      if (jobError) throw jobError;
      if (!job.cleaned_at) {
        const paths = job.storage_paths as string[];
        for (let i = 0; i < paths.length; i += 100) {
          const { error: storageError } = await client.storage.from("ypop-files").remove(paths.slice(i, i + 100));
          if (storageError) throw storageError;
        }
        const { error: updateError } = await client.from("admin_ypop_deletion_jobs")
          .update({ cleaned_at: new Date().toISOString(), cleanup_error: null }).eq("id", operationId);
        if (updateError) throw updateError;
      }
    } catch (cleanupError) {
      console.error("YPOP storage cleanup pending", operationId, cleanupError);
      await client.from("admin_ypop_deletion_jobs").update({
        cleanup_error: cleanupError instanceof Error ? cleanupError.message : "Storage cleanup failed.",
      }).eq("id", operationId);
      storageWarning = "Submissions were deleted. Some stored files still need cleanup; their paths have been saved for retry.";
    }
    return json({ ...data, storageWarning });
  } catch (error) {
    console.error("YPOP submission deletion failed", error);
    return json({ error: "Unable to complete the deletion request. Please try again." }, 500);
  }
});
