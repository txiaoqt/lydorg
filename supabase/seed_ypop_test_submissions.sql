-- Run this in the Supabase SQL editor.
--
-- Seeds 5 test ypop_entries rows (one per status: submitted, under_review,
-- needs_revision, qualified, not_qualified) against the most recently
-- created semester, so the YPOP Validation > Submissions page has real data
-- to design against instead of showing all zeros.
--
-- Organizations are picked from whatever already exists in
-- organization_profiles (the first 5 rows by creation date, reused if fewer
-- than 5 exist). If you have zero organizations registered yet, this will
-- insert nothing — register at least one org first.
--
-- Every row this script inserts is tagged submission_note = 'seed-test-data'
-- so you can find and remove them later with:
--   delete from public.ypop_entries where submission_note = 'seed-test-data';

with target_semester as (
  select semester_key, semester_label, validation_deadline
  from public.ypop_periods
  order by created_at desc
  limit 1
),
orgs as (
  select id, row_number() over (order by created_at) as rn
  from public.organization_profiles
  limit 5
),
statuses as (
  select * from (values
    ('submitted', 1),
    ('under_review', 2),
    ('needs_revision', 3),
    ('qualified', 4),
    ('not_qualified', 5)
  ) as s(status, rn)
)
insert into public.ypop_entries (
  id, organization_id, submitted_by, semester, semester_label,
  points_earned, points_required, total_points, status,
  admin_remarks, submission_note, validation_deadline,
  submitted_at, validated_at, revision_history,
  org_led_project_count, city_led_attendance, created_at, updated_at
)
select
  gen_random_uuid(),
  o.id,
  null,
  ts.semester_key,
  ts.semester_label,
  case s.status when 'qualified' then 85 when 'not_qualified' then 40 else 0 end,
  70,
  100,
  s.status::public.ypop_entry_status,
  case s.status when 'needs_revision' then 'Please attach missing proof documents.' else '' end,
  'seed-test-data',
  ts.validation_deadline,
  now(),
  case when s.status in ('qualified', 'not_qualified') then now() else null end,
  '[]'::jsonb,
  0,
  '[]'::jsonb,
  now(),
  now()
from target_semester ts
join statuses s on true
join orgs o on o.rn = s.rn;
