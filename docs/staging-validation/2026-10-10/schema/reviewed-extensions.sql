-- Required app-used extensions missing from staging; Supabase-managed extensions stay intact.
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
