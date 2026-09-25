-- Unique constraint/index for (organization_id, semester) in public.ypop_entries
-- Guarantees that each organization can have at most one YPOP qualification entry per semester.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ypop_entries_org_semester_unique
ON public.ypop_entries (organization_id, semester);
