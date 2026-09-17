-- Migration: 20260918030000_yorp_section35_reporting.sql
-- Purpose:
-- 1. Harden public.revoke_organization_accreditation to strictly use database server clock_timestamp(),
--    preventing client manipulation or backdating of historical revocation timestamps.
-- 2. Provide canonical barangay normalization and safe ordinal lookup helpers for reporting.
-- 3. Implement authoritative Section 35 reporting RPC: public.get_yorp_quarterly_report.

-- 1. HARDEN REVOCATION RPC: Eliminate arbitrary client timestamp backdating
create or replace function public.revoke_organization_accreditation(
  _session_token text,
  _accreditation_id uuid,
  _revocation_reason text default null,
  _revoked_at timestamptz default null
)
returns public.organization_accreditations
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _acc public.organization_accreditations%rowtype;
  _effective_revoked_at timestamptz;
  _trimmed_reason text;
begin
  -- Authorize admin session
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _acc
  from public.organization_accreditations
  where id = _accreditation_id
  for update;

  if not found then
    raise exception 'Accreditation record not found.';
  end if;

  if _acc.status = 'revoked' then
    raise exception 'Accreditation is already revoked.';
  end if;

  if _acc.status = 'superseded' then
    raise exception 'Cannot revoke a superseded historical accreditation term.';
  end if;

  -- HARDENING: Normal administrative revocation strictly assigns server clock_timestamp()
  -- Client-supplied timestamps are ignored to preserve historical ledger integrity.
  _effective_revoked_at := clock_timestamp();
  _trimmed_reason := nullif(trim(_revocation_reason), '');

  -- Atomically update accreditation ledger
  update public.organization_accreditations
  set
    status = 'revoked',
    revoked_at = _effective_revoked_at,
    revocation_reason = _trimmed_reason
  where id = _accreditation_id
  returning * into _acc;

  -- Synchronize organization profile projection to suspended_inactive
  update public.organization_profiles
  set
    profile_status = 'suspended_inactive'::public.profile_status,
    updated_at = now()
  where id = _acc.organization_id;

  -- Write audit log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    _admin_id,
    _acc.organization_id,
    'Revoked Accreditation',
    'organization_accreditation',
    _accreditation_id,
    format('Revoked accreditation term %s. Reason: %s', _acc.term_number, coalesce(_trimmed_reason, 'No reason specified'))
  );

  return _acc;
end;
$$;

-- 2. SAFE BARANGAY NORMALIZATION & ORDINAL HELPERS
create or replace function public.normalize_pasig_barangay_name(_barangay text)
returns text
language plpgsql
immutable
as $$
declare
  _clean text;
begin
  if _barangay is null or trim(_barangay) = '' then
    return null;
  end if;
  _clean := lower(trim(_barangay));
  _clean := trim(regexp_replace(_clean, '^(barangay|brgy\.?)\s+', '', 'i'));
  _clean := regexp_replace(_clean, '^santa\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^sta\s+', 'sta. ', 'i');
  _clean := regexp_replace(_clean, '^santo\s+', 'sto. ', 'i');
  _clean := regexp_replace(_clean, '^sto\s+', 'sto. ', 'i');
  return _clean;
end;
$$;

create or replace function public.try_get_pasig_barangay_ordinal(_barangay text)
returns text
language plpgsql
immutable
as $$
begin
  return public.get_pasig_barangay_ordinal(_barangay);
exception when others then
  return null;
end;
$$;

