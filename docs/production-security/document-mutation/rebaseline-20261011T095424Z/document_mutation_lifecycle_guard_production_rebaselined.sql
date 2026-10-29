-- REBASELINED PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.
-- Explicit production project/endpoint verification is mandatory; SQL catalog identity alone is not a project identity.
-- Read-only baseline: 2026-10-11T09:54:24.052471+00:00; containment receipt 20261011230000.
-- Historical candidate SHA-256: 86aec2c915f622bf343f2d4437c2e3f5e1cc8a8df9bdaf052719505dec95a785.
-- Only the preflight gate and these comments differ. All lifecycle/authentication/DDL bodies remain byte-identical.
-- Containment functions, four enabled fixture-marker triggers, API grants and full migration contents are pinned.
-- No new migration receipt is inserted by this historical patch body; expected history remains 164 records.
-- PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.
-- Target must be externally verified as Supabase project mqqaykksadotbrghbexz immediately before execution.
-- Keep outside supabase/migrations: production history is behind this checkout and automatic replay is unsafe.
-- This forward-only patch contains document lifecycle guards/RPC corrections only.
-- No fixture reconciliation, test organization, date simulation, test credentials, data rewrite or Storage policy change.
-- Exact reviewed staging-tested code body SHA-256: b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0.
-- Catalog gate is pinned to read-only production inspection from 2026-10-11.
-- REVIEW ONLY: unapplied forward security patch. No data repair or Storage policy changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $production_gate$
DECLARE
 _actual jsonb;
 _expected jsonb := $expected_catalog${"absence":{"guard_name_collisions":0,"patch_namespace_absent":true},"catalog":{"roles":[{"name":"anon","inherit":true,"superuser":false,"bypass_rls":false,"memberships":[]},{"name":"authenticated","inherit":true,"superuser":false,"bypass_rls":false,"memberships":[]},{"name":"authenticator","inherit":false,"superuser":false,"bypass_rls":false,"memberships":["anon","authenticated","service_role"]},{"name":"postgres","inherit":true,"superuser":false,"bypass_rls":true,"memberships":["anon","authenticated","authenticator","pg_create_subscription","pg_monitor","pg_read_all_data","pg_signal_backend","service_role","supabase_privileged_role"]},{"name":"service_role","inherit":true,"superuser":false,"bypass_rls":true,"memberships":[]}],"tables":[{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"admin_accounts","schema":"public","columns":"4551aa8da02e2592f39e9e64211be064","triggers":"1a1499842d5f27edacd4e1d6f2570f98","force_rls":false,"constraints":"75a8fadb2e396dff4c711ac5e2916c06"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"admin_sessions","schema":"public","columns":"8634257d5bac18b9b6ff371e86a411a7","triggers":"d41d8cd98f00b204e9800998ecf8427e","force_rls":false,"constraints":"97e5656f5e0631c1e8d3025e1f9c7847"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"budget_requests","schema":"public","columns":"3096f91420f62d972ea1ab4675ad746e","triggers":"97f63e10c05f3dcdbe8e125b8c129d82","force_rls":false,"constraints":"c5f77f29023039863a8f616a1ec45c5d"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"document_submission_files","schema":"public","columns":"f0e8a7e204774430ae6be40404e00bfa","triggers":"b694a5934a232f11177512b8038b1fd8","force_rls":false,"constraints":"bcf6f972eac64aafe2545ed58165498e"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"document_submissions","schema":"public","columns":"aa73f305418b2801c8579b1c3f0253a9","triggers":"a4a2edfc5ff6f05984da8c3865893669","force_rls":false,"constraints":"6fbcdb4e9de2cbd2cf385d7346a5246d"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"liquidation_reports","schema":"public","columns":"f2cb0b35fc2c3e8ce52e46fa60abb8ed","triggers":"81f7c36b10901f13f21ced5bc45eb792","force_rls":false,"constraints":"bd6da7b36b9d4fc9943f21719d6821ca"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"organization_accreditations","schema":"public","columns":"cd7cd233f91788ef690357b8068839ac","triggers":"c72d28c86b31fd42730d24f261dd8d82","force_rls":false,"constraints":"a6533b63860bb8fe4a84a518fafb99b3"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"organization_profiles","schema":"public","columns":"294d48d903a30c6f2aeffd7f041e62cf","triggers":"09102523d10651bef58689c05ab16bb4","force_rls":false,"constraints":"f5bfa675b135ad63287f4a70e04f3999"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"organization_renewals","schema":"public","columns":"74977b28c3b8674b9112ab6d10bc3831","triggers":"f40ca4827bad3c5bde2a95b076f386c8","force_rls":false,"constraints":"f04ada1d2eb94e6a05f598c2c2d367bd"},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"owner":"postgres","table":"roles","schema":"public","columns":"5e0dde8a5f0b0e0bac4b5383185d7c9f","triggers":"d41d8cd98f00b204e9800998ecf8427e","force_rls":false,"constraints":"8ed6742f27efeb959b05f537a069828e"},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":false,"owner":"postgres","table":"schema_migrations","schema":"supabase_migrations","columns":"b1ec9c72c85d36c594e0356c8e2cfb31","triggers":"d41d8cd98f00b204e9800998ecf8427e","force_rls":false,"constraints":"e1104827b3e948a2eceabea7d1cb1ebb"}],"policies":"badea3ac4e8877ef1a919bab0883a854","functions":[{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"33ba7c606820f771e4ed79709bcd188b","owner":"postgres","signature":"admin_approve_renewal(text,uuid,text,text)","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"804caabb51c48bde392768971a9b6c91","owner":"postgres","signature":"admin_cleanup_yorp_sample_dataset(text,text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"e08abef51274c58a5202440fd5242eb1","owner":"postgres","signature":"admin_ensure_renewal_test_account_profile(text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"1fe788c8e9983ecc49a925e76f1cd6c9","owner":"postgres","signature":"admin_get_or_create_renewal_test_account(text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"4b274df3cba7af260c503260e9fc92f2","owner":"postgres","signature":"admin_get_yorp_sample_dataset_status(text,text)","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"037a3b0b0844a38619f6ce768cb3372b","owner":"postgres","signature":"admin_prepare_renewal_test_scenario(text,integer,date)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"8ce7c63826f845120f0616bf3faa2324","owner":"postgres","signature":"admin_reset_renewal_test_scenario(text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"d83a26a06867d1b2d1f21027d3e4c6f0","owner":"postgres","signature":"admin_restore_renewal_test_scenario(text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"a3e4de38869718a570b7e6b8b2e22d1f","owner":"postgres","signature":"admin_seed_renewal_test_registration_documents(text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"b6e376ab185fbe42cc4cd2da3b14c874","owner":"postgres","signature":"admin_seed_yorp_sample_dataset(text,text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"33ccae7f636011a5e2a3310035fdc0a0","owner":"postgres","signature":"admin_seed_yorp_sample_dataset_core(text,text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"6c46228859ad6e8163988ecbf2db6877","owner":"postgres","signature":"calculate_organization_renewal_eligibility(uuid)","volatility":"s","security_definer":true},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"5c1f0179b9f279eb7a99ff9ee8627c3f","owner":"postgres","signature":"delete_organization_account_canonical(text,uuid)","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"8e784def2e544f558c0a87cd718204cb","owner":"postgres","signature":"diversify_yorp_seed_projects_and_budgets()","volatility":"v","security_definer":false},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"5ea02f1e637d463c4df2e3c7e333aa4b","owner":"postgres","signature":"enforce_accreditation_immutability()","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"bdafdef3fded73e5816c199a5ede36c7","owner":"postgres","signature":"enforce_renewal_terminal_immutability()","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"3a0fa47c620efc033eec091090bbee1c","owner":"postgres","signature":"guard_organization_identity_privileges()","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"c6265ae36e8db8678de7a4e69691008e","owner":"postgres","signature":"guard_submitted_registration_document_edits()","volatility":"v","security_definer":false},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"683db5c6c05d3012f8b9bb36398f61b9","owner":"postgres","signature":"is_development_or_test_environment()","volatility":"s","security_definer":false},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"b1a1e8a2d5eb9e8ccd66b10b6c652b45","owner":"postgres","signature":"promote_renewal_submission_files_for_review()","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"e486017358c8e1f9264752f8ef5cdbe9","owner":"postgres","signature":"rebalance_yorp_seed_reporting_quarters()","volatility":"v","security_definer":false},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"7121da46bd1bf383ab352d49eda2235a","owner":"postgres","signature":"repair_yorp_seeded_fixture_relationships(uuid,uuid,uuid,jsonb,text)","volatility":"v","security_definer":false},{"acl":[{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"ce30b4dff57a2fa1b7bf314c01e9fae6","owner":"postgres","signature":"replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"252754fd75505948c26afe27f6b0b760","owner":"postgres","signature":"update_admin_document_submission_file_review(text,uuid,document_submission_status,text)","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"59370b100efed37d5975dc16983d786a","owner":"postgres","signature":"user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"d19a1d0415f3eb900bab7dea241f0b21","owner":"postgres","signature":"user_resubmit_renewal(uuid)","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"52bbac2146c7a9473898fb1b6b8908c8","owner":"postgres","signature":"user_start_or_get_renewal_draft(uuid)","volatility":"v","security_definer":true},{"acl":[{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"d41b680681db2323aba2c62693f59131","owner":"postgres","signature":"user_submit_renewal(uuid)","volatility":"v","security_definer":true},{"acl":[{"grantee":"PUBLIC","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"anon","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"authenticated","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"},{"grantee":"service_role","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"50d5dcf06885fa593fe5355fc8892d69","owner":"postgres","signature":"validate_admin_session_token(text)","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"0f5766e8fe835c30681dab0ea86571db","owner":"postgres","signature":"ytrace_identity.authorize_reviewer(text)","volatility":"v","security_definer":true},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"EXECUTE"}],"md5":"608aaefe8b604986f752ea289ebed5f5","owner":"postgres","signature":"ytrace_identity.has_retained_history(uuid)","volatility":"s","security_definer":true}],"migrations":{"count":164,"latest":"20261011230000","fingerprint":"2d1ea52795f2d3c97c71e229819d9a7c"}},"environment_guard":false,"containment_helper":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=pg_catalog, pg_temp"],"signature":"ytrace_production_containment.freeze_fixture_markers()","volatility":"v","definition_md5":"3a551ad03eaa7d24ca136cf1cbecaba9","security_definer":false},"containment_schema":{"acl":"{postgres=UC/postgres}","owner":"postgres","api_access":[{"role":"anon","usage":false,"create":false},{"role":"authenticated","usage":false,"create":false},{"role":"service_role","usage":false,"create":false}]},"containment_receipt":{"name":"production_test_utility_containment","version":"20261011230000","record_md5":"5fe4536e323cd22859c65244bced406f"},"complete_history_md5":"1f5eca911f6e2057ae070a955eaca3dc","trigger_dependencies":[{"name":"RI_ConstraintTrigger_a_18059","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18059\" AFTER DELETE ON public.budget_requests FROM budget_request_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18060","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18060\" AFTER UPDATE ON public.budget_requests FROM budget_request_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18077","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18077\" AFTER DELETE ON public.budget_requests FROM liquidation_reports NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18078","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18078\" AFTER UPDATE ON public.budget_requests FROM liquidation_reports NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18041","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18041\" AFTER INSERT ON public.budget_requests FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18042","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18042\" AFTER UPDATE ON public.budget_requests FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18046","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18046\" AFTER INSERT ON public.budget_requests FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18047","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18047\" AFTER UPDATE ON public.budget_requests FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_26626","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_26626\" AFTER INSERT ON public.budget_requests FROM ypop_entries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_26627","table":"public.budget_requests","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_26627\" AFTER UPDATE ON public.budget_requests FROM ypop_entries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"a_production_fixture_markers_guard","table":"public.budget_requests","enabled":"O","function":"ytrace_production_containment.freeze_fixture_markers()","internal":false,"definition":"CREATE TRIGGER a_production_fixture_markers_guard BEFORE INSERT OR UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers()","function_md5":"3a551ad03eaa7d24ca136cf1cbecaba9","function_owner":"postgres"},{"name":"budget_requests_enforce_purpose_advocacy","table":"public.budget_requests","enabled":"O","function":"enforce_budget_request_purpose_advocacy()","internal":false,"definition":"CREATE TRIGGER budget_requests_enforce_purpose_advocacy BEFORE INSERT OR UPDATE OF organization_id, purpose_category ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_purpose_advocacy()","function_md5":"926f312b8f40b1583b39a3915af62dd2","function_owner":"postgres"},{"name":"trg_admin_track_budget_version","table":"public.budget_requests","enabled":"O","function":"admin_track_budget_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_budget_version AFTER INSERT OR DELETE OR UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION admin_track_budget_version()","function_md5":"850e1e4c4cb6778b8da31168f279a380","function_owner":"postgres"},{"name":"trg_budget_request_notify","table":"public.budget_requests","enabled":"O","function":"notify_budget_change()","internal":false,"definition":"CREATE TRIGGER trg_budget_request_notify AFTER UPDATE ON public.budget_requests FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION notify_budget_change()","function_md5":"686ea2ace5f32569b67919c70a87c6a7","function_owner":"postgres"},{"name":"trg_budget_request_status_sync","table":"public.budget_requests","enabled":"O","function":"ensure_liquidation_report_for_budget()","internal":false,"definition":"CREATE TRIGGER trg_budget_request_status_sync AFTER INSERT OR UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION ensure_liquidation_report_for_budget()","function_md5":"1e8df8d4dc0c9c112e2953e4937e7305","function_owner":"postgres"},{"name":"trg_budget_request_ypop_eligibility","table":"public.budget_requests","enabled":"O","function":"enforce_budget_request_ypop_eligibility()","internal":false,"definition":"CREATE TRIGGER trg_budget_request_ypop_eligibility BEFORE INSERT ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_ypop_eligibility()","function_md5":"285806ebbbe64543f943854d6a87bfff","function_owner":"postgres"},{"name":"trg_budget_requests_updated_at","table":"public.budget_requests","enabled":"O","function":"set_updated_at()","internal":false,"definition":"CREATE TRIGGER trg_budget_requests_updated_at BEFORE UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at()","function_md5":"8de7ae383447503e8949149bfb3f0efb","function_owner":"postgres"},{"name":"trg_enforce_budget_request_resubmission","table":"public.budget_requests","enabled":"O","function":"enforce_budget_request_resubmission_lifecycle()","internal":false,"definition":"CREATE TRIGGER trg_enforce_budget_request_resubmission BEFORE UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_resubmission_lifecycle()","function_md5":"79d9bc7e8cbce5fb3b7241a51795b762","function_owner":"postgres"},{"name":"trg_enforce_budget_request_terminal_status","table":"public.budget_requests","enabled":"O","function":"enforce_budget_request_terminal_status()","internal":false,"definition":"CREATE TRIGGER trg_enforce_budget_request_terminal_status BEFORE INSERT OR UPDATE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_terminal_status()","function_md5":"9c611f8c5fb3e6e80328cbb84c7c3355","function_owner":"postgres"},{"name":"trg_identity_budget_write","table":"public.budget_requests","enabled":"O","function":"guard_organization_identity_financial_write()","internal":false,"definition":"CREATE TRIGGER trg_identity_budget_write BEFORE INSERT OR UPDATE OF organization_id, status ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_financial_write()","function_md5":"34d8cf0a90d5b8da1a75ee0dfdd87688","function_owner":"postgres"},{"name":"trg_set_budget_request_fiscal_year","table":"public.budget_requests","enabled":"O","function":"set_budget_request_fiscal_year()","internal":false,"definition":"CREATE TRIGGER trg_set_budget_request_fiscal_year BEFORE INSERT ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION set_budget_request_fiscal_year()","function_md5":"db25e3d6a0e4a4f15e455dc2f9411840","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_c_18012","table":"public.document_submission_files","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18012\" AFTER INSERT ON public.document_submission_files FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18013","table":"public.document_submission_files","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18013\" AFTER UPDATE ON public.document_submission_files FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_33424","table":"public.document_submission_files","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_33424\" AFTER INSERT ON public.document_submission_files FROM required_document_types NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_33425","table":"public.document_submission_files","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_33425\" AFTER UPDATE ON public.document_submission_files FROM required_document_types NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"a_production_fixture_markers_guard","table":"public.document_submission_files","enabled":"O","function":"ytrace_production_containment.freeze_fixture_markers()","internal":false,"definition":"CREATE TRIGGER a_production_fixture_markers_guard BEFORE INSERT OR UPDATE ON public.document_submission_files FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers()","function_md5":"3a551ad03eaa7d24ca136cf1cbecaba9","function_owner":"postgres"},{"name":"trg_admin_track_document_file_version","table":"public.document_submission_files","enabled":"O","function":"admin_track_document_file_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_document_file_version AFTER INSERT OR DELETE OR UPDATE ON public.document_submission_files FOR EACH ROW EXECUTE FUNCTION admin_track_document_file_version()","function_md5":"36f6fe0e336b1ebe464249051f47bc1d","function_owner":"postgres"},{"name":"trg_document_submission_files_updated_at","table":"public.document_submission_files","enabled":"O","function":"set_updated_at()","internal":false,"definition":"CREATE TRIGGER trg_document_submission_files_updated_at BEFORE UPDATE ON public.document_submission_files FOR EACH ROW EXECUTE FUNCTION set_updated_at()","function_md5":"8de7ae383447503e8949149bfb3f0efb","function_owner":"postgres"},{"name":"trg_guard_submitted_registration_document_edits","table":"public.document_submission_files","enabled":"O","function":"guard_submitted_registration_document_edits()","internal":false,"definition":"CREATE TRIGGER trg_guard_submitted_registration_document_edits BEFORE DELETE OR UPDATE ON public.document_submission_files FOR EACH ROW EXECUTE FUNCTION guard_submitted_registration_document_edits()","function_md5":"c6265ae36e8db8678de7a4e69691008e","function_owner":"postgres"},{"name":"trg_immutable_renewal_test_registration_file","table":"public.document_submission_files","enabled":"O","function":"guard_renewal_test_registration_packet_immutable()","internal":false,"definition":"CREATE TRIGGER trg_immutable_renewal_test_registration_file BEFORE INSERT OR DELETE OR UPDATE ON public.document_submission_files FOR EACH ROW EXECUTE FUNCTION guard_renewal_test_registration_packet_immutable()","function_md5":"82fe24048d3d32b9c3643409873441ea","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_a_18010","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18010\" AFTER DELETE ON public.document_submissions FROM document_submission_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18011","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18011\" AFTER UPDATE ON public.document_submissions FROM document_submission_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17980","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17980\" AFTER INSERT ON public.document_submissions FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17981","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17981\" AFTER UPDATE ON public.document_submissions FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17985","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17985\" AFTER INSERT ON public.document_submissions FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17986","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17986\" AFTER UPDATE ON public.document_submissions FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31716","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31716\" AFTER INSERT ON public.document_submissions FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31717","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31717\" AFTER UPDATE ON public.document_submissions FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_32772","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_32772\" AFTER INSERT ON public.document_submissions FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_32773","table":"public.document_submissions","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_32773\" AFTER UPDATE ON public.document_submissions FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"a_production_fixture_markers_guard","table":"public.document_submissions","enabled":"O","function":"ytrace_production_containment.freeze_fixture_markers()","internal":false,"definition":"CREATE TRIGGER a_production_fixture_markers_guard BEFORE INSERT OR UPDATE ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers()","function_md5":"3a551ad03eaa7d24ca136cf1cbecaba9","function_owner":"postgres"},{"name":"trg_admin_track_document_submission_version","table":"public.document_submissions","enabled":"O","function":"admin_track_document_submission_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_document_submission_version AFTER INSERT OR DELETE OR UPDATE ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION admin_track_document_submission_version()","function_md5":"21d7a797af2af446678a16750235646c","function_owner":"postgres"},{"name":"trg_document_submission_notify","table":"public.document_submissions","enabled":"O","function":"notify_submission_change()","internal":false,"definition":"CREATE TRIGGER trg_document_submission_notify AFTER UPDATE ON public.document_submissions FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION notify_submission_change()","function_md5":"0da3cdcd6af21b6b28016853b205685f","function_owner":"postgres"},{"name":"trg_document_submissions_updated_at","table":"public.document_submissions","enabled":"O","function":"set_updated_at()","internal":false,"definition":"CREATE TRIGGER trg_document_submissions_updated_at BEFORE UPDATE ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at()","function_md5":"8de7ae383447503e8949149bfb3f0efb","function_owner":"postgres"},{"name":"trg_identity_documents_owner","table":"public.document_submissions","enabled":"O","function":"guard_historical_organization_owner()","internal":false,"definition":"CREATE TRIGGER trg_identity_documents_owner BEFORE UPDATE OF organization_id ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner()","function_md5":"9568bb785b8d832a58e1acc894d74610","function_owner":"postgres"},{"name":"trg_immutable_renewal_test_registration_submission","table":"public.document_submissions","enabled":"O","function":"guard_renewal_test_registration_packet_immutable()","internal":false,"definition":"CREATE TRIGGER trg_immutable_renewal_test_registration_submission BEFORE DELETE OR UPDATE ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION guard_renewal_test_registration_packet_immutable()","function_md5":"82fe24048d3d32b9c3643409873441ea","function_owner":"postgres"},{"name":"trg_promote_renewal_files_for_admin_review","table":"public.document_submissions","enabled":"O","function":"promote_renewal_submission_files_for_review()","internal":false,"definition":"CREATE TRIGGER trg_promote_renewal_files_for_admin_review AFTER UPDATE OF status ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION promote_renewal_submission_files_for_review()","function_md5":"b1a1e8a2d5eb9e8ccd66b10b6c652b45","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_a_18102","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18102\" AFTER DELETE ON public.liquidation_reports FROM liquidation_report_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18103","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18103\" AFTER UPDATE ON public.liquidation_reports FROM liquidation_report_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18079","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18079\" AFTER INSERT ON public.liquidation_reports FROM budget_requests NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18080","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18080\" AFTER UPDATE ON public.liquidation_reports FROM budget_requests NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18084","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18084\" AFTER INSERT ON public.liquidation_reports FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18085","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18085\" AFTER UPDATE ON public.liquidation_reports FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18089","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18089\" AFTER INSERT ON public.liquidation_reports FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_18090","table":"public.liquidation_reports","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_18090\" AFTER UPDATE ON public.liquidation_reports FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"a_production_fixture_markers_guard","table":"public.liquidation_reports","enabled":"O","function":"ytrace_production_containment.freeze_fixture_markers()","internal":false,"definition":"CREATE TRIGGER a_production_fixture_markers_guard BEFORE INSERT OR UPDATE ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers()","function_md5":"3a551ad03eaa7d24ca136cf1cbecaba9","function_owner":"postgres"},{"name":"trg_admin_track_liquidation_version","table":"public.liquidation_reports","enabled":"O","function":"admin_track_liquidation_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_liquidation_version AFTER INSERT OR DELETE OR UPDATE ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION admin_track_liquidation_version()","function_md5":"83a56786814153d81ce56eabb40aaebf","function_owner":"postgres"},{"name":"trg_identity_liquidation_owner","table":"public.liquidation_reports","enabled":"O","function":"guard_historical_organization_owner()","internal":false,"definition":"CREATE TRIGGER trg_identity_liquidation_owner BEFORE UPDATE OF organization_id ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner()","function_md5":"9568bb785b8d832a58e1acc894d74610","function_owner":"postgres"},{"name":"trg_liquidation_report_status_sync","table":"public.liquidation_reports","enabled":"O","function":"notify_liquidation_change()","internal":false,"definition":"CREATE TRIGGER trg_liquidation_report_status_sync BEFORE INSERT OR UPDATE ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION notify_liquidation_change()","function_md5":"3307b668e41b44a85323bb20de15aca0","function_owner":"postgres"},{"name":"trg_liquidation_reports_updated_at","table":"public.liquidation_reports","enabled":"O","function":"set_updated_at()","internal":false,"definition":"CREATE TRIGGER trg_liquidation_reports_updated_at BEFORE UPDATE ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at()","function_md5":"8de7ae383447503e8949149bfb3f0efb","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_a_31695","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_setnull_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31695\" AFTER DELETE ON public.organization_accreditations FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_setnull_del\"()","function_md5":"1c38b71d4bcb1bebb247fb6d1c518e23","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31696","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31696\" AFTER UPDATE ON public.organization_accreditations FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_33734","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_setnull_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_33734\" AFTER DELETE ON public.organization_accreditations FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_setnull_del\"()","function_md5":"1c38b71d4bcb1bebb247fb6d1c518e23","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_33735","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_33735\" AFTER UPDATE ON public.organization_accreditations FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31648","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31648\" AFTER INSERT ON public.organization_accreditations FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31649","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31649\" AFTER UPDATE ON public.organization_accreditations FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31653","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31653\" AFTER INSERT ON public.organization_accreditations FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31654","table":"public.organization_accreditations","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31654\" AFTER UPDATE ON public.organization_accreditations FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"trg_accreditation_immutability","table":"public.organization_accreditations","enabled":"O","function":"enforce_accreditation_immutability()","internal":false,"definition":"CREATE TRIGGER trg_accreditation_immutability BEFORE DELETE OR UPDATE ON public.organization_accreditations FOR EACH ROW EXECUTE FUNCTION enforce_accreditation_immutability()","function_md5":"5ea02f1e637d463c4df2e3c7e333aa4b","function_owner":"postgres"},{"name":"trg_admin_track_accreditation_version","table":"public.organization_accreditations","enabled":"O","function":"admin_track_renewal_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_accreditation_version AFTER INSERT OR DELETE OR UPDATE ON public.organization_accreditations FOR EACH ROW EXECUTE FUNCTION admin_track_renewal_version()","function_md5":"9fe607265fe31cfe89c3aa96296134d5","function_owner":"postgres"},{"name":"trg_identity_accreditation_owner","table":"public.organization_accreditations","enabled":"O","function":"guard_historical_organization_owner()","internal":false,"definition":"CREATE TRIGGER trg_identity_accreditation_owner BEFORE UPDATE OF organization_id ON public.organization_accreditations FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner()","function_md5":"9568bb785b8d832a58e1acc894d74610","function_owner":"postgres"},{"name":"trg_sync_organization_accreditation_projection","table":"public.organization_accreditations","enabled":"O","function":"sync_organization_accreditation_projection()","internal":false,"definition":"CREATE TRIGGER trg_sync_organization_accreditation_projection AFTER INSERT OR UPDATE ON public.organization_accreditations FOR EACH ROW EXECUTE FUNCTION sync_organization_accreditation_projection()","function_md5":"d9d4d85fbc26cee78618d591073393b7","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_a_17978","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_17978\" AFTER DELETE ON public.organization_profiles FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_17979","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_17979\" AFTER UPDATE ON public.organization_profiles FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18039","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18039\" AFTER DELETE ON public.organization_profiles FROM budget_requests NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18040","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18040\" AFTER UPDATE ON public.organization_profiles FROM budget_requests NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18082","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18082\" AFTER DELETE ON public.organization_profiles FROM liquidation_reports NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18083","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18083\" AFTER UPDATE ON public.organization_profiles FROM liquidation_reports NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18152","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18152\" AFTER DELETE ON public.organization_profiles FROM compliance_remarks NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18153","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18153\" AFTER UPDATE ON public.organization_profiles FROM compliance_remarks NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18182","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18182\" AFTER DELETE ON public.organization_profiles FROM notifications NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18183","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18183\" AFTER UPDATE ON public.organization_profiles FROM notifications NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18201","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18201\" AFTER DELETE ON public.organization_profiles FROM activity_logs NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_18202","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_18202\" AFTER UPDATE ON public.organization_profiles FROM activity_logs NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_20304","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_20304\" AFTER DELETE ON public.organization_profiles FROM ypop_entries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_20305","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_20305\" AFTER UPDATE ON public.organization_profiles FROM ypop_entries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_20330","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_20330\" AFTER DELETE ON public.organization_profiles FROM ypop_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_20331","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_20331\" AFTER UPDATE ON public.organization_profiles FROM ypop_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25534","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25534\" AFTER DELETE ON public.organization_profiles FROM ypop_event_participations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25535","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25535\" AFTER UPDATE ON public.organization_profiles FROM ypop_event_participations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25565","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25565\" AFTER DELETE ON public.organization_profiles FROM ypop_event_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25566","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25566\" AFTER UPDATE ON public.organization_profiles FROM ypop_event_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25724","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25724\" AFTER DELETE ON public.organization_profiles FROM move_applications NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25725","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25725\" AFTER UPDATE ON public.organization_profiles FROM move_applications NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25751","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25751\" AFTER DELETE ON public.organization_profiles FROM move_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_25752","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_25752\" AFTER UPDATE ON public.organization_profiles FROM move_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26004","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26004\" AFTER DELETE ON public.organization_profiles FROM inquiries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26005","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26005\" AFTER UPDATE ON public.organization_profiles FROM inquiries NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26282","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26282\" AFTER DELETE ON public.organization_profiles FROM ypop_org_activities NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26283","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26283\" AFTER UPDATE ON public.organization_profiles FROM ypop_org_activities NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26308","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26308\" AFTER DELETE ON public.organization_profiles FROM ypop_org_activity_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_26309","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_26309\" AFTER UPDATE ON public.organization_profiles FROM ypop_org_activity_files NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_28353","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_28353\" AFTER DELETE ON public.organization_profiles FROM urn_review_history NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_28354","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_28354\" AFTER UPDATE ON public.organization_profiles FROM urn_review_history NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31646","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31646\" AFTER DELETE ON public.organization_profiles FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31647","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31647\" AFTER UPDATE ON public.organization_profiles FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31677","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31677\" AFTER DELETE ON public.organization_profiles FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31678","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31678\" AFTER UPDATE ON public.organization_profiles FROM organization_renewals NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_35135","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_35135\" AFTER DELETE ON public.organization_profiles FROM organization_contacts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_35136","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_35136\" AFTER UPDATE ON public.organization_profiles FROM organization_contacts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_35965","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_cascade_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_35965\" AFTER DELETE ON public.organization_profiles FROM ypop_submission_deletion_receipts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_cascade_del\"()","function_md5":"370af44ecc509ef17eb22b658ab8a6cb","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_35966","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_35966\" AFTER UPDATE ON public.organization_profiles FROM ypop_submission_deletion_receipts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_37042","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_restrict_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_37042\" AFTER DELETE ON public.organization_profiles FROM ytrace_identity.cases NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_restrict_del\"()","function_md5":"253aa1f96333ac2ce5f05cd227965091","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_37043","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_37043\" AFTER UPDATE ON public.organization_profiles FROM ytrace_identity.cases NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17947","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17947\" AFTER INSERT ON public.organization_profiles FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_17948","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_17948\" AFTER UPDATE ON public.organization_profiles FROM auth.users NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31697","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31697\" AFTER INSERT ON public.organization_profiles FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31698","table":"public.organization_profiles","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31698\" AFTER UPDATE ON public.organization_profiles FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"trg_a_identity_privileges","table":"public.organization_profiles","enabled":"O","function":"guard_organization_identity_privileges()","internal":false,"definition":"CREATE TRIGGER trg_a_identity_privileges BEFORE INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_privileges()","function_md5":"3a0fa47c620efc033eec091090bbee1c","function_owner":"postgres"},{"name":"trg_admin_track_organization_profile_version","table":"public.organization_profiles","enabled":"O","function":"admin_track_organization_profile_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_organization_profile_version AFTER INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION admin_track_organization_profile_version()","function_md5":"b7b68871d40f08aa00f6a45953f6f3e1","function_owner":"postgres"},{"name":"trg_generate_organization_reference_id","table":"public.organization_profiles","enabled":"O","function":"generate_organization_reference_id()","internal":false,"definition":"CREATE TRIGGER trg_generate_organization_reference_id BEFORE INSERT ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION generate_organization_reference_id()","function_md5":"10d4c5bfa843d3e9e8e0fafbb230a9dd","function_owner":"postgres"},{"name":"trg_identity_retained_deletion","table":"public.organization_profiles","enabled":"O","function":"guard_retained_organization_deletion()","internal":false,"definition":"CREATE TRIGGER trg_identity_retained_deletion BEFORE DELETE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_retained_organization_deletion()","function_md5":"4dd28db38030a73ee633b024e78db340","function_owner":"postgres"},{"name":"trg_normalize_organization_contact_arrays","table":"public.organization_profiles","enabled":"O","function":"normalize_organization_contact_arrays()","internal":false,"definition":"CREATE TRIGGER trg_normalize_organization_contact_arrays BEFORE INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION normalize_organization_contact_arrays()","function_md5":"0e7dd3bb3ecdbfe4844b6fa61752c7e9","function_owner":"postgres"},{"name":"trg_notify_urn_review_change","table":"public.organization_profiles","enabled":"O","function":"notify_urn_review_change()","internal":false,"definition":"CREATE TRIGGER trg_notify_urn_review_change AFTER UPDATE OF urn_review_status ON public.organization_profiles FOR EACH ROW WHEN ((old.urn_review_status IS DISTINCT FROM new.urn_review_status)) EXECUTE FUNCTION notify_urn_review_change()","function_md5":"883712e9886a8ea09a9cac09768c6617","function_owner":"postgres"},{"name":"trg_organization_profile_review_notify","table":"public.organization_profiles","enabled":"O","function":"notify_organization_profile_review_change()","internal":false,"definition":"CREATE TRIGGER trg_organization_profile_review_notify AFTER UPDATE ON public.organization_profiles FOR EACH ROW WHEN ((old.profile_status IS DISTINCT FROM new.profile_status)) EXECUTE FUNCTION notify_organization_profile_review_change()","function_md5":"49c49daff222b4c46d84bc9a9c97c551","function_owner":"postgres"},{"name":"trg_organization_profiles_updated_at","table":"public.organization_profiles","enabled":"O","function":"set_updated_at()","internal":false,"definition":"CREATE TRIGGER trg_organization_profiles_updated_at BEFORE UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()","function_md5":"8de7ae383447503e8949149bfb3f0efb","function_owner":"postgres"},{"name":"trg_protect_urn_review_fields","table":"public.organization_profiles","enabled":"O","function":"protect_urn_review_fields()","internal":false,"definition":"CREATE TRIGGER trg_protect_urn_review_fields BEFORE UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION protect_urn_review_fields()","function_md5":"43ecae00db3ef932746904cfab03b67e","function_owner":"postgres"},{"name":"trg_sync_organization_contacts_from_profile","table":"public.organization_profiles","enabled":"O","function":"sync_organization_contacts_from_profile()","internal":false,"definition":"CREATE TRIGGER trg_sync_organization_contacts_from_profile AFTER INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_contacts_from_profile()","function_md5":"829594ce5fb4c6224dfc2c8b53c8e633","function_owner":"postgres"},{"name":"trg_sync_organization_profile_structured_fields","table":"public.organization_profiles","enabled":"O","function":"sync_organization_profile_structured_fields()","internal":false,"definition":"CREATE TRIGGER trg_sync_organization_profile_structured_fields BEFORE INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_profile_structured_fields()","function_md5":"6ab38b753f91a655969b82aa238318a0","function_owner":"postgres"},{"name":"trg_sync_organization_urn","table":"public.organization_profiles","enabled":"O","function":"sync_organization_urn()","internal":false,"definition":"CREATE TRIGGER trg_sync_organization_urn BEFORE INSERT OR UPDATE OF registration_type, urn ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_urn()","function_md5":"a0eeea260974ab12a20746ec6742b716","function_owner":"postgres"},{"name":"trg_z_enforce_organization_profile_headquarters_location","table":"public.organization_profiles","enabled":"O","function":"enforce_organization_profile_headquarters_location()","internal":false,"definition":"CREATE TRIGGER trg_z_enforce_organization_profile_headquarters_location BEFORE INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION enforce_organization_profile_headquarters_location()","function_md5":"e386f17c704e6ad96da38bda84781c5c","function_owner":"postgres"},{"name":"trg_zz_identity_verification","table":"public.organization_profiles","enabled":"O","function":"guard_organization_identity_verification()","internal":false,"definition":"CREATE TRIGGER trg_zz_identity_verification BEFORE INSERT OR UPDATE ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_verification()","function_md5":"2d62e48e928a1a99dc211d5ff32faf97","function_owner":"postgres"},{"name":"trigger_auto_generate_urn","table":"public.organization_profiles","enabled":"O","function":"handle_organization_profile_urn_auto_gen()","internal":false,"definition":"CREATE TRIGGER trigger_auto_generate_urn BEFORE INSERT ON public.organization_profiles FOR EACH ROW EXECUTE FUNCTION handle_organization_profile_urn_auto_gen()","function_md5":"1533a6e82c08e031343e65787e10bc5a","function_owner":"postgres"},{"name":"RI_ConstraintTrigger_a_31714","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_setnull_del\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31714\" AFTER DELETE ON public.organization_renewals FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_setnull_del\"()","function_md5":"1c38b71d4bcb1bebb247fb6d1c518e23","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_a_31715","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_noaction_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_a_31715\" AFTER UPDATE ON public.organization_renewals FROM document_submissions NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_noaction_upd\"()","function_md5":"dae4248018b89ad39b9bd38c0eaa5a54","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31679","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31679\" AFTER INSERT ON public.organization_renewals FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31680","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31680\" AFTER UPDATE ON public.organization_renewals FROM organization_profiles NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31689","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31689\" AFTER INSERT ON public.organization_renewals FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_31690","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_31690\" AFTER UPDATE ON public.organization_renewals FROM admin_accounts NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_33736","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_ins\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_33736\" AFTER INSERT ON public.organization_renewals FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_ins\"()","function_md5":"1d61f37aa5d841868619bc5213e05cb7","function_owner":"supabase_admin"},{"name":"RI_ConstraintTrigger_c_33737","table":"public.organization_renewals","enabled":"O","function":"\"RI_FKey_check_upd\"()","internal":true,"definition":"CREATE CONSTRAINT TRIGGER \"RI_ConstraintTrigger_c_33737\" AFTER UPDATE ON public.organization_renewals FROM organization_accreditations NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION \"RI_FKey_check_upd\"()","function_md5":"91f3ff61ee7527b0688ce1a1f11db752","function_owner":"supabase_admin"},{"name":"trg_admin_track_renewal_version","table":"public.organization_renewals","enabled":"O","function":"admin_track_renewal_version()","internal":false,"definition":"CREATE TRIGGER trg_admin_track_renewal_version AFTER INSERT OR DELETE OR UPDATE ON public.organization_renewals FOR EACH ROW EXECUTE FUNCTION admin_track_renewal_version()","function_md5":"9fe607265fe31cfe89c3aa96296134d5","function_owner":"postgres"},{"name":"trg_identity_renewal_owner","table":"public.organization_renewals","enabled":"O","function":"guard_historical_organization_owner()","internal":false,"definition":"CREATE TRIGGER trg_identity_renewal_owner BEFORE UPDATE OF organization_id ON public.organization_renewals FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner()","function_md5":"9568bb785b8d832a58e1acc894d74610","function_owner":"postgres"},{"name":"trg_renewal_terminal_immutability","table":"public.organization_renewals","enabled":"O","function":"enforce_renewal_terminal_immutability()","internal":false,"definition":"CREATE TRIGGER trg_renewal_terminal_immutability BEFORE DELETE OR UPDATE ON public.organization_renewals FOR EACH ROW EXECUTE FUNCTION enforce_renewal_terminal_immutability()","function_md5":"bdafdef3fded73e5816c199a5ede36c7","function_owner":"postgres"}],"mutation_dependencies":[{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"admin_approve_renewal(text,uuid,text,text)","volatility":"v","definition_md5":"33ba7c606820f771e4ed79709bcd188b","security_definer":true},{"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public, extensions"],"signature":"delete_organization_account_canonical(text,uuid)","volatility":"v","definition_md5":"5c1f0179b9f279eb7a99ff9ee8627c3f","security_definer":true},{"acl":"{postgres=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public, pg_temp"],"signature":"guard_submitted_registration_document_edits()","volatility":"v","definition_md5":"c6265ae36e8db8678de7a4e69691008e","security_definer":false},{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"hard_delete_admin_template_document(text,uuid)","volatility":"v","definition_md5":"36de9fc3fb6c5ad090579f3261f77bbf","security_definer":true},{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"promote_renewal_submission_files_for_review()","volatility":"v","definition_md5":"b1a1e8a2d5eb9e8ccd66b10b6c652b45","security_definer":true},{"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)","volatility":"v","definition_md5":"ce30b4dff57a2fa1b7bf314c01e9fae6","security_definer":true},{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"update_admin_document_submission_file_review(text,uuid,document_submission_status,text)","volatility":"v","definition_md5":"252754fd75505948c26afe27f6b0b760","security_definer":true},{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)","volatility":"v","definition_md5":"59370b100efed37d5975dc16983d786a","security_definer":true},{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"user_resubmit_renewal(uuid)","volatility":"v","definition_md5":"d19a1d0415f3eb900bab7dea241f0b21","security_definer":true},{"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"signature":"user_submit_renewal(uuid)","volatility":"v","definition_md5":"d41b680681db2323aba2c62693f59131","security_definer":true}]}$expected_catalog$::jsonb;
 _count bigint; _latest text;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'Reviewed postgres installation database and owner required';
 END IF;
 SELECT count(*),max(version) INTO _count,_latest FROM supabase_migrations.schema_migrations;
 IF _count<>164 OR _latest<>'20261011230000' THEN
  RAISE EXCEPTION 'Production migration history drift';
 END IF;
 SELECT q.manifest INTO _actual FROM (
-- Read-only post-containment production compatibility manifest. No data rows, credentials or function bodies.
WITH catalog AS (-- Read-only production catalog manifest; contains fingerprints, never function bodies or credentials.
SELECT jsonb_build_object(
 'functions',(SELECT jsonb_agg(jsonb_build_object(
  'signature',p.oid::regprocedure::text,'md5',md5(pg_get_functiondef(p.oid)),
  'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,
  'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable,'grantor',pg_get_userbyid(a.grantor)) ORDER BY coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee)
 ) ORDER BY n.nspname,p.proname,p.oid::regprocedure::text)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname IN ('admin_approve_renewal','admin_cleanup_yorp_sample_dataset','admin_ensure_renewal_test_account_profile','admin_get_or_create_renewal_test_account','admin_get_yorp_sample_dataset_status','admin_prepare_renewal_test_scenario','admin_reset_renewal_test_scenario','admin_restore_renewal_test_scenario','admin_seed_renewal_test_registration_documents','admin_seed_yorp_sample_dataset','admin_seed_yorp_sample_dataset_core','calculate_organization_renewal_eligibility','delete_organization_account_canonical','diversify_yorp_seed_projects_and_budgets','enforce_accreditation_immutability','enforce_renewal_terminal_immutability','guard_organization_identity_privileges','guard_submitted_registration_document_edits','is_development_or_test_environment','promote_renewal_submission_files_for_review','rebalance_yorp_seed_reporting_quarters','repair_yorp_seeded_fixture_relationships','replace_organization_document_file','update_admin_document_submission_file_review','user_replace_document_submission_file','user_resubmit_renewal','user_start_or_get_renewal_draft','user_submit_renewal','validate_admin_session_token'))
 OR (n.nspname='ytrace_identity' AND p.proname IN ('authorize_reviewer','has_retained_history'))),
 'tables',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable,'grantor',pg_get_userbyid(a.grantor)) ORDER BY coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee),
 'columns',(SELECT md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\n' ORDER BY a.attnum)) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT md5(coalesce(string_agg(con.conname||':'||pg_get_constraintdef(con.oid),E'\n' ORDER BY con.conname),'')) FROM pg_constraint con WHERE con.conrelid=c.oid),
 'triggers',(SELECT md5(coalesce(string_agg(t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid),E'\n' ORDER BY t.tgname),'')) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
 ) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname='public' AND c.relname IN ('organization_profiles','organization_accreditations','organization_renewals','document_submissions','document_submission_files','admin_accounts','admin_sessions','roles','budget_requests','liquidation_reports'))
 OR (n.nspname='supabase_migrations' AND c.relname='schema_migrations')),
 'policies',(SELECT md5(coalesce(string_agg(schemaname||':'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||permissive||':'||coalesce(qual,'')||':'||coalesce(with_check,''),E'\n' ORDER BY schemaname,tablename,policyname),'')) FROM pg_policies WHERE schemaname IN ('public','storage')),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'inherit',r.rolinherit,'bypass_rls',r.rolbypassrls,'superuser',r.rolsuper,'memberships',(SELECT coalesce(jsonb_agg(parent.rolname ORDER BY parent.rolname),'[]'::jsonb) FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid WHERE m.member=r.oid)) ORDER BY r.rolname) FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role','postgres','authenticator')),
 'migrations',(SELECT jsonb_build_object('count',count(*),'latest',max(version),'fingerprint',md5(coalesce(string_agg(version||':'||coalesce(name,''),E'\n' ORDER BY version),''))) FROM supabase_migrations.schema_migrations)
) AS manifest)
SELECT jsonb_build_object(
 'catalog',(SELECT manifest FROM catalog),
 'complete_history_md5',(SELECT md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)::text) FROM supabase_migrations.schema_migrations m),
 'containment_receipt',(SELECT jsonb_build_object('version',version,'name',name,'record_md5',md5(to_jsonb(m)::text)) FROM supabase_migrations.schema_migrations m WHERE version='20261011230000'),
 'containment_helper',(SELECT jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) FROM pg_proc p WHERE p.oid=to_regprocedure('ytrace_production_containment.freeze_fixture_markers()')),
 'containment_schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl::text,'api_access',(SELECT jsonb_agg(jsonb_build_object('role',r,'usage',has_schema_privilege(r,n.oid,'USAGE'),'create',has_schema_privilege(r,n.oid,'CREATE')) ORDER BY r) FROM unnest(ARRAY['anon','authenticated','service_role']) r)) FROM pg_namespace n WHERE n.nspname='ytrace_production_containment'),
 'mutation_dependencies',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','user_submit_renewal','user_resubmit_renewal','guard_submitted_registration_document_edits','admin_approve_renewal','promote_renewal_submission_files_for_review','hard_delete_admin_template_document','delete_organization_account_canonical')),
 'trigger_dependencies',(SELECT jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'internal',t.tgisinternal,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text,'function_md5',md5(pg_get_functiondef(t.tgfoid)),'function_owner',pg_get_userbyid(p.proowner)) ORDER BY n.nspname,c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND c.relname IN ('document_submission_files','document_submissions','organization_profiles','organization_renewals','organization_accreditations','budget_requests','liquidation_reports')),
 'absence',jsonb_build_object('patch_namespace_absent',to_regnamespace('ytrace_document_mutation') IS NULL,'guard_name_collisions',(SELECT count(*) FROM pg_trigger WHERE tgname IN ('a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard') AND NOT tgisinternal)),
 'environment_guard',public.is_development_or_test_environment()
) AS manifest
 ) q;
 IF _actual IS DISTINCT FROM _expected THEN
  RAISE EXCEPTION 'Production post-containment catalog drift; stop and review';
 END IF;
 IF NOT has_database_privilege(current_user,current_database(),'CREATE')
  OR NOT has_schema_privilege(current_user,'public','CREATE')
  OR NOT has_table_privilege(current_user,'public.document_submission_files','TRIGGER')
  OR NOT has_table_privilege(current_user,'public.document_submissions','TRIGGER') THEN
  RAISE EXCEPTION 'Required installation privileges are unavailable';
 END IF;
