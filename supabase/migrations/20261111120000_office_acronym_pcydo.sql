-- The office is PCYDO; the "/ LYDO" suffix was a leftover from the old office name.
update public.admin_system_settings
set value_json = '"PCYDO"'::jsonb,
    updated_at = now()
where setting_key = 'general.office_acronym';
