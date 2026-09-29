-- The Admin Portal invokes this SECURITY DEFINER RPC through the anon-key
-- Supabase client and supplies its separately validated custom admin token.
-- Grant only invocation access; authorization and test-environment guards
-- remain enforced inside the function.
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text, text) TO anon;
