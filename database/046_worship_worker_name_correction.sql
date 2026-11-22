BEGIN;
UPDATE church.worship_service_workers
SET full_name='Quách Hoàng Giang'
WHERE category='hd_hat' AND full_name='Quánh Hoàng Giang'
  AND NOT EXISTS (
    SELECT 1 FROM church.worship_service_workers
    WHERE category='hd_hat' AND full_name='Quách Hoàng Giang'
  );
INSERT INTO church.schema_migrations(version) VALUES(46) ON CONFLICT DO NOTHING;
COMMIT;
