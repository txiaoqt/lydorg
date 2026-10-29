import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { createStorageAccessHandler } from "./control.ts";

const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Server credentials never enter a frontend bundle. No user-provided JWT is
// mistaken for custom Admin authorization; the guarded RPC checks that token.
const db = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
Deno.serve(createStorageAccessHandler({
  authorize: async (token, action, bucket, path, resourceId, fileName) => {
    if (!db) return null;
    const { data, error } = await db.rpc("admin_authorize_storage_operation", {
      _session_token: token, _operation: action, _bucket: bucket, _object_name: path, _resource_id: resourceId, _file_name: fileName,
    });
    return error ? null : data;
  },
  sign: async (grant, seconds) => {
    const { data, error } = await db!.storage.from(grant.bucket_id).createSignedUrl(grant.object_name, seconds);
    return error ? null : data?.signedUrl ?? null;
  },
  upload: async grant => {
    const { data, error } = await db!.storage.from(grant.bucket_id).createSignedUploadUrl(grant.object_name, { upsert: false });
    return error || !data?.token ? null : { token: data.token };
  },
  remove: async grant => {
    const { error } = await db!.storage.from(grant.bucket_id).remove([grant.object_name]);
    return !error;
  },
}));
