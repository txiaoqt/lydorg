# Proposed separate authorization — not executed

> I authorize ONE controlled promotion of the existing READY Admin deployment `dpl_AZ287kU35oFTVqyTEQRf749qncAA` (`https://lydorg-7bb5w6yag-toffs-projects-81b2ce10.vercel.app`) to the production target of Vercel project `lydorg`, project ID `prj_J36xqAUQELX8NttCaFFInsxcCEaI`, under team `toffs-projects-81b2ce10`, team ID `team_lrnDtn1fujS9WebCMQoWHmGR`, including `y-trace-admin.vercel.app`.
>
> Before promotion, reverify the exact team/project, immutable candidate identity and READY state, current configured production domains, and current Admin and Organization/PWA aliases. Confirm no competing deployment or promotion. Use the accepted 53-file inventory SHA-256 `1d47dc965081fab8d3b6c996f17835f960f7166e57bcf341c529891725e0348d` and preserve all existing receipts. Stop before submission if any expected project, alias, candidate or authorization scope differs.
>
> Promote this existing deployment once through the supported explicit-project provider operation. Do not rebuild, redeploy, push Git, modify Vercel project/environment settings, change the Organization/PWA project, modify Supabase or initiate Storage cutover.
>
> After promotion, independently verify the intended Admin production target and aliases, unchanged Organization/PWA deployment and ACTIVE gateway. Perform bounded direct public GET checks of the approved Admin static assets, root/deep routes and security headers, plus GET/OPTIONS for `/api/sync-run-once`, without service-worker interception. No sync POST, private-file tests, new application sessions, accounts, uploads, deletions or business mutations. Preserve a sanitized external receipt.
>
> If the promotion response is uncertain, reconcile read-only and stop without retrying. If post-promotion verification fails, report the actual committed state and stop subsequent rollout for separately reviewed forward recovery or fail-closed containment. No automatic rollback or restoration of vulnerable frontend behavior is authorized.

A provider project promotion updates the production target and can update its configured production aliases. The exact `lydorg` alias set must be disclosed during immediate preflight; the separate `yorbms_user` project is excluded.
