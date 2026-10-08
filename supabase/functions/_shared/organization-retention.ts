type RetentionClient = {
  rpc: (name: string, args: { _session_token: string; _organization_id: string }) =>
    PromiseLike<{ data: unknown; error: unknown }>;
};

/** Fail closed before any Auth, Storage or database cleanup. RPC checks admin permissions. */
export async function getOrganizationRetentionEligibility(
  client: RetentionClient, sessionToken: string, organizationId: string,
): Promise<"allowed" | "retained" | "unavailable"> {
  try {
    const { data, error } = await client.rpc("admin_check_organization_retention", {
      _session_token: sessionToken, _organization_id: organizationId,
    });
    if (error || !data || typeof data !== "object" || !("retained" in data) || typeof data.retained !== "boolean") return "unavailable";
    return data.retained ? "retained" : "allowed";
  } catch { return "unavailable"; }
}
