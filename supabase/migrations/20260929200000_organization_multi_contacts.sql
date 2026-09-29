-- ==============================================================================
-- Migration: 20260929200000_organization_multi_contacts.sql
-- Description: Dynamic Multi-Email and Multi-Contact-Number System for Organization Profiles
--
-- 1. Adds additional_emails text[] and additional_contact_numbers text[] to public.organization_profiles
-- 2. Creates normalized table public.organization_contacts with RLS and constraints
-- 3. Implements triggers to keep organization_contacts and organization_profiles synchronized
-- 4. Backfills existing organizations' primary email and contact number
-- 5. Updates get_admin_portal_snapshot to include organization_contacts
-- ==============================================================================

-- 1. Add array columns to public.organization_profiles
ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS additional_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS additional_contact_numbers text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.organization_profiles.additional_emails IS
  'Ordered array of additional organization contact email addresses (excluding primary organization_email).';

COMMENT ON COLUMN public.organization_profiles.additional_contact_numbers IS
  'Ordered array of additional organization contact numbers (excluding primary contact_number).';

-- 2. Create normalized table public.organization_contacts
CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('email', 'phone')),
  value text NOT NULL CHECK (trim(value) <> ''),
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.organization_contacts IS
  'Normalized ledger of all organization contact endpoints (emails and phone numbers), both primary and additional.';

-- Unique constraint for email: case-insensitive per organization
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_contacts_email_unique
  ON public.organization_contacts (organization_id, lower(trim(value)))
  WHERE contact_type = 'email';

-- Unique constraint for phone: digit-normalized per organization
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_contacts_phone_unique
  ON public.organization_contacts (organization_id, regexp_replace(trim(value), '\D', '', 'g'))
  WHERE contact_type = 'phone';

-- Index for ordered lookup by organization
CREATE INDEX IF NOT EXISTS idx_organization_contacts_org_order
  ON public.organization_contacts (organization_id, contact_type, display_order);

-- 3. Row Level Security on public.organization_contacts
ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_contacts_select_owner" ON public.organization_contacts;
CREATE POLICY "organization_contacts_select_owner"
ON public.organization_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_profiles op
    WHERE op.id = organization_contacts.organization_id
      AND op.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "organization_contacts_insert_owner" ON public.organization_contacts;
CREATE POLICY "organization_contacts_insert_owner"
ON public.organization_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_profiles op
    WHERE op.id = organization_contacts.organization_id
      AND op.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "organization_contacts_update_owner" ON public.organization_contacts;
CREATE POLICY "organization_contacts_update_owner"
ON public.organization_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_profiles op
    WHERE op.id = organization_contacts.organization_id
      AND op.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_profiles op
    WHERE op.id = organization_contacts.organization_id
      AND op.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "organization_contacts_delete_owner" ON public.organization_contacts;
CREATE POLICY "organization_contacts_delete_owner"
ON public.organization_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_profiles op
    WHERE op.id = organization_contacts.organization_id
      AND op.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "organization_contacts_admin_all" ON public.organization_contacts;
CREATE POLICY "organization_contacts_admin_all"
ON public.organization_contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts aa
    WHERE aa.id = auth.uid()
  )
);

-- 4. Normalization and Synchronization Triggers

-- 4A. Clean and normalize array fields BEFORE INSERT OR UPDATE on organization_profiles
CREATE OR REPLACE FUNCTION public.normalize_organization_contact_arrays()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _cleaned_emails text[] := '{}';
  _cleaned_phones text[] := '{}';
  _item text;
  _norm text;
  _seen_emails text[] := '{}';
  _seen_phones text[] := '{}';
  _primary_email_norm text;
  _primary_phone_norm text;