-- 3. AUTHORITATIVE SECTION 35 REPORTING RPC
create or replace function public.get_yorp_quarterly_report(
  _session_token text,
  _year integer,
  _quarter integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _quarter_start_str text;
  _next_quarter_start_str text;
  _quarter_end_str text;
  _quarter_end_date date;
  _quarter_start timestamptz;
  _next_quarter_start timestamptz;
  _quarter_end timestamptz;
  _metric_a integer := 0;
  _metric_b integer := 0;
  _metric_c integer := 0;
  _approval_rate numeric;
  _major_classification_json jsonb;
  _sub_classification_json jsonb;
  _organizational_level_json jsonb;
  _advocacy_json jsonb;
  _districts_json jsonb;
  _barangays_json jsonb;
  _result jsonb;
begin
  -- Validate Admin Session
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  -- Validate Quarter
  if _quarter not in (1, 2, 3, 4) then
    raise exception 'Invalid quarter: %. Must be 1, 2, 3, or 4.', _quarter;
  end if;

  -- Validate Year
  if _year < 2000 or _year > 2100 then
    raise exception 'Invalid year: %. Must be between 2000 and 2100.', _year;
  end if;

  -- Define Quarter Intervals in Asia/Manila (UTC+08:00)
  case _quarter
    when 1 then
      _quarter_start_str := format('%s-01-01 00:00:00+08', _year);
      _next_quarter_start_str := format('%s-04-01 00:00:00+08', _year);
      _quarter_end_date := format('%s-03-31', _year)::date;
      _quarter_end_str := format('%s-03-31 23:59:59.999+08', _year);
    when 2 then
      _quarter_start_str := format('%s-04-01 00:00:00+08', _year);
      _next_quarter_start_str := format('%s-07-01 00:00:00+08', _year);
      _quarter_end_date := format('%s-06-30', _year)::date;
      _quarter_end_str := format('%s-06-30 23:59:59.999+08', _year);
    when 3 then
      _quarter_start_str := format('%s-07-01 00:00:00+08', _year);
      _next_quarter_start_str := format('%s-10-01 00:00:00+08', _year);
      _quarter_end_date := format('%s-09-30', _year)::date;
      _quarter_end_str := format('%s-09-30 23:59:59.999+08', _year);
    when 4 then
      _quarter_start_str := format('%s-10-01 00:00:00+08', _year);
      _next_quarter_start_str := format('%s-01-01 00:00:00+08', _year + 1);
      _quarter_end_date := format('%s-12-31', _year)::date;
      _quarter_end_str := format('%s-12-31 23:59:59.999+08', _year);
  end case;

  _quarter_start := _quarter_start_str::timestamptz;
  _next_quarter_start := _next_quarter_start_str::timestamptz;
  _quarter_end := _quarter_end_str::timestamptz;

  -- Create temporary table for Metric A disaggregation population to ensure identical population across all disaggregations
  create temp table temp_quarter_end_orgs on commit drop as
  select distinct on (op.id)
    op.id as organization_id,
    op.organization_name,
    op.urn,
    coalesce(nullif(trim(op.major_classification), ''), 'Not Specified') as major_classification,
    coalesce(nullif(trim(op.sub_classification), ''), 'Not Specified') as sub_classification,
    coalesce(op.advocacies, '{}'::text[]) as advocacies,
    coalesce(nullif(trim(op.barangay), ''), 'Other / Unspecified') as barangay,
    coalesce(nullif(trim(op.district), ''), 'Other / Unspecified') as district
  from public.organization_profiles op
  join public.organization_accreditations oa
    on oa.organization_id = op.id
  where oa.start_date <= _quarter_end_date
    and oa.end_date >= _quarter_end_date
    and oa.approved_at < _next_quarter_start
    and (
      oa.revoked_at is null
      or oa.revoked_at >= _next_quarter_start
    )
  order by op.id;

  -- METRIC A: Total number of registered and verified youth organizations at the end of the quarter
  select count(*) into _metric_a from temp_quarter_end_orgs;

  -- METRIC B: Total number of applications received in the quarter (first formal registration submission)
  with org_first_submissions as (
    select
      op.id as organization_id,
      min(ds.submitted_at) as first_formal_submitted_at
    from public.organization_profiles op
    join public.document_submissions ds
      on ds.organization_id = op.id
    where op.registration_type = 'new_organization'
      and ds.submission_scope = 'registration'
      and ds.renewal_id is null
      and ds.submitted_at is not null
    group by op.id
  )
  select count(*) into _metric_b
  from org_first_submissions
  where first_formal_submitted_at >= _quarter_start
    and first_formal_submitted_at < _next_quarter_start;

  -- METRIC C: Total number of applications approved in the quarter (term 1 approvals only)
  select count(distinct op.id) into _metric_c
  from public.organization_accreditations oa
  join public.organization_profiles op
    on op.id = oa.organization_id
  where oa.term_number = 1
    and oa.approved_at >= _quarter_start
    and oa.approved_at < _next_quarter_start;

  -- Supplementary metric: Approval Rate (Metric C / Metric B * 100)
  if _metric_b > 0 then
    _approval_rate := round((_metric_c::numeric / _metric_b::numeric) * 100, 2);
  else
    _approval_rate := null;
  end if;

  -- DISAGGREGATION 1: Major Classification
  with base_categories as (
    select unnest(array['Youth Organization', 'Youth-Serving Organization']) as label
  ),
  aggregated as (
    select major_classification as label, count(*) as cnt
    from temp_quarter_end_orgs
    group by major_classification
  ),
  combined as (
    select
      bc.label,
      coalesce(ag.cnt, 0) as count,
      case when _metric_a > 0 then round((coalesce(ag.cnt, 0)::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from base_categories bc
    left join aggregated ag on lower(ag.label) = lower(bc.label)
    union all
    select
      ag.label,
      ag.cnt as count,
      case when _metric_a > 0 then round((ag.cnt::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from aggregated ag
    where lower(ag.label) not in ('youth organization', 'youth-serving organization')
  )
  select jsonb_agg(
    jsonb_build_object(
      'label', c.label,
      'count', c.count,
      'percentage', c.percentage
    )
  ) into _major_classification_json
  from combined c;

  -- DISAGGREGATION 2: Sub-Classification
  with base_sub as (
    select unnest(array['community-based', 'school-based', 'faith-based', 'consortium/federation', 'Not Specified']) as label
  ),
  aggregated_sub as (
    select sub_classification as label, count(*) as cnt
    from temp_quarter_end_orgs
    group by sub_classification
  ),
  combined_sub as (
    select
      bs.label,
      coalesce(ag.cnt, 0) as count,
      case when _metric_a > 0 then round((coalesce(ag.cnt, 0)::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from base_sub bs
    left join aggregated_sub ag on lower(ag.label) = lower(bs.label)
    union all
    select
      ag.label,
      ag.cnt as count,
      case when _metric_a > 0 then round((ag.cnt::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from aggregated_sub ag
    where lower(ag.label) not in ('community-based', 'school-based', 'faith-based', 'consortium/federation', 'not specified')
  )
  select jsonb_agg(
    jsonb_build_object(
      'label', cs.label,
      'count', cs.count,
      'percentage', cs.percentage
    )
  ) into _sub_classification_json
  from combined_sub cs;

  -- DISAGGREGATION 3: Organizational Level (Derived value = 'City/Municipal', 100%)
  _organizational_level_json := jsonb_build_array(
    jsonb_build_object(
      'label', 'City/Municipal',
      'count', _metric_a,
      'percentage', case when _metric_a > 0 then 100.00 else 0.00 end
    )
  );

  -- DISAGGREGATION 4: Canonical 10 Y-TRACE Advocacy Themes (Distinct organizations per theme, Non-additive)
  with canonical_themes as (
    select unnest(array[
      'education',
      'environment',
      'health',
      'peace building and security',
      'governance',
      'active citizenship',
      'global mobility',
      'social inclusion and equity',
      'economic empowerment',
      'agriculture'
    ]) as theme
  ),
  theme_counts as (
    select
      lower(trim(t)) as theme,
      count(distinct qeo.organization_id) as cnt
    from temp_quarter_end_orgs qeo,
    lateral unnest(qeo.advocacies) as t
    group by lower(trim(t))
  )
  select jsonb_agg(
    jsonb_build_object(
      'theme', ct.theme,
      'count', coalesce(tc.cnt, 0),
      'percentage', case when _metric_a > 0 then round((coalesce(tc.cnt, 0)::numeric / _metric_a::numeric) * 100, 2) else 0.00 end
    )
  ) into _advocacy_json
  from canonical_themes ct
  left join theme_counts tc on tc.theme = ct.theme;

  -- DISAGGREGATION 5A: Geography - Districts
  with base_districts as (
    select unnest(array['District I', 'District II']) as district
  ),
  district_counts as (
    select district, count(*) as cnt
    from temp_quarter_end_orgs
    group by district
  ),
  combined_districts as (
    select
      bd.district,
      coalesce(dc.cnt, 0) as count,
      case when _metric_a > 0 then round((coalesce(dc.cnt, 0)::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from base_districts bd
    left join district_counts dc on dc.district = bd.district
    union all
    select
      dc.district,
      dc.cnt as count,
      case when _metric_a > 0 then round((dc.cnt::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from district_counts dc
    where dc.district not in ('District I', 'District II')
  )
  select jsonb_agg(
    jsonb_build_object(
      'district', cd.district,
      'count', cd.count,
      'percentage', cd.percentage
    )
  ) into _districts_json
  from combined_districts cd;

  -- DISAGGREGATION 5B: Geography - Barangays (All 30 canonical Pasig Barangays in Ordinal Order)
  with canonical_barangays as (
    select * from (
      values
        ('01', 'Bagong Ilog', 'District I'),
        ('02', 'Bagong Katipunan', 'District I'),
        ('03', 'Bambang', 'District I'),
        ('04', 'Buting', 'District I'),
        ('05', 'Caniogan', 'District I'),
        ('06', 'Dela Paz', 'District II'),
        ('07', 'Kalawaan', 'District I'),
        ('08', 'Kapasigan', 'District I'),
        ('09', 'Kapitolyo', 'District I'),
        ('10', 'Malinao', 'District I'),
        ('11', 'Manggahan', 'District II'),
        ('12', 'Maybunga', 'District II'),
        ('13', 'Oranbo', 'District I'),
        ('14', 'Palatiw', 'District I'),
        ('15', 'Pinagbuhatan', 'District II'),
        ('16', 'Pineda', 'District I'),
        ('17', 'Rosario', 'District II'),
        ('18', 'Sagad', 'District I'),
        ('19', 'San Antonio', 'District I'),
        ('20', 'San Joaquin', 'District I'),
        ('21', 'San Jose', 'District I'),
        ('22', 'San Miguel', 'District II'),
        ('23', 'San Nicolas', 'District I'),
        ('24', 'Sta. Cruz', 'District I'),
        ('25', 'Sta. Lucia', 'District II'),
        ('26', 'Sta. Rosa', 'District I'),
        ('27', 'Santolan', 'District II'),
        ('28', 'Sto. Tomas', 'District I'),
        ('29', 'Sumilang', 'District I'),
        ('30', 'Ugong', 'District I')
    ) as t(ordinal, barangay_name, district)
  ),
  barangay_counts as (
    select
      public.normalize_pasig_barangay_name(barangay) as normalized_name,
      count(*) as cnt
    from temp_quarter_end_orgs
    group by public.normalize_pasig_barangay_name(barangay)
  ),
  unmatched_counts as (
    select
      count(*) as cnt
    from temp_quarter_end_orgs qeo
    where not exists (
      select 1 from canonical_barangays cb
      where public.normalize_pasig_barangay_name(cb.barangay_name) = public.normalize_pasig_barangay_name(qeo.barangay)
    )
  ),
  all_barangays as (
    select
      cb.ordinal,
      cb.barangay_name,
      cb.district,
      coalesce(bc.cnt, 0) as count,
      case when _metric_a > 0 then round((coalesce(bc.cnt, 0)::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from canonical_barangays cb
    left join barangay_counts bc on bc.normalized_name = public.normalize_pasig_barangay_name(cb.barangay_name)
    union all
    select
      '99' as ordinal,
      'Other / Unspecified' as barangay_name,
      'Other / Unspecified' as district,
      uc.cnt as count,
      case when _metric_a > 0 then round((uc.cnt::numeric / _metric_a::numeric) * 100, 2) else 0.00 end as percentage
    from unmatched_counts uc
    where uc.cnt > 0
    order by ordinal
  )
  select jsonb_agg(
    jsonb_build_object(
      'ordinal', ab.ordinal,
      'barangay', ab.barangay_name,
      'district', ab.district,
      'count', ab.count,
      'percentage', ab.percentage
    )
  ) into _barangays_json
  from all_barangays ab;

  -- Build final output json
  _result := jsonb_build_object(
    'year', _year,
    'quarter', _quarter,
    'timezone', 'Asia/Manila',
    'quarter_start', to_char(_quarter_start, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'quarter_end', to_char(_quarter_end, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'quarter_end_date', _quarter_end_date::text,
    'metrics', jsonb_build_object(
      'registered_verified_at_quarter_end', _metric_a,
      'applications_received', _metric_b,
      'applications_approved', _metric_c,
      'approval_rate', _approval_rate
    ),
    'disaggregation', jsonb_build_object(
      'major_classification', coalesce(_major_classification_json, '[]'::jsonb),
      'sub_classification', coalesce(_sub_classification_json, '[]'::jsonb),
      'organizational_level', coalesce(_organizational_level_json, '[]'::jsonb),
      'advocacy_themes', coalesce(_advocacy_json, '[]'::jsonb),
      'geography', jsonb_build_object(
        'districts', coalesce(_districts_json, '[]'::jsonb),
        'barangays', coalesce(_barangays_json, '[]'::jsonb)
      )
    ),
    'metadata', jsonb_build_object(
      'classification_note', 'Disaggregated classifications and advocacy themes reflect the organization''s authoritative profile record at the time of report generation.',
      'organizational_level_note', 'In accordance with the current Pasig City Youth Development Office registry scope, registered youth and youth-serving organizations are reported at the City/Municipal organizational level. Organizational operational scope (e.g., barangay-based vs city-wide) is not currently stored as a separate registry field.',
      'advocacy_note', 'Non-additive: organizations may select multiple advocacy themes.',
      'generated_at', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SSOF')
    )
  );

  return _result;
end;
$$;

grant execute on function public.get_yorp_quarterly_report(text, integer, integer) to anon, authenticated;
