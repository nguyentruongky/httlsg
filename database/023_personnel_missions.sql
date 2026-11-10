BEGIN;
SELECT pg_advisory_xact_lock(74298331);
WITH catalog(id,name) AS (VALUES
 ('am-nhac','Ban Âm Nhạc'),('am-thanh-anh-sang','Ban Âm Thanh - Ánh Sáng'),
 ('bien-soan-bai-hoc-ktht','Ban Biên Soạn Bài học KTHT'),('giu-xe','Ban Giữ xe'),
 ('hau-can','Ban Hậu Cần'),('khanh-tiet','Ban Khánh Tiết'),('phien-dich','Ban Phiên Dịch'),
 ('tham-vieng','Ban Thăm Viếng'),('truyen-giang','Ban Truyền Giảng'),('truyen-thong','Ban Truyền Thông'),
 ('truong-chua-nhat','Ban Trường Chúa Nhật'),('tu-bo-sua-chua','Ban Tu bổ sửa chữa'),
 ('lao-nien','Ban Lão niên'),('trung-nien','Ban Trung niên'),('trang-nien','Ban Tráng niên'),
 ('thanh-trang','Ban Thanh tráng'),('thanh-nien','Ban Thanh niên'),('thieu-nien','Ban Thiếu niên'),
 ('thieu-nhi','Ban Thiếu nhi'),('au-nhi','Ban Ấu nhi'),('phu-nu','Ban Phụ nữ')
)
INSERT INTO church.departments(id,name)
SELECT c.id,c.name FROM catalog c WHERE NOT EXISTS(
 SELECT 1 FROM church.departments d WHERE
 regexp_replace(regexp_replace(public.unaccent(lower(d.name)),'^ban[[:space:]]+',''),'[^a-z0-9]','','g')=
 regexp_replace(regexp_replace(public.unaccent(lower(c.name)),'^ban[[:space:]]+',''),'[^a-z0-9]','','g')
) ON CONFLICT DO NOTHING;
-- Church responsibilities that do not grant an application access role.
CREATE TABLE church.personnel_missions (
 member_id uuid NOT NULL REFERENCES church.member_profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind='specialist'),
 department_id text NOT NULL REFERENCES church.departments(id) ON DELETE CASCADE,
 PRIMARY KEY(member_id,kind,department_id)
);
INSERT INTO church.personnel_missions(member_id,kind,department_id)
 SELECT user_id,'specialist',department_id FROM church.department_members
 WHERE lower(trim(position)) LIKE 'đặc trách%' ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.personnel_missions TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(23);
COMMIT;