BEGIN
  -- Normalize primary fields
  NEW.organization_email := nullif(trim(NEW.organization_email), '');
  NEW.contact_number := nullif(trim(NEW.contact_number), '');

  _primary_email_norm := lower(coalesce(NEW.organization_email, ''));
  _primary_phone_norm := regexp_replace(coalesce(NEW.contact_number, ''), '\D', '', 'g');

  IF _primary_email_norm <> '' THEN
    _seen_emails := array_append(_seen_emails, _primary_email_norm);
  END IF;

  IF _primary_phone_norm <> '' THEN
    _seen_phones := array_append(_seen_phones, _primary_phone_norm);
  END IF;

  -- Normalize additional emails
  IF NEW.additional_emails IS NOT NULL THEN
    FOREACH _item IN ARRAY NEW.additional_emails LOOP
      _norm := lower(trim(coalesce(_item, '')));
      IF _norm <> '' AND NOT (_norm = ANY(_seen_emails)) THEN
        _seen_emails := array_append(_seen_emails, _norm);
        _cleaned_emails := array_append(_cleaned_emails, trim(_item));
      END IF;
    END LOOP;
  END IF;
  NEW.additional_emails := _cleaned_emails;

  -- Normalize additional contact numbers
  IF NEW.additional_contact_numbers IS NOT NULL THEN
    FOREACH _item IN ARRAY NEW.additional_contact_numbers LOOP
      _norm := regexp_replace(trim(coalesce(_item, '')), '\D', '', 'g');
      IF _norm <> '' AND NOT (_norm = ANY(_seen_phones)) THEN
        _seen_phones := array_append(_seen_phones, _norm);
        _cleaned_phones := array_append(_cleaned_phones, trim(_item));
      END IF;
    END LOOP;
  END IF;
  NEW.additional_contact_numbers := _cleaned_phones;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_organization_contact_arrays ON public.organization_profiles;
CREATE TRIGGER trg_normalize_organization_contact_arrays
BEFORE INSERT OR UPDATE ON public.organization_profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_organization_contact_arrays();

-- 4B. Synchronize to public.organization_contacts AFTER INSERT OR UPDATE on organization_profiles
CREATE OR REPLACE FUNCTION public.sync_organization_contacts_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _item text;
  _order integer := 0;
