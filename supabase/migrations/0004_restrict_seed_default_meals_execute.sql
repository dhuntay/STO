-- The seeding function is only ever meant to run as an auth.users trigger.
-- Revoke EXECUTE so it isn't callable through the public REST API
-- (flagged by Supabase's security linter).
revoke execute on function public.seed_default_meals() from public;
revoke execute on function public.seed_default_meals() from anon;
revoke execute on function public.seed_default_meals() from authenticated;
