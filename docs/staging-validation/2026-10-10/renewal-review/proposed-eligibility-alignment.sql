-- REVIEW PROPOSAL ONLY. Not a migration. Not applied to staging or production.
-- Reuses draft term resolution; preserves windows, return keys, owner/mode and existing grants.
-- Terminal cycle / ownership / concurrency checks remain enforced by the draft RPC.
CREATE OR REPLACE FUNCTION public.calculate_organization_renewal_eligibility(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  _today date := current_date;
  _org record;
  _acc record;
  _end_date date;
  _days_diff integer;
  _window_status text;
  _can_draft boolean;
  _can_submit boolean;
  _days_until_open integer := NULL;
  _days_past_expiry integer := NULL;
  _reason text;
BEGIN
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE id = _org_id;

  IF _org.id IS NULL THEN
    RETURN jsonb_build_object(
      'canDraft', false,
      'canSubmit', false,
      'windowStatus', 'too_early',
      'reason', 'Organization profile not found.',
      'daysRemaining', NULL,
      'daysUntilOpen', NULL,
      'daysPastExpiry', NULL,
      'expiresAt', NULL
    );
  END IF;

  -- PROPOSAL: use the same ledger resolution as draft initialization.
  SELECT * INTO _acc
  FROM public.organization_accreditations
  WHERE id = _org.current_accreditation_id
    AND organization_id = _org_id
  LIMIT 1;
  IF _acc.id IS NULL THEN
    SELECT * INTO _acc FROM public.organization_accreditations
    WHERE organization_id = _org_id AND status = 'active'
    ORDER BY term_number DESC LIMIT 1;
  END IF;

  IF _acc.id IS NULL OR _acc.status = 'revoked' OR _org.profile_status <> 'verified' THEN
    RETURN jsonb_build_object(
      'canDraft', false, 'canSubmit', false, 'windowStatus', 'too_early',
      'reason', CASE WHEN _org.profile_status <> 'verified' THEN 'Organization must have verified profile status to initiate renewal.'
        WHEN _acc.id IS NULL THEN 'No authoritative accreditation term found for this organization.'
        ELSE 'Accreditation has been revoked. Organization cannot renew and must contact LYDO.' END,
      'daysRemaining', NULL, 'daysUntilOpen', NULL, 'daysPastExpiry', NULL, 'expiresAt', NULL
    );
  END IF;
  _end_date := _acc.end_date;

  _days_diff := _end_date - _today;

  -- Authoritative Window Rules:
  -- 1. Window opens: 90 calendar days before expiry
  -- 2. Active Window: [end_date - 90, end_date]
  -- 3. Late Renewal (Grace Period): (end_date, end_date + 180]
  -- 4. Cutoff exceeded (Lapsed): > 180 days past expiry
  IF _days_diff > 90 THEN
    _window_status := 'too_early';
    _can_draft := false;
    _can_submit := false;
    _days_until_open := _days_diff - 90;
    _reason := format('Renewal window opens 90 days before expiry (in %s days).', _days_until_open);
  ELSIF _days_diff >= 0 THEN
    _window_status := 'open';
    _can_draft := true;
    _can_submit := true;
    _reason := 'Renewal window is open.';
  ELSIF ABS(_days_diff) <= 180 THEN
    _window_status := 'expired';
    _can_draft := true;
    _can_submit := true;
    _days_past_expiry := ABS(_days_diff);
    _reason := format('Late renewal allowed within 180 days of expiry (%s days expired).', _days_past_expiry);
  ELSE
    _window_status := 'lapsed';
    _can_draft := false;
    _can_submit := false;
    _days_past_expiry := ABS(_days_diff);
    _reason := 'Late renewal window expired (180 days past expiry). Full re-registration is required.';
  END IF;

  RETURN jsonb_build_object(
    'canDraft', _can_draft,
    'canSubmit', _can_submit,
    'windowStatus', _window_status,
    'daysRemaining', GREATEST(0, _days_diff),
    'daysUntilOpen', _days_until_open,
    'daysPastExpiry', _days_past_expiry,
    'expiresAt', _end_date,
    'reason', _reason
  );
END;
$function$