END $production_gate$;
-- Support fragment: installed only by the forward patch, never separately.
CREATE SCHEMA ytrace_document_mutation;
REVOKE ALL ON SCHEMA ytrace_document_mutation FROM PUBLIC,anon,authenticated;

-- Owner RPC entry point. Match approval's renewal -> organization order, then
-- submission -> file. Recheck the linkage after waiting on all locks.
CREATE FUNCTION ytrace_document_mutation.lock_replacement(_file_id uuid)
RETURNS public.document_submission_files LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE f public.document_submission_files; s public.document_submissions;
 r public.organization_renewals; o public.organization_profiles; _sid uuid; _rid uuid; _oid uuid; _end date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
 SELECT submission_id INTO _sid FROM public.document_submission_files WHERE id=_file_id;
 SELECT renewal_id,organization_id INTO _rid,_oid FROM public.document_submissions WHERE id=_sid;
 IF _sid IS NULL OR _oid IS NULL THEN RAISE EXCEPTION 'Document parent missing'; END IF;
 IF _rid IS NOT NULL THEN
   SELECT * INTO r FROM public.organization_renewals WHERE id=_rid FOR UPDATE;
   IF r.id IS NULL OR r.organization_id IS DISTINCT FROM _oid OR r.status IS NULL OR r.status NOT IN ('draft','needs_revision') THEN
     RAISE EXCEPTION 'Renewal is not editable'; END IF;
 END IF;
 SELECT * INTO o FROM public.organization_profiles WHERE id=_oid FOR SHARE;
 IF o.user_id IS DISTINCT FROM auth.uid() OR o.profile_status::text='suspended_inactive' THEN
   RAISE EXCEPTION 'Organization is not authorized to replace documents'; END IF;
 SELECT * INTO s FROM public.document_submissions WHERE id=_sid FOR UPDATE;
 SELECT * INTO f FROM public.document_submission_files WHERE id=_file_id FOR UPDATE;
 IF s.organization_id IS DISTINCT FROM _oid OR s.renewal_id IS DISTINCT FROM _rid OR f.submission_id IS DISTINCT FROM _sid THEN
   RAISE EXCEPTION 'Document relationship changed'; END IF;
 IF s.status IS NULL OR f.admin_status IS NULL OR s.status::text IN ('approved_green','rejected_red') OR f.admin_status::text NOT IN ('draft','needs_revision') THEN
   RAISE EXCEPTION 'Document is locked or terminal'; END IF;
 IF f.admin_status::text='needs_revision' AND s.status::text<>'needs_revision' THEN
   RAISE EXCEPTION 'Parent is not awaiting revision'; END IF;
 IF f.admin_status::text='draft' AND s.status::text NOT IN ('draft','needs_revision','submitted','under_admin_review','ready_for_review') THEN
   RAISE EXCEPTION 'Parent is not editable'; END IF;
 IF coalesce(s.revision_locked,false) OR coalesce(f.revision_locked,false)
   OR (s.revision_locked_at IS NOT NULL AND s.revision_unlocked_at IS NULL)
   OR (f.revision_locked_at IS NOT NULL AND f.revision_unlocked_at IS NULL)
   OR (s.revision_due_at<=clock_timestamp() AND s.revision_unlocked_at IS NULL)
   OR (f.revision_due_at<=clock_timestamp() AND f.revision_unlocked_at IS NULL)
   OR (_rid IS NOT NULL AND (coalesce(r.revision_locked,false)
      OR (r.revision_locked_at IS NOT NULL AND r.revision_unlocked_at IS NULL)
      OR (r.revision_due_at<=clock_timestamp() AND r.revision_unlocked_at IS NULL))) THEN
   RAISE EXCEPTION 'Document revision is locked or overdue'; END IF;
 IF _rid IS NOT NULL THEN
   SELECT end_date INTO _end FROM public.organization_accreditations
     WHERE id=r.current_accreditation_id AND organization_id=_oid;
   IF _end IS NULL OR current_date>_end+180 THEN RAISE EXCEPTION 'Renewal accreditation prerequisite or cutoff failed'; END IF;
 END IF;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION ytrace_document_mutation.lock_replacement(uuid) FROM PUBLIC,anon,authenticated;

