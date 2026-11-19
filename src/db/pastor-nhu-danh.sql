-- Create separate table for nhu_danh (only 10 pastors have it)
CREATE TABLE IF NOT EXISTS pastor_nhu_danh (
  id serial PRIMARY KEY,
  pastor_id integer NOT NULL UNIQUE REFERENCES public.pastors(id) ON DELETE CASCADE,
  nhu_danh text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Migrate existing nhu_danh values from pastors to new table
INSERT INTO pastor_nhu_danh (pastor_id, nhu_danh)
SELECT id, nhu_danh
FROM public.pastors
WHERE nhu_danh IS NOT NULL AND nhu_danh != '';

-- Drop nhu_danh column from pastors
ALTER TABLE public.pastors DROP COLUMN IF EXISTS nhu_danh;
