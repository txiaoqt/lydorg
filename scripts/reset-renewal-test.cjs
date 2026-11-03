// Resets the renewal test organization to "Cycle 2, ready to renew".
// Usage (project folder): node scripts/reset-renewal-test.cjs [days-until-expiry, default 30]
// Needs SUPABASE_SERVICE_ROLE_KEY in .env and migration 20261103120000_server_only_renewal_test_reset applied.
const fs = require("fs");
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const days = Number(process.argv[2] ?? 30);
if (!Number.isInteger(days) || days < 1 || days > 365) { console.error("Days must be a whole number from 1 to 365."); process.exit(1); }
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!env.VITE_SUPABASE_URL || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env."); process.exit(1); }
(async () => {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/server_reset_renewal_test_org`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_days: days }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`Reset failed (${r.status}): ${body.message || JSON.stringify(body)}`); process.exit(1); }
  console.log(`Renewal test org reset. New test term ${body.termNumber} expires ${body.endDate}.`);
  console.log("Eligibility:", JSON.stringify(body.eligibility));
})();
