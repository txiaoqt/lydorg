-- Allow organization users to receive live inquiry INSERT/UPDATE events.
-- The existing table RLS policy keeps events scoped to the owner/admin; keep
-- the publication's current INSERT/UPDATE-only behavior unchanged.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'inquiries'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Inquiry Realtime requires row-level security on public.inquiries.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inquiries'
      AND cmd IN ('SELECT', 'ALL')
      AND (roles @> ARRAY['authenticated']::name[] OR roles @> ARRAY['public']::name[])
  ) THEN
    RAISE EXCEPTION 'Inquiry Realtime requires an authenticated SELECT policy on public.inquiries.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Supabase Realtime publication was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inquiries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries';
  END IF;
END;
$$;
