-- Supabase Auth reads these token columns as text; NULL makes sign-in fail with
-- "Database error querying schema". The renewal test account was inserted without them.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, '')
where lower(email) = 'renewal.test@pasigcity.gov.ph';

-- Recreating the test account must write the same empty values.
do $migration$
declare
  _def text;
  _old_cols text := $o$      created_at,
      updated_at
    ) VALUES (
      _user_id,$o$;
  _new_cols text := $n$      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      _user_id,$n$;
  _old_vals text := $o$      _now,
      _now
    );
  ELSE
    UPDATE auth.users$o$;
  _new_vals text := $n$      _now,
      _now,
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users$n$;
begin
  select pg_get_functiondef('public.admin_get_or_create_renewal_test_account(text)'::regprocedure) into _def;
  _def := replace(_def, chr(13) || chr(10), chr(10)); -- stored bodies mix line endings
  if strpos(_def, _old_cols) = 0 or strpos(_def, _old_vals) = 0 then
    raise exception 'Renewal test account function changed; migration aborted.';
  end if;
  _def := replace(replace(_def, _old_cols, _new_cols), _old_vals, _new_vals);
  execute _def;
end;
$migration$;
