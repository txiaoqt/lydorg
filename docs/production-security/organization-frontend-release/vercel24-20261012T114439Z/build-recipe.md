# Deterministic Organization build recipe

## Inputs

Use only `organization-storage-vercel24-source.zip` from the adjacent release manifest: SHA-256 `e7d43c8aa7d0d0a2cc42130eafd34ad9b1b5147aeb416aba55349353f7fa33c8`, 15,424,325 bytes, 562 files. Extract into a fresh directory and validate every source entry against `source-manifest.json`. No symlinks, private env files, `node_modules`, compiled output or `.vercel` files are included.

The fixed version is `1.0.0-org-storage-rc+20261012114439.vercel24`. Root `package-lock.json`, Vite config and actual app TypeScript config are unchanged from the reviewed input. `npm ci` uses the lockfile and rejects mismatched dependency declarations: [npm ci documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

## Verified local toolchain

- Windows x64 Node `24.21.0`, npm `11.19.0`.
- Reused official runtime at `.agent/admin-storage-vercel-20261012T035933Z/toolchain/extracted/node-v24.21.0-win-x64/`.
- `node.exe` SHA-256: `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`.
- Official Node ZIP SHA-256 from the preserved toolchain receipt: `158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541`. Download/checksum HTTPS provenance was previously verified; signature verification was not performed.
- Local Python validation reused the existing Windows Python 3.14.3 isolated venv. Actual Python 3.12 and Linux remain hosted checks.

## Build steps

1. Verify archive and source inventory before installation.
2. Use Node 24 on PATH. Run `npm ci --include=dev --no-audit --no-fund`, preserving the reviewed Radix postinstall patch. No dependency/version update is authorized.
3. Supply the four approved public settings through a trusted process/environment. Never use a service-role/operator key. The resulting sorted configuration hash must be `cb861a63dc9a73eda9a295c21d659fabed8ea4dba15bf8722264b281e9c525bf`.
4. Run `npm run build`. `scripts/build-organization-release.mjs` validates inputs, starts a clean Node child and invokes Vite with production mode, a fixed version, empty environment directory and `build/` output. Existing routing/header behavior comes from the archived `vercel.json`.
5. Inventory every generated file; compact sorted inventory must hash to `bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94` on the verified Windows toolchain. Investigate hosted differences rather than silently replacing this reference.

Local validation used two fresh source directories and separate empty npm caches/user configs. Build one supplied simulated Vercel production/project metadata plus ten benign canaries; build two omitted canaries. No real provider identity or credentials were substituted. Every one of the 53 output files matched.

For hosted execution, the provider supplies its real system metadata. The project is `prj_ywvIWJbULZOdCMtrt6JPcMqguA2N`, target environment `production`. Runtime Node major must be 24; the provider controls minor/patch version. Team ownership must be independently checked through authenticated provider metadata, not assumed from environment labels.

## Validation entrypoints and evidence

- Packaging: `npm run test:organization-packaging` (44 assertions).
- Frontend: nine Vitest suites listed in `.agent/organization-storage-vercel-20261012T114439Z/validate.mjs`, 73 assertions.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --pretty false --project tsconfig.app.json`; actual exit 2 / 651 errors. A successful Vite build does not replace this failed check.
- API: unchanged worker/API source, declared `requirements.txt`, isolated mocked seven-test Python harness. No external sync call is needed.
- Root `git diff --check` and byte-preservation snapshots are recorded separately.

No deployment command ran. Future candidate deployment must upload fresh source only, not the dirty repository, installed dependencies or the ordinary static ZIP. No `--prebuilt` route is prepared.