-- Runs for definer RPCs as well as direct REST writes. No Admin/GUC bypass.
CREATE FUNCTION ytrace_document_mutation.guard_file()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.document_submissions; r public.organization_renewals; o public.organization_profiles;
 _sid uuid; _rid uuid; _oid uuid; _path text; _prefix text; _object storage.objects; _payload boolean;
BEGIN
 -- Preserve existing validated template deletion's exact catalog unlink only.
 -- The invoker guard below denies this operation to direct organization clients.
 -- No URL, content, owner, status, review or history change is permitted here.
 IF TG_OP='UPDATE' AND OLD.document_type_id IS NOT NULL AND NEW.document_type_id IS NULL
   AND (to_jsonb(NEW)-ARRAY['document_type_id','updated_at'])=(to_jsonb(OLD)-ARRAY['document_type_id','updated_at']) THEN
   RETURN NEW;
 END IF;
 _sid:=CASE WHEN TG_OP='INSERT' THEN NEW.submission_id ELSE OLD.submission_id END;
 SELECT renewal_id,organization_id INTO _rid,_oid FROM public.document_submissions WHERE id=_sid;
 IF _rid IS NOT NULL THEN
   SELECT * INTO r FROM public.organization_renewals WHERE id=_rid FOR UPDATE;
   IF r.id IS NULL OR r.organization_id IS DISTINCT FROM _oid OR r.status IN ('approved','rejected','cancelled','expired') THEN
     RAISE EXCEPTION 'Terminal renewal documents are immutable'; END IF;
 END IF;
 SELECT * INTO o FROM public.organization_profiles WHERE id=_oid FOR SHARE;
 SELECT * INTO s FROM public.document_submissions WHERE id=_sid FOR UPDATE;
 IF s.id IS NULL OR s.organization_id IS DISTINCT FROM _oid OR s.renewal_id IS DISTINCT FROM _rid THEN
   RAISE EXCEPTION 'Document parent missing or changed'; END IF;
 IF s.status IS NULL OR s.status::text IN ('approved_green','rejected_red') THEN RAISE EXCEPTION 'Terminal submission documents are immutable'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
   OR NEW.document_type_id IS DISTINCT FROM OLD.document_type_id) THEN RAISE EXCEPTION 'Document relationship is immutable'; END IF;
 _payload:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
   _payload:=ROW(NEW.file_url,NEW.file_name,NEW.file_type,NEW.file_size,NEW.uploaded_at)
     IS DISTINCT FROM ROW(OLD.file_url,OLD.file_name,OLD.file_type,OLD.file_size,OLD.uploaded_at);
   IF _payload AND OLD.admin_status::text NOT IN ('draft','needs_revision') THEN
     RAISE EXCEPTION 'Reviewed document content is locked'; END IF;
 END IF;
 IF _payload THEN
   IF TG_OP='UPDATE' AND (coalesce(OLD.revision_locked,false)
     OR (OLD.revision_locked_at IS NOT NULL AND OLD.revision_unlocked_at IS NULL)
     OR (OLD.revision_due_at<=clock_timestamp() AND OLD.revision_unlocked_at IS NULL)) THEN
     RAISE EXCEPTION 'Document revision is locked or overdue'; END IF;
   IF auth.uid() IS NULL OR o.user_id IS DISTINCT FROM auth.uid() OR o.profile_status::text='suspended_inactive' THEN
     RAISE EXCEPTION 'Organization is not authorized to attach this object'; END IF;
   IF _rid IS NOT NULL AND r.status NOT IN ('draft','needs_revision') THEN RAISE EXCEPTION 'Renewal is not editable'; END IF;
   IF coalesce(s.revision_locked,false) OR (s.revision_locked_at IS NOT NULL AND s.revision_unlocked_at IS NULL)
     OR (s.revision_due_at<=clock_timestamp() AND s.revision_unlocked_at IS NULL)
     OR (_rid IS NOT NULL AND (coalesce(r.revision_locked,false) OR (r.revision_locked_at IS NOT NULL AND r.revision_unlocked_at IS NULL)
       OR (r.revision_due_at<=clock_timestamp() AND r.revision_unlocked_at IS NULL))) THEN
     RAISE EXCEPTION 'Parent revision is locked or overdue'; END IF;
   IF NEW.file_url NOT LIKE 'storage://organization-documents/%' THEN RAISE EXCEPTION 'Canonical Storage reference required'; END IF;
   _path:=substr(NEW.file_url,length('storage://organization-documents/')+1);
   _prefix:=_oid::text||'/'||CASE WHEN _rid IS NULL THEN '' ELSE 'renewal/'||_rid::text||'/' END||NEW.document_type_id::text||'/';
   IF _path NOT LIKE _prefix||'%' OR _path ~ '(^|/)(\.|\.\.)(/|$)' OR _path LIKE '%//%' THEN
     RAISE EXCEPTION 'Storage object does not belong to this requirement'; END IF;
   IF TG_OP='UPDATE' AND OLD.admin_status::text='needs_revision' THEN
     IF _path NOT LIKE _prefix||'revisions/%' OR NEW.file_url=OLD.file_url THEN RAISE EXCEPTION 'A new revision upload is required'; END IF;
   END IF;
   SELECT * INTO _object FROM storage.objects WHERE bucket_id='organization-documents' AND name=_path FOR SHARE;
   IF _object.id IS NULL OR coalesce(_object.owner_id,_object.owner::text) IS DISTINCT FROM auth.uid()::text THEN
     RAISE EXCEPTION 'Uploaded Storage object ownership could not be verified'; END IF;
   IF NEW.file_size IS NULL OR NEW.file_size<=0 OR NEW.file_size>10485760
     OR (_object.metadata->>'size')::numeric IS DISTINCT FROM NEW.file_size::numeric
     OR NEW.file_type IS DISTINCT FROM 'application/pdf' OR _object.metadata->>'mimetype' IS DISTINCT FROM 'application/pdf'
     OR nullif(btrim(NEW.file_name),'') IS NULL OR length(NEW.file_name)>180 THEN
     RAISE EXCEPTION 'Uploaded document metadata is invalid'; END IF;
   IF TG_OP='UPDATE' AND OLD.admin_status::text='needs_revision' AND
     (_object.created_at IS NULL OR _object.created_at<=OLD.revision_requested_at) THEN RAISE EXCEPTION 'Revision upload predates the request'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ytrace_document_mutation.guard_file() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_document_mutation_guard BEFORE INSERT OR UPDATE ON public.document_submission_files
 FOR EACH ROW EXECUTE FUNCTION ytrace_document_mutation.guard_file();

