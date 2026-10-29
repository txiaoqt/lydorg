# Private foundation environment setup

Setup date: 2026-10-11. Production target: `mqqaykksadotbrghbexz`.

**Local setup PASS. Native connectivity NOT TESTED.** No native probe, preflight, installer, production/staging write or installation authorization record was executed/created.

## Files and protection

- Root `.env.foundation.local`: created initially with exactly three empty assignments. The latest authorized process-only validation now detects all three values present. Contents and values were never printed during review.
- Root `.env.foundation.example`: safe placeholders and usage instructions.
- `.gitignore`: explicit root ignore rule, independently verified effective. Private file is not tracked. Do not force-add it.
- Windows file ACL: inheritance disabled; only the current Windows user and SYSTEM have explicit FullControl. Reverified after editing. These are plaintext local credentials protected by access controls, not encryption. Keep the file out of uploads, shared folders and synced backups; editors that replace the file may require ACL revalidation.
- `scripts/security/verify-foundation-environment.mjs`: a local validator. Node performs loading; the validator reads only the supplied CA file and reports names/presence/status, never supplied values. It cannot connect to a database.
- `vite.config.ts`: blocks the reserved foundation mode family, including `foundation.local` and Windows case variants, before Vite loads mode files. Also rejects inherited private foundation variable names, even with empty values. Explicit client prefix remains `VITE_`. Ordinary production configuration still resolves.

The native runner bundle and reviewed 47,407-byte SQL are unchanged. Original SQL SHA-256 remains `e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2`.

## Enter or update values

Edit the existing root `.env.foundation.local` in a trusted local editor, in place. Do not copy the example over it, upload it or paste its contents into chat.

1. `YTRACE_PRODUCTION_DB_PASSWORD`: reset PostgreSQL account password.
2. `YTRACE_PRODUCTION_DB_CA_FILE`: absolute local path to the trusted CA certificate.
3. `YTRACE_PRODUCTION_DB_CA_SHA256`: independently verified 64-character hexadecimal SHA-256 of that certificate's exact bytes.

Use Node env-file quoting as shown in the safe example, especially for spaces, `#`, dollar signs and Windows backslashes. Keep only these three keys. Never prefix secrets with `VITE_` or add executable Node options.

Node 22.14.0 supports the built-in environment-file loader. It loads into the child process; existing parent variables take precedence. The commands below keep the secret values out of shell command text and history. See [Node env-file documentation](https://nodejs.org/api/cli.html#--env-filefile). Vite normally loads mode-specific files and exposes `VITE_` variables; the added guard prevents this reserved file from becoming a frontend mode. See [Vite environment documentation](https://vite.dev/guide/env-and-mode).

## Exact PowerShell commands

From the repository root:

```powershell
Set-Location -LiteralPath 'C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused'

# Optional: clear only stale copies in this PowerShell process.
'YTRACE_PRODUCTION_DB_PASSWORD', 'YTRACE_PRODUCTION_DB_CA_FILE', 'YTRACE_PRODUCTION_DB_CA_SHA256' |
  ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_) -ErrorAction SilentlyContinue }

node --env-file=.env.foundation.local scripts/security/verify-foundation-environment.mjs
if ($LASTEXITCODE -ne 0) { throw 'Stop: local foundation environment validation failed.' }
```

The latest local result is PASS: all variables present, CA file exists, supplied SHA-256 matches. This checks bytes against the supplied fingerprint; it does not independently authenticate the fingerprint's provenance or verify a live TLS connection.

**Next task only**, run the existing READ-ONLY probe:

```powershell
node --env-file=.env.foundation.local docs/production-security/storage-cutover/diagnostics/20261011T125750Z/native-postgres-readonly-probe.mjs
if ($LASTEXITCODE -ne 0) { throw 'Stop: native read-only probe did not pass.' }
```

Then, after fresh independent production control-plane evidence is saved at the fixed ignored proof path according to the existing operator procedure:

```powershell
node --env-file=.env.foundation.local docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-foundation-runner.mjs --preflight
```

The proof path is `.agent/security/production-storage-review/native-foundation-control-plane.json`; the runner requires an exact production match and evidence no more than five minutes old. This setup did not create or refresh it. It is distinct from an installation authorization record.

Do not load this env file for npm, Vite or frontend builds. Do not print process environments, use diagnostic dumps or enable secret-bearing tracing. Stop on any failed prerequisite; do not disable TLS or switch connection routes.

## Validation evidence

- 12/12 focused setup tests passed: empty/placeholder handling, CA existence/type/hash errors, sanitized results, Node loading in a child process, reserved Vite mode variants, inherited-key rejection and normal production-config compatibility.
- TypeScript check for `tsconfig.node.json` passed.
- Targeted `git diff --check` passed; Git reported only a line-ending warning.
- Git exclusion and current restricted ACL verified; reviewed SQL and runner bundle hashes unchanged.
- Existing 28 runner tests were not repeated. No full frontend build or native connection was run for this setup.

See `validation.json` and `focused-tests.tap` for sanitized evidence. Stop after setup; installation requires a separate later authorization.
