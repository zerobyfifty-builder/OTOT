-- LOCAL-ONLY seed (run automatically by `supabase start` / `supabase db reset`).
-- Never runs against the hosted project.
--
-- The migrations rely on Supabase Cloud's default privileges to grant CRUD on
-- public tables to the API roles (anon/authenticated/service_role). The local
-- stack doesn't reproduce those, so tables come up with only
-- REFERENCES/TRIGGER/TRUNCATE and every API call gets "permission denied".
-- Re-apply the standard grants here so the local stack behaves like production.
GRANT ALL ON ALL TABLES     IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES  IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES   IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Re-apply the service-role-only lockdown on the lodge credential helpers
-- (seed grants above would otherwise re-open them to anon/authenticated).
REVOKE EXECUTE ON FUNCTION public.verify_lodge_password(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_lodge_password(uuid, text, text) FROM anon, authenticated;