-- Invoker guard distinguishes direct table clients from existing validated RPCs.
-- It does not grant an Admin override; terminal/content checks above always run.
CREATE FUNCTION public.guard_direct_document_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE _parent public.document_submissions; _renewal_status text;
BEGIN
 IF current_user IN ('anon','authenticated') THEN
   IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.document_submissions s JOIN public.organization_profiles o ON o.id=s.organization_id
      WHERE s.id=CASE WHEN TG_OP='INSERT' THEN NEW.submission_id ELSE OLD.submission_id END
      AND o.user_id=auth.uid() AND o.profile_status::text<>'suspended_inactive') THEN
     RAISE EXCEPTION 'Organization is not authorized to edit documents'; END IF;
   IF TG_OP<>'INSERT' AND OLD.admin_status::text<>'draft' THEN RAISE EXCEPTION 'Use the supported revision workflow'; END IF;
   IF TG_OP='DELETE' THEN
     SELECT * INTO _parent FROM public.document_submissions WHERE id=OLD.submission_id FOR UPDATE;
     IF _parent.id IS NULL OR _parent.status::text IN ('approved_green','rejected_red') THEN
       RAISE EXCEPTION 'Terminal submission documents are immutable'; END IF;
     IF _parent.renewal_id IS NOT NULL THEN
       SELECT status INTO _renewal_status FROM public.organization_renewals WHERE id=_parent.renewal_id FOR UPDATE;
       IF _renewal_status IS NULL OR _renewal_status NOT IN ('draft','needs_revision') THEN
         RAISE EXCEPTION 'Renewal is not editable'; END IF;
     END IF;
     RETURN OLD;
   END IF;
   IF NEW.admin_status IS NULL OR NEW.admin_status::text NOT IN ('draft','submitted','under_admin_review','ready_for_review') OR NEW.reviewed_at IS NOT NULL
     OR NEW.admin_remarks IS NOT NULL OR coalesce(NEW.revision_locked,false) OR NEW.revision_due_at IS NOT NULL
     OR NEW.revision_unlocked_at IS NOT NULL OR NEW.revision_unlocked_by IS NOT NULL THEN RAISE EXCEPTION 'Review fields are server controlled'; END IF;
   IF TG_OP='UPDATE' AND (NEW.revision_history IS DISTINCT FROM OLD.revision_history
     OR NEW.revision_requested_at IS DISTINCT FROM OLD.revision_requested_at OR NEW.revision_locked_at IS DISTINCT FROM OLD.revision_locked_at) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
   IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['file_url','file_name','file_type','file_size','validation_status','admin_status','uploaded_at','updated_at']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['file_url','file_name','file_type','file_size','validation_status','admin_status','uploaded_at','updated_at']) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
   IF TG_OP='INSERT' AND (coalesce(NEW.revision_history,'[]'::jsonb)<>'[]'::jsonb OR NEW.revision_requested_at IS NOT NULL OR NEW.revision_locked_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_direct_document_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER b_document_direct_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_submission_files
 FOR EACH ROW EXECUTE FUNCTION public.guard_direct_document_mutation();

CREATE FUNCTION public.guard_document_parent_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND NOT EXISTS(SELECT 1 FROM public.organization_profiles o
   WHERE o.id=CASE WHEN TG_OP='INSERT' THEN NEW.organization_id ELSE OLD.organization_id END
     AND o.user_id=auth.uid() AND o.profile_status::text<>'suspended_inactive') THEN
   RAISE EXCEPTION 'Organization is not authorized to edit submissions'; END IF;
 IF TG_OP='INSERT' THEN
   IF current_user IN ('anon','authenticated') AND (auth.uid() IS NULL
     OR NEW.status::text<>'draft' OR NEW.submitted_by IS DISTINCT FROM auth.uid()
     OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL
     OR coalesce(NEW.revision_locked,false) OR NEW.revision_unlocked_at IS NOT NULL
     OR NEW.revision_unlocked_by IS NOT NULL OR NEW.revision_due_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Submission review fields are server controlled'; END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN
   -- Preserve the existing authorized canonical account-deletion workflow.
   -- Ordinary clients retain owner RLS and the terminal/lifecycle restriction.
   IF current_user IN ('anon','authenticated') AND (OLD.status::text IN ('approved_green','rejected_red')
      OR EXISTS(SELECT 1 FROM public.organization_renewals r WHERE r.id=OLD.renewal_id AND r.status NOT IN ('draft','needs_revision'))) THEN
     RAISE EXCEPTION 'Terminal submission is immutable'; END IF;
   RETURN OLD;
 END IF;
 IF ROW(NEW.id,NEW.organization_id,NEW.renewal_id,NEW.submission_scope,NEW.submitted_by)
   IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.renewal_id,OLD.submission_scope,OLD.submitted_by) THEN
   RAISE EXCEPTION 'Submission relationship is immutable'; END IF;
 IF OLD.status::text IN ('approved_green','rejected_red') THEN
   IF NEW.status IS DISTINCT FROM OLD.status OR
     (to_jsonb(NEW)-ARRAY['updated_at','reviewed_by','reviewed_at','overall_remarks']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['updated_at','reviewed_by','reviewed_at','overall_remarks']) THEN
     RAISE EXCEPTION 'Terminal submission is immutable'; END IF;
 END IF;
 IF current_user IN ('anon','authenticated') AND (
   NEW.status::text NOT IN ('draft','submitted','under_admin_review','ready_for_review','needs_revision')
   OR (to_jsonb(NEW)-ARRAY['status','user_confirmed','submitted_at','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['status','user_confirmed','submitted_at','updated_at'])) THEN
   RAISE EXCEPTION 'Submission review fields are server controlled'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_document_parent_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_document_parent_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_submissions
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_parent_mutation();

CREATE OR REPLACE FUNCTION public.user_replace_document_submission_file(_file_id uuid, _new_file_url text, _new_file_name text, _new_file_type text, _new_file_size numeric DEFAULT NULL::numeric, _submit_for_review boolean DEFAULT true)
 RETURNS document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
BEGIN
  SELECT * INTO _old_file FROM ytrace_document_mutation.lock_replacement(_file_id);

  IF _old_file.id IS NULL THEN
    RAISE EXCEPTION 'Document file not found.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE id = _old_file.submission_id;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'Parent document submission not found.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _submission.organization_id;

  IF auth.uid() IS NULL OR _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this submission.';
  END IF;

  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  UPDATE public.document_submission_files
  SET
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = CASE
      WHEN _submit_for_review THEN 'submitted'::public.document_submission_status
      ELSE 'draft'::public.document_submission_status
    END,
    admin_remarks = NULL,
    reviewed_at = NULL,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  WHERE id = _file_id
  RETURNING * INTO _updated_row;

  INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
  VALUES(NULL,_submission.organization_id,'Replaced document','document_submission_file',_file_id,
    'Organization replaced an editable document.',jsonb_build_object('actor_auth_user_id',auth.uid(),'actor_type','organization'));
  RETURN _updated_row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.replace_organization_document_file(_file_id uuid, _document_type_id uuid, _expected_updated_at timestamp with time zone, _file_url text, _file_name text, _file_type text, _file_size bigint)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  _user_id uuid := auth.uid();
  _file public.document_submission_files%rowtype;
  _submission public.document_submissions%rowtype;
  _organization public.organization_profiles%rowtype;
  _document_name text;
  _submitted_at timestamptz := clock_timestamp();
  _overall_status public.document_submission_status;
  _notify_resubmitted boolean;
begin
  if _user_id is null then
    raise exception 'Please sign in with your organization account first.';
  end if;

  select * into _file from ytrace_document_mutation.lock_replacement(_file_id);
  if _file.id is null then raise exception 'Document file not found.'; end if;

  select * into _submission from public.document_submissions where id = _file.submission_id for update;
  select * into _organization from public.organization_profiles where id = _submission.organization_id;

  if _organization.user_id is distinct from _user_id then
    raise exception 'You are not authorized to replace this document.';
  end if;

  -- PERMANENT SUSPENSION GUARD
  if _organization.profile_status = 'suspended_inactive' then
    raise exception 'This organization account is permanently suspended. Document replacement is not permitted.';
  end if;

  if _file.document_type_id is distinct from _document_type_id then
    raise exception 'The selected file does not match this document requirement.';
  end if;

  -- TERMINAL REJECTION GUARD
  if _file.admin_status = 'rejected_red' or _submission.status = 'rejected_red' then
    raise exception 'This rejected document cannot be replaced. The organization account is permanently suspended.';
  end if;

  if _file.admin_status <> 'needs_revision' then
    raise exception 'This document is no longer open for correction. Refresh the page to see its current status.';
  end if;

  -- AUTHORITATIVE SERVER-SIDE DEADLINE AND LOCK ENFORCEMENT
  if (_submission.revision_locked = true or (_submission.revision_due_at is not null and _submitted_at >= _submission.revision_due_at and _submission.revision_unlocked_at is null)) then
    update public.document_submissions
    set revision_locked = true,
        revision_locked_at = coalesce(revision_locked_at, _submitted_at)
    where id = _submission.id;

    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  end if;

  if (_file.revision_locked = true or (_file.revision_due_at is not null and _submitted_at >= _file.revision_due_at and _file.revision_unlocked_at is null)) then
    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  end if;

  if _file.updated_at is distinct from _expected_updated_at then
    raise exception 'This document changed after the page was opened. Refresh before uploading again.';
  end if;
  if _file_size <= 0 or _file_size > 10485760 then
    raise exception 'The replacement file must be between 1 byte and 10 MB.';
  end if;
  if nullif(trim(_file_name), '') is null or length(_file_name) > 180
     or _file_name ~ '[\\/[:cntrl:]]' then
    raise exception 'The replacement file name is not allowed.';
  end if;
  if _file_url not like
    'storage://organization-documents/' || _organization.id::text || '/' ||
    _document_type_id::text || '/revisions/%'
     and _file_url not like
    'https://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
     and _file_url not like
    'http://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
  then
    raise exception 'The uploaded file path is invalid.';
  end if;

  select coalesce(required_document_types.name, _file.file_name)
  into _document_name
  from public.required_document_types
  where id = _document_type_id;

  update public.document_submission_files
  set
    file_url = _file_url,
    file_name = _file_name,
    file_type = _file_type,
    file_size = _file_size,
    validation_status = 'correct',
    admin_status = 'under_admin_review',
    admin_remarks = null,
    uploaded_at = _submitted_at,
    reviewed_at = null,
    revision_history = coalesce(revision_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'replaced',
        'file_name', _file_name,
        'replaced_at', _submitted_at,
        'previous_file_url', _file.file_url,
        'previous_admin_remarks', _file.admin_remarks
      )
    ),
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _submitted_at
  where id = _file.id;

  select
    case
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'rejected_red'
      ) then 'rejected_red'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'needs_revision'
      ) then 'needs_revision'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
      ) and not exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status <> 'approved_green'
      ) then 'approved_green'::public.document_submission_status
      else 'under_admin_review'::public.document_submission_status
    end
  into _overall_status;

  update public.document_submissions
  set
    status = _overall_status,
    updated_at = _submitted_at,
    revision_requested_at = case when _overall_status = 'needs_revision' then revision_requested_at else null end,
    revision_due_at = case when _overall_status = 'needs_revision' then revision_due_at else null end,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null
  where id = _submission.id;

  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    created_at,
    metadata
  ) values (
    null,
    _organization.id,
    'Replaced document',
    'document_submission_file',
    _file.id,
    format('Uploaded a corrected version of %s.', coalesce(_document_name, _file_name)),
    _submitted_at,
    jsonb_build_object('actor_auth_user_id', _user_id, 'actor_type', 'organization')
  );

  -- Gated resubmission acknowledgement notification based on workflow.notify_org_on_resubmitted
  _notify_resubmitted := public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true);
  if _notify_resubmitted then
    insert into public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) values (
      _user_id,
      _organization.id,
      'Document Resubmitted',
      format('You have successfully uploaded a corrected version of ''%s''. It is now under review.', coalesce(_document_name, _file_name)),
      'completed',
      'document_submission',
      _submission.id,
      _submitted_at
    );
  end if;

  return query
  select *
  from public.document_submission_files
  where id = _file_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_admin_document_submission_file_review(_session_token text, _file_id uuid, _status document_submission_status, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _submission_id uuid;
  _org_id uuid;
  _org_user_id uuid;
  _renewal_id uuid;
  _document_name text;
  _current_admin_status public.document_submission_status;
  _current_revision_requested_at timestamptz;
  _current_uploaded_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
  _overall_status public.document_submission_status;
  _overall_remarks text;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  -- Validate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Resolve file, current status, timestamps, submission, organization, and document type name
  SELECT
    document_submission_files.submission_id,
    document_submission_files.admin_status,
    document_submission_files.revision_requested_at,
    document_submission_files.uploaded_at,
    COALESCE(required_document_types.name, document_submission_files.file_name)
  INTO
    _submission_id,
    _current_admin_status,
    _current_revision_requested_at,
    _current_uploaded_at,
    _document_name
  FROM public.document_submission_files
  LEFT JOIN public.required_document_types
    ON required_document_types.id = document_submission_files.document_type_id
  WHERE document_submission_files.id = _file_id
  LIMIT 1;

  IF _submission_id IS NULL THEN
    RAISE EXCEPTION 'Document submission file was not found.';
  END IF;

  -- Resolve parent submission details and organization owner
  SELECT ds.organization_id, ds.renewal_id
  INTO _org_id, _renewal_id
  FROM public.document_submissions ds
  WHERE ds.id = _submission_id;

  IF _org_id IS NOT NULL THEN
    SELECT op.user_id
    INTO _org_user_id
    FROM public.organization_profiles op
    WHERE op.id = _org_id;
  END IF;

  -- Serialize review with approval/replacement: renewal -> organization -> submission -> file.
  IF _renewal_id IS NOT NULL THEN
    PERFORM 1 FROM public.organization_renewals WHERE id=_renewal_id FOR UPDATE;
  END IF;
  PERFORM 1 FROM public.organization_profiles WHERE id=_org_id FOR UPDATE;
  PERFORM 1 FROM public.document_submissions WHERE id=_submission_id FOR UPDATE;
  PERFORM 1 FROM public.document_submission_files WHERE id=_file_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.document_submission_files f JOIN public.document_submissions s ON s.id=f.submission_id
    WHERE f.id=_file_id AND s.id=_submission_id AND s.organization_id=_org_id AND s.renewal_id IS NOT DISTINCT FROM _renewal_id) THEN
    RAISE EXCEPTION 'Document relationship changed'; END IF;
  SELECT admin_status,revision_requested_at,uploaded_at
    INTO _current_admin_status,_current_revision_requested_at,_current_uploaded_at
    FROM public.document_submission_files WHERE id=_file_id;
  -- Guard 1: Permanently suspended organizations cannot have registration review decisions modified
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_profiles op
    WHERE op.id = _org_id
      AND op.profile_status = 'suspended_inactive'
  ) THEN
    RAISE EXCEPTION 'This organization account is permanently suspended. Review actions cannot be performed.';
  END IF;

  -- Guard 2: Once marked needs_revision, cannot be approved without a genuine new replacement upload
  IF _status = 'approved_green' AND _current_admin_status = 'needs_revision' THEN
    IF _current_uploaded_at IS NULL OR (_current_revision_requested_at IS NOT NULL AND _current_uploaded_at <= _current_revision_requested_at) THEN
      RAISE EXCEPTION 'Cannot approve document file that is awaiting revision without a new upload.';
    END IF;
  END IF;

  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  -- Update the individual document file review record
  UPDATE public.document_submission_files
  SET
    admin_status = _status,
    admin_remarks = COALESCE(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE document_submission_files.revision_requested_at END,
    revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
  IF _renewal_id IS NOT NULL THEN
    UPDATE public.organization_renewals
    SET
      status = CASE
        WHEN _status = 'rejected_red' THEN 'rejected'
        WHEN _status = 'needs_revision' THEN 'needs_revision'
        ELSE 'under_review'
      END,
      admin_remarks = CASE WHEN _status IN ('needs_revision', 'rejected_red') THEN COALESCE(_admin_remarks, organization_renewals.admin_remarks) ELSE organization_renewals.admin_remarks END,
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE organization_renewals.revision_requested_at END,
      revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE organization_renewals.revision_due_at END,
      revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
      revision_locked_at = CASE WHEN _status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
      revision_unlocked_at = NULL,
      revision_unlocked_by = NULL,
      updated_at = _reviewed_at
    WHERE id = _renewal_id;
  END IF;

  -- Recompute overall parent submission status
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'rejected_red'
      ) THEN 'rejected_red'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'needs_revision'
      ) THEN 'needs_revision'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
      ) AND NOT EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status <> 'approved_green'
      ) THEN 'approved_green'::public.document_submission_status
      ELSE 'under_admin_review'::public.document_submission_status
    END
  INTO _overall_status;

  _overall_remarks :=
    CASE
      WHEN _status = 'approved_green' THEN format('Admin approved %s.', _document_name)
      WHEN _status = 'needs_revision' THEN format('Admin requested revisions for %s.', _document_name)
      ELSE format('Admin rejected %s.', _document_name)
    END;

  UPDATE public.document_submissions
  SET
    status = _overall_status,
    reviewed_by = _admin_id,
    reviewed_at = _reviewed_at,
    overall_remarks = _overall_remarks,
    revision_requested_at = CASE WHEN _overall_status = 'needs_revision' THEN _reviewed_at ELSE document_submissions.revision_requested_at END,
    revision_due_at = CASE WHEN _overall_status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _overall_status = 'rejected_red' THEN true ELSE false END,
    revision_locked_at = CASE WHEN _overall_status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submissions.id = _submission_id;

  -- 1. REGISTRATION REVISION NOTIFICATION:
  IF _renewal_id IS NULL AND _status = 'needs_revision' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_revision THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Revision Requested',
      format('The admin requested revisions for %s.%s', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
      'document_revision',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 2. REGISTRATION SINGLE FILE APPROVED NOTIFICATION (when not yet fully verified):
  IF _renewal_id IS NULL AND _status = 'approved_green' AND _overall_status <> 'approved_green' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_approved THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Document Approved',
      format('Your registration document ''%s'' has been approved by the admin.', _document_name),
      'completed',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 3. ATOMIC REJECTION RULE (Permanent Suspension):
  IF _renewal_id IS NULL AND _status = 'rejected_red' AND _org_id IS NOT NULL THEN
    UPDATE public.organization_profiles
    SET
      profile_status = 'suspended_inactive'::public.profile_status,
      updated_at = _reviewed_at
    WHERE id = _org_id;

    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      created_at
    ) VALUES (
      _admin_id,
      _org_id,
      'Suspended organization',
      'organization_profile',
      _org_id,
      format('Organization account permanently suspended due to rejected registration document: %s.', _document_name),
      _reviewed_at
    );

    IF _org_user_id IS NOT NULL AND _notify_rejected THEN
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        title,
        message,
        type,
        related_type,
        related_id,
        created_at
      ) VALUES (
        _org_user_id,
        _org_id,
        'Registration Document Rejected',
        format('Your registration document ''%s'' was rejected.%s Your organization account has been permanently suspended.', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
        'document_red',
        'document_submission',
        _submission_id,
        _reviewed_at
      );
    END IF;
  END IF;

  -- 4. AUTOMATIC REGISTRATION VERIFICATION:
  -- Only evaluate when not suspended, not renewal, and overall submission status reached approved_green
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND _overall_status = 'approved_green' THEN
    PERFORM public.evaluate_and_apply_automatic_registration_verification(_org_id, _admin_id);
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.document_submission_files
  WHERE id = _file_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.user_submit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  PERFORM 1 FROM public.organization_profiles WHERE id=_renewal.organization_id FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=_renewal.organization_id
    AND user_id=auth.uid() AND profile_status::text<>'suspended_inactive') THEN
    RAISE EXCEPTION 'Organization is not authorized to submit documents'; END IF;
  IF coalesce(_renewal.revision_locked,false) OR (_renewal.revision_due_at<=clock_timestamp() AND _renewal.revision_unlocked_at IS NULL) THEN
    RAISE EXCEPTION 'Renewal revision is locked or overdue'; END IF;
  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'draft' THEN
    RAISE EXCEPTION 'Renewal cannot be submitted from status "%". Expected "draft".', _renewal.status;
  END IF;

  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Application can no longer be submitted.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No renewal document submission found.';
  END IF;

  -- Each selected document may be sent as it is ready. The admin approval RPC
  -- continues to enforce completeness and approval of every required type.
  IF NOT EXISTS (
    SELECT 1
    FROM public.document_submission_files dsf
    JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
    WHERE dsf.submission_id = _submission.id
      AND rdt.is_active = true
      AND coalesce(rdt.is_required, true) = true
      AND rdt.scope IN ('renewal', 'both')
      AND rdt.template_scope = 'document_submission'
      AND nullif(trim(dsf.file_url), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Upload at least one required renewal document before submitting.';
  END IF;

  UPDATE public.organization_renewals
  SET status = 'submitted', submitted_at = _now, updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET status = 'submitted', submitted_at = _now, updated_at = _now
  WHERE id = _submission.id;

  INSERT INTO public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_submitted',
    'renewal',
    p_renewal_id,
    format('Organization submitted renewal documents for Cycle %s.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_at', _now
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.user_submit_renewal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.user_resubmit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  PERFORM 1 FROM public.organization_profiles WHERE id=_renewal.organization_id FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=_renewal.organization_id
    AND user_id=auth.uid() AND profile_status::text<>'suspended_inactive') THEN
    RAISE EXCEPTION 'Organization is not authorized to submit documents'; END IF;
  IF coalesce(_renewal.revision_locked,false) OR (_renewal.revision_due_at<=clock_timestamp() AND _renewal.revision_unlocked_at IS NULL) THEN
    RAISE EXCEPTION 'Renewal revision is locked or overdue'; END IF;
  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  END IF;

  -- Verify within 180-day window
  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Resubmission is no longer allowed.';
  END IF;

  -- Verify all flagged documents have been replaced
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No document submission packet found for this renewal.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.document_submission_files dsf
    WHERE dsf.submission_id = _submission.id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'All documents marked for revision or rejection must be replaced before resubmission.';
  END IF;

  -- Update renewal state to resubmitted
  UPDATE public.organization_renewals
  SET
    status = 'resubmitted',
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update document submission state
  UPDATE public.document_submissions
  SET
    status = 'submitted',
    updated_at = _now
  WHERE id = _submission.id;

  -- Insert activity log with NULL actor_user_id (org user action)
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id,
    format('Organization resubmitted renewal application for Cycle %s after revisions.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'resubmitted_at', _now
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.user_resubmit_renewal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) TO authenticated;
COMMIT;
