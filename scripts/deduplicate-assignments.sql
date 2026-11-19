-- Deduplicate pastoral_assignments:
-- Type A: Same pastor_id + church_id + role appearing multiple times -> keep one, delete extras
-- Type B: Same pastor_id + church_id but different role -> keep all (no action needed)

DELETE FROM public.pastoral_assignments
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY pastor_id, church_id, role
        ORDER BY id
      ) AS rn
    FROM public.pastoral_assignments
    WHERE church_id IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Report results
SELECT
  'Total assignments' AS metric,
  COUNT(*) AS value
FROM public.pastoral_assignments

UNION ALL

SELECT
  'Assignments with church_id',
  COUNT(*)
FROM public.pastoral_assignments
WHERE church_id IS NOT NULL

UNION ALL

SELECT
  'Duplicate (pastor, church, role) groups removed',
  COUNT(*)
FROM (
  SELECT pastor_id, church_id, role, COUNT(*) as cnt
  FROM public.pastoral_assignments
  WHERE church_id IS NOT NULL
  GROUP BY pastor_id, church_id, role
  HAVING COUNT(*) > 1
) dup;
