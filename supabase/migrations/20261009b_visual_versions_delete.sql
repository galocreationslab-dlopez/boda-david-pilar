-- Permit the admin-only API (using service_role after checking the invite code)
-- to delete a selected visual snapshot. No browser role receives this privilege.
grant delete on public.visual_versions to service_role;
