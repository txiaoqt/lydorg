-- Normalize persisted office labels and database-generated messages to PCYDO.
-- Historical migrations are left unchanged; this updates already-migrated projects.

UPDATE public.admin_system_settings
SET value_json = '"PCYDO"'::jsonb,
    updated_at = now()
WHERE setting_key = 'general.office_acronym'
  AND value_json = '"PCYDO / LYDO"'::jsonb;

UPDATE public.admin_system_settings
SET value_json = '"Pasig City PCYDO"'::jsonb,
    updated_at = now()
WHERE setting_key = 'email.sender_name'
  AND value_json = '"Pasig City LYDO"'::jsonb;

-- Keep database-backed notices and RPC errors in step with the site copy.
DO $migration$
DECLARE
  _function record;
  _definition text;
BEGIN
  FOR _function IN
    SELECT p.oid
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ~ '\mLYDO\M'
  LOOP
    _definition := pg_get_functiondef(_function.oid);
    _definition := regexp_replace(_definition, '\mLYDO\M', 'PCYDO', 'g');
    _definition := regexp_replace(
      _definition,
      'PCYDO[[:space:]]*/[[:space:]]*PCYDO',
      'PCYDO',
      'g'
    );
    _definition := regexp_replace(
      _definition,
      'PCYDO[[:space:]]+and[[:space:]]+PCYDO',
      'PCYDO',
      'gi'
    );
    EXECUTE _definition;
  END LOOP;
END
$migration$;
