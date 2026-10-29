-- Application-owned Auth hook only; never replace managed auth tables/functions/triggers.
SET search_path = pg_catalog, public, extensions, auth, storage;
CREATE TRIGGER trg_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
