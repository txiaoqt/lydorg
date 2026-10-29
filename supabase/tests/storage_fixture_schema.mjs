// Shared synthetic PostgreSQL fixture for the Storage remediation harnesses.
// Isolated PGlite only: no Storage HTTP server, binaries, production data or credentials.
import { readFile } from 'node:fs/promises';
export const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const foundation = await readFile(new URL('../migrations/20261009145634_storage_authorization_remediation.sql',import.meta.url),'utf8');
export const cutover = await readFile(new URL('../migrations/20261009150110_storage_authorization_cutover.sql',import.meta.url),'utf8');
export const captured = JSON.parse(await readFile(new URL('../../docs/readiness/2026-10-09/live-schema.json',import.meta.url),'utf8'));
export const schema = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage; create schema extensions;
create domain citext as text;
grant usage on schema auth,storage,public to anon,authenticated,service_role;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
-- Digest fixture preserves token comparisons, NOT a cryptographic integration test.
create function extensions.digest(text,text) returns bytea language sql immutable as $$select convert_to($1,'UTF8')$$;
create function current_user_is_admin() returns boolean language sql stable as $$select false$$;
create table roles(id uuid primary key,code text,label text,permission_codes text[]);
create table admin_accounts(id uuid primary key,username citext,email citext,display_name text,is_active boolean,role_id uuid);
create table admin_sessions(admin_id uuid,token_hash text,revoked_at timestamptz,expires_at timestamptz,last_used_at timestamptz);
create table organization_profiles(id uuid primary key,user_id uuid,profile_status text,profile_image_url text,directory_visibility boolean default false);
create table required_document_types(id uuid primary key,template_url text,is_active boolean,name text);
create table organization_renewals(id uuid primary key,organization_id uuid,status text);
create table document_submissions(id uuid primary key,organization_id uuid,submission_scope text,renewal_id uuid,status text,created_at timestamptz default now());
create table document_submission_files(id uuid primary key,submission_id uuid,document_type_id uuid,file_url text,admin_status text,revision_history jsonb,revision_locked boolean,revision_locked_at timestamptz,revision_unlocked_at timestamptz,revision_due_at timestamptz);
create table budget_requests(id uuid primary key,organization_id uuid,status text,revision_locked boolean,revision_locked_at timestamptz,revision_unlocked_at timestamptz,revision_due_at timestamptz);
create table budget_request_files(id uuid primary key,budget_request_id uuid,file_url text);
create table liquidation_reports(id uuid primary key,organization_id uuid,budget_request_id uuid,status text);
create table liquidation_report_files(id uuid primary key,liquidation_report_id uuid,file_url text);
create table ypop_entries(id uuid primary key,organization_id uuid,status text,semester text);
create table ypop_files(id uuid primary key,ypop_entry_id uuid,organization_id uuid,file_url text);
create table ypop_event_participations(id uuid primary key,organization_id uuid,status text);
create table ypop_event_files(id uuid primary key,participation_id uuid,organization_id uuid,file_url text);
create table ypop_org_activities(id uuid primary key,organization_id uuid,ypop_entry_id uuid,status text);
create table ypop_org_activity_files(id uuid primary key,org_activity_id uuid,organization_id uuid,file_url text);
create table ypop_periods(semester_key text,status text);
create table move_applications(id uuid primary key,organization_id uuid,status text);
create table move_files(id uuid primary key,application_id uuid,organization_id uuid,file_url text);
create table news_releases(id uuid primary key,preview_image_url text,visibility_status text);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb default '{}',owner_id text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to anon,authenticated;
grant select on required_document_types to anon,authenticated;
grant select on news_releases to anon,authenticated;
alter table required_document_types enable row level security;
create policy required_document_types_read on required_document_types for select using(true);
alter table news_releases enable row level security;
create policy news_releases_read_published on news_releases for select using(visibility_status='published');
`;
/** Installs the synthetic schema, the captured token validator and the 15 captured live Storage policies. */
export async function installBaseline(db) {
  await db.exec(schema);
  await db.exec(captured.helpers.find(x=>x.name==='validate_admin_session_token').definition);
  for (const p of captured.policies.filter(x=>x.schemaname==='storage')) {
    await db.exec(`create policy "${p.policyname}" on storage.objects as ${p.permissive} for ${p.cmd} to ${p.roles.map(x=>'"'+x+'"').join(',')}
      ${p.qual?`using (${p.qual})`:''} ${p.with_check?`with check (${p.with_check})`:''}`);
  }
}
