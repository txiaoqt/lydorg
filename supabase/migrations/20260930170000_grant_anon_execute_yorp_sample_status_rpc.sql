-- The Admin Portal authenticates administrators with a custom session token
-- and sends that token as an RPC argument while Supabase Auth is signed out.
-- Allow the PostgREST anon role to invoke this one RPC; the function itself
-- validates the custom token before returning any dataset status.
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text, text) TO anon;
