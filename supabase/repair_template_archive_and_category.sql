-- Run this in the Supabase SQL editor.
-- Fixes the admin snapshot RPC to include archived (is_active = false) templates
-- so the admin Forms & Templates page can show/filter them, and adds the two
-- missing admin template RPCs: reactivate (Restore) and a real hard delete.
-- Safe for the public-facing template catalog/workspace views: they already
-- filter to active-only client-side, so they are unaffected by this change.

create or replace function public.get_admin_portal_snapshot(_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return jsonb_build_object(
    'organization_profiles',
    coalesce(
      (
        select jsonb_agg(to_jsonb(op) order by op.created_at desc)
        from public.organization_profiles op
      ),
      '[]'::jsonb
    ),
    'document_submissions',
    coalesce(
      (
        select jsonb_agg(to_jsonb(ds) order by ds.created_at desc)
        from public.document_submissions ds
      ),
      '[]'::jsonb
    ),
    'document_submission_files',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', dsf.id,
            'submission_id', dsf.submission_id,
            'file_url', dsf.file_url,
            'file_name', dsf.file_name,
            'file_type', dsf.file_type,
            'file_size', dsf.file_size,
            'ocr_text', dsf.ocr_text,
            'ocr_status', dsf.ocr_status,
            'ocr_confidence', dsf.ocr_confidence,
            'validation_status', dsf.validation_status,
            'admin_status', dsf.admin_status,
            'admin_remarks', dsf.admin_remarks,
            'ocr_metadata', dsf.ocr_metadata,
            'uploaded_at', dsf.uploaded_at,
            'reviewed_at', dsf.reviewed_at,
            'created_at', dsf.created_at,
            'updated_at', dsf.updated_at,
            'required_document_types', jsonb_build_object('id', rdt.id, 'name', rdt.name)
          )
          order by dsf.created_at desc
        )
        from public.document_submission_files dsf
        left join public.required_document_types rdt on rdt.id = dsf.document_type_id
      ),
      '[]'::jsonb
    ),
    'budget_requests',
    coalesce(
      (
        select jsonb_agg(to_jsonb(br) order by br.created_at desc)
        from public.budget_requests br
      ),
      '[]'::jsonb
    ),
    'budget_request_files',
    coalesce(
      (
        select jsonb_agg(to_jsonb(brf) order by brf.created_at desc)
        from public.budget_request_files brf
      ),
      '[]'::jsonb
    ),
    'liquidation_reports',
    coalesce(
      (
        select jsonb_agg(to_jsonb(lr) order by lr.created_at desc)
        from public.liquidation_reports lr
      ),
      '[]'::jsonb
    ),
    'liquidation_report_files',
    coalesce(
      (
        select jsonb_agg(to_jsonb(lrf) order by lrf.created_at desc)
        from public.liquidation_report_files lrf
      ),
      '[]'::jsonb
    ),
    'news_releases',
    coalesce(
      (
        select jsonb_agg(to_jsonb(nr) order by nr.date_posted desc, nr.created_at desc)
        from public.news_releases nr
      ),
      '[]'::jsonb
    ),
    'transparency_posts',
    coalesce(
      (
        select jsonb_agg(to_jsonb(tp) order by tp.post_date desc, tp.created_at desc)
        from public.transparency_posts tp
      ),
      '[]'::jsonb
    ),
    'compliance_remarks',
    coalesce(
      (
        select jsonb_agg(to_jsonb(cr) order by cr.created_at desc)
        from public.compliance_remarks cr
      ),
      '[]'::jsonb
    ),
    'notifications',
    coalesce(
      (
        select jsonb_agg(to_jsonb(n) order by n.created_at desc)
        from public.notifications n
      ),
      '[]'::jsonb
    ),
    'activity_logs',
    coalesce(
      (
        select jsonb_agg(to_jsonb(al) order by al.created_at desc)
        from public.activity_logs al
      ),
      '[]'::jsonb
    ),
    'templates',
    coalesce(
      (
        -- Changed from the original: dropped "where rdt.is_active = true" so the
        -- admin portal can see and manage archived templates too.
        select jsonb_agg(to_jsonb(rdt) order by rdt.sort_order asc)
        from public.required_document_types rdt
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.reactivate_admin_template_document(
  _session_token text,
  _template_id uuid
)
returns setof public.required_document_types
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  update public.required_document_types
  set is_active = true
  where required_document_types.id = _template_id
  returning required_document_types.*;
end;
$$;

create or replace function public.hard_delete_admin_template_document(
  _session_token text,
  _template_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _referenced_file_count int;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select count(*)
  into _referenced_file_count
  from public.document_submission_files
  where document_submission_files.document_type_id = _template_id;

  if _referenced_file_count > 0 then
    raise exception 'This template has submitted documents attached and can''t be permanently deleted — archive it instead.';
  end if;

  delete from public.required_document_types
  where required_document_types.id = _template_id;
end;
$$;

create or replace function public.update_admin_template_category(
  _session_token text,
  _template_id uuid,
  _template_category text[]
)
returns setof public.required_document_types
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  update public.required_document_types
  set template_category = _template_category, updated_at = now()
  where required_document_types.id = _template_id
  returning required_document_types.*;
end;
$$;
