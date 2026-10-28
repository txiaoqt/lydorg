// UI availability only. The staging RPC independently validates project, Admin and fixture.
export const isStagingRenewalScenarioEnabled = (env: {
  VITE_ENABLE_STAGING_RENEWAL_SCENARIO?: string;
  VITE_SUPABASE_URL?: string;
}): boolean =>
  env.VITE_ENABLE_STAGING_RENEWAL_SCENARIO === "true" &&
  env.VITE_SUPABASE_URL === "https://zroudsvpswqsjlyttkjf.supabase.co";

export const isRenewalScenarioVisible = (env: {
  DEV: boolean;
  MODE: string;
  VITE_ENABLE_STAGING_RENEWAL_SCENARIO?: string;
  VITE_SUPABASE_URL?: string;
}): boolean => env.DEV || env.MODE !== "production" || isStagingRenewalScenarioEnabled(env);
