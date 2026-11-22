-- Filename retained as requested; version 42 already exists, so track this as 45.
BEGIN;
CREATE TABLE IF NOT EXISTS church.worship_service_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('hdct','hd_hat','ban_hat_thieu_nhien','ban_hat_thanh_trang','ban_hat_thanh_nien','ban_hat_phu_nu','ban_hat_trung_nien','ban_hat_trang_nien','ban_hat_lao_nien')),
  full_name text NOT NULL,
  phone text,
  email text,
  role_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category,full_name)
);
CREATE INDEX IF NOT EXISTS worship_service_workers_active_category
  ON church.worship_service_workers(category) WHERE is_active;
INSERT INTO church.worship_service_workers(category,full_name,role_label) VALUES
  ('hdct','Lê Quốc Anh','Chấp sự'),
  ('hdct','Nguyễn Linh Công','Chấp sự'),
  ('hdct','Phan Ngọc Danh','Chấp sự'),
  ('hdct','Nguyễn Sơn Hải','Chấp sự'),
  ('hdct','Nguyễn Hồ Văn Hiển','Chấp sự'),
  ('hdct','Phan Thiệu Huy','Chấp sự'),
  ('hdct','Trần Trọng Huy','Chấp sự'),
  ('hdct','Nguyễn Trường Kỷ','Chấp sự'),
  ('hdct','Nguyễn Khánh Linh','Chấp sự'),
  ('hdct','Trương Nhật Linh','Chấp sự'),
  ('hdct','Nguyễn Viết Nhẫn','Chấp sự'),
  ('hdct','Lê Minh Quân','Chấp sự'),
  ('hdct','Nguyễn Thanh Tân','Chấp sự'),
  ('hdct','Lâm Hoàng Vũ','Chấp sự'),
  ('hd_hat','Huỳnh Lê Minh Hoàng Nguyên',NULL),
  ('hd_hat','Nguyễn Linh Công','Chấp sự'),
  ('hd_hat','Nguyễn Sơn Hải','Chấp sự'),
  ('hd_hat','Nguyễn Khánh Linh','Chấp sự'),
  ('hd_hat','Quách Hoàng Giang',NULL),
  ('hd_hat','Lâm Hoàng Vũ','Chấp sự'),
  ('ban_hat_thieu_nhien','Nguyễn Ngọc Uyên Thy',NULL),
  ('ban_hat_thanh_trang','Huỳnh Lê Minh Hoàng Nguyên',NULL),
  ('ban_hat_thanh_nien','Hồ Thiên Thanh',NULL),
  ('ban_hat_phu_nu','Nguyễn Ái Linh',NULL),
  ('ban_hat_trung_nien','Trần Thanh Đức Tín',NULL),
  ('ban_hat_trang_nien','Nguyễn Khánh Linh','Chấp sự'),
  ('ban_hat_lao_nien','Nguyễn Thanh Tân','Chấp sự')
ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.worship_service_workers TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(45) ON CONFLICT DO NOTHING;
COMMIT;
