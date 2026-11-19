-- Step 1: Create organizations table (id + name only)
CREATE TABLE IF NOT EXISTS organizations (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Move Cơ quan entries from churches to organizations
INSERT INTO organizations (name)
SELECT name FROM churches WHERE form = 'Cơ quan' ON CONFLICT (name) DO NOTHING;

-- Step 3: Add organization_id column to pastoral_assignments
ALTER TABLE public.pastoral_assignments ADD COLUMN IF NOT EXISTS organization_id integer;

-- Step 4: Add FK constraint for organization_id (do this BEFORE updating data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pastoral_assignments_organization_id_organizations_id_fk'
  ) THEN
    ALTER TABLE public.pastoral_assignments
      ADD CONSTRAINT pastoral_assignments_organization_id_organizations_id_fk
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Update pastoral_assignments to reference organizations instead of churches
-- Match organization name within raw_assignment_text (e.g., "Chuyên trách: Ủy Ban Tu Thư và Du Học Sinh")
UPDATE public.pastoral_assignments pa
SET organization_id = o.id,
    church_id = NULL
FROM organizations o
WHERE pa.raw_assignment_text ILIKE '%' || o.name || '%'
  AND pa.church_id IS NOT NULL;

-- Step 6: Now delete Cơ quan churches (assignments already migrated, cascade won't delete them since church_id is NULL)
DELETE FROM churches WHERE form = 'Cơ quan';

-- Step 7: Add index on organization_id
CREATE INDEX IF NOT EXISTS idx_pastoral_assignments_organization_id 
  ON public.pastoral_assignments (organization_id);