BEGIN
  -- Remove existing contacts for this organization
  DELETE FROM public.organization_contacts WHERE organization_id = NEW.id;

  -- Insert primary email
  IF NEW.organization_email IS NOT NULL AND trim(NEW.organization_email) <> '' THEN
    INSERT INTO public.organization_contacts (
      organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
    ) VALUES (
      NEW.id, 'email', trim(NEW.organization_email), true, 0, NEW.created_at, clock_timestamp()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert additional emails
  IF NEW.additional_emails IS NOT NULL AND array_length(NEW.additional_emails, 1) > 0 THEN
    _order := 0;
    FOREACH _item IN ARRAY NEW.additional_emails LOOP
      _order := _order + 1;
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
      ) VALUES (
        NEW.id, 'email', trim(_item), false, _order, clock_timestamp(), clock_timestamp()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Insert primary phone
  IF NEW.contact_number IS NOT NULL AND trim(NEW.contact_number) <> '' THEN
    INSERT INTO public.organization_contacts (
      organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
    ) VALUES (
      NEW.id, 'phone', trim(NEW.contact_number), true, 0, NEW.created_at, clock_timestamp()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Insert additional phones
  IF NEW.additional_contact_numbers IS NOT NULL AND array_length(NEW.additional_contact_numbers, 1) > 0 THEN
    _order := 0;
    FOREACH _item IN ARRAY NEW.additional_contact_numbers LOOP
      _order := _order + 1;
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order, created_at, updated_at
      ) VALUES (
        NEW.id, 'phone', trim(_item), false, _order, clock_timestamp(), clock_timestamp()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_organization_contacts_from_profile ON public.organization_profiles;
CREATE TRIGGER trg_sync_organization_contacts_from_profile
AFTER INSERT OR UPDATE ON public.organization_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_organization_contacts_from_profile();

-- 5. Safe Backfill of Existing Organization Contacts
DO $$
DECLARE
  _org record;
BEGIN
  FOR _org IN SELECT * FROM public.organization_profiles LOOP
    -- Primary email
    IF _org.organization_email IS NOT NULL AND trim(_org.organization_email) <> '' THEN
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order
      ) VALUES (
        _org.id, 'email', trim(_org.organization_email), true, 0
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Primary phone
    IF _org.contact_number IS NOT NULL AND trim(_org.contact_number) <> '' THEN
      INSERT INTO public.organization_contacts (
        organization_id, contact_type, value, is_primary, display_order
      ) VALUES (
        _org.id, 'phone', trim(_org.contact_number), true, 0
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- 6. Update get_admin_portal_snapshot to include organization_contacts
CREATE OR REPLACE FUNCTION public.get_admin_portal_snapshot(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN jsonb_build_object(
    'organization_profiles',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(op) ORDER BY op.created_at DESC)
        FROM public.organization_profiles op
      ),
      '[]'::jsonb
    ),
    'organization_contacts',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(oc) ORDER BY oc.organization_id, oc.contact_type, oc.display_order)
        FROM public.organization_contacts oc
      ),
      '[]'::jsonb
    ),
    'document_submissions',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(ds) ORDER BY ds.created_at DESC)
        FROM public.document_submissions ds
      ),
      '[]'::jsonb
    ),
    'document_submission_files',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dsf.id,
            'submission_id', dsf.submission_id,
            'file_url', dsf.file_url,
            'file_name', dsf.file_name,
            'file_type', dsf.file_type,
            'file_size', dsf.file_size,
            'validation_status', dsf.validation_status,
            'admin_status', dsf.admin_status,
            'admin_remarks', dsf.admin_remarks,
            'revision_history', dsf.revision_history,
            'uploaded_at', dsf.uploaded_at,
            'reviewed_at', dsf.reviewed_at,
            'revision_requested_at', dsf.revision_requested_at,
            'revision_due_at', dsf.revision_due_at,
            'revision_locked', dsf.revision_locked,
            'revision_unlocked_at', dsf.revision_unlocked_at,
            'revision_unlocked_by', dsf.revision_unlocked_by,
            'created_at', dsf.created_at,
            'updated_at', dsf.updated_at,
            'document_type_id', dsf.document_type_id,
            'required_document_types', (
              SELECT jsonb_build_object('id', rdt.id, 'name', rdt.name)
              FROM public.required_document_types rdt
              WHERE rdt.id = dsf.document_type_id
              LIMIT 1
            )
          )
          ORDER BY dsf.created_at DESC
        )
        FROM public.document_submission_files dsf
      ),
      '[]'::jsonb
    ),
    'budget_requests',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(br) ORDER BY br.created_at DESC)
        FROM public.budget_requests br
        WHERE br.status <> 'draft'
      ),
      '[]'::jsonb
    ),
    'budget_request_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(brf) ORDER BY brf.created_at DESC)
        FROM public.budget_request_files brf
      ),
      '[]'::jsonb
    ),
    'liquidation_reports',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(lr) ORDER BY lr.created_at DESC)
        FROM public.liquidation_reports lr
      ),
      '[]'::jsonb
    ),
    'liquidation_report_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(lrf) ORDER BY lrf.created_at DESC)
        FROM public.liquidation_report_files lrf
      ),
      '[]'::jsonb
    ),
    'news_releases',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(nr) ORDER BY nr.published_at DESC)
        FROM public.news_releases nr
      ),
      '[]'::jsonb
    ),
    'news_categories',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(nc) ORDER BY nc.sort_order ASC, nc.name ASC)
        FROM public.news_categories nc
      ),
      '[]'::jsonb
    ),
    'transparency_posts',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(tp) ORDER BY tp.published_at DESC)
        FROM public.transparency_posts tp
      ),
      '[]'::jsonb
    ),
    'compliance_remarks',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.created_at DESC)
        FROM public.compliance_remarks cr
      ),
      '[]'::jsonb
    ),
    'notifications',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC)
        FROM public.notifications n
      ),
      '[]'::jsonb
    ),
    'activity_logs',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(al) ORDER BY al.created_at DESC)
        FROM public.activity_logs al
      ),
      '[]'::jsonb
    ),
    'templates',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(rdt) ORDER BY rdt.sort_order ASC)
        FROM public.required_document_types rdt
      ),
      '[]'::jsonb
    ),
    'ypop_periods',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yp) ORDER BY yp.created_at DESC)
        FROM public.ypop_periods yp
      ),
      '[]'::jsonb
    ),
    'ypop_city_activities',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yca) ORDER BY yca.created_at DESC)
        FROM public.ypop_city_activities yca
      ),
      '[]'::jsonb
    ),
    'ypop_entries',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(ye) ORDER BY ye.created_at DESC)
        FROM public.ypop_entries ye
      ),
      '[]'::jsonb
    ),
    'ypop_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yf) ORDER BY yf.created_at DESC)
        FROM public.ypop_files yf
      ),
      '[]'::jsonb
    ),
    'ypop_event_participations',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yep) ORDER BY yep.created_at DESC)
        FROM public.ypop_event_participations yep
      ),
      '[]'::jsonb
    ),
    'ypop_event_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yef) ORDER BY yef.created_at DESC)
        FROM public.ypop_event_files yef
      ),
      '[]'::jsonb
    ),
    'ypop_org_activities',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yoa) ORDER BY yoa.created_at DESC)
        FROM public.ypop_org_activities yoa
      ),
      '[]'::jsonb
    ),
    'ypop_org_activity_files',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(yoaf) ORDER BY yoaf.created_at DESC)
        FROM public.ypop_org_activity_files yoaf
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC)
        FROM public.inquiries i
      ),
      '[]'::jsonb
    )
  );
END;
$$;
