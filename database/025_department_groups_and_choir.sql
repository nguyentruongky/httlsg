BEGIN;
ALTER TABLE church.departments
  ADD COLUMN department_type text NOT NULL DEFAULT 'ministry'
    CHECK (department_type IN ('choir','ministry','other'));

INSERT INTO church.departments(id,name,department_type) VALUES
 ('au-nhi','Ban Ấu nhi','choir'),
 ('thieu-nhi','Ban Thiếu nhi','choir'),
 ('thieu-nien','Ban Thiếu niên','choir'),
 ('thanh-nien','Ban Thanh niên','choir'),
 ('thanh-trang','Ban Thanh tráng','choir'),
 ('trang-nien','Ban Tráng niên','choir'),
  ('trung-nien','Ban Trung niên','choir'),
 ('lao-nien','Ban Lão niên','choir'),
 ('phu-nu','Ban Phụ nữ','choir'),
 ('am-nhac','Ban Âm nhạc','ministry'),
 ('am-thanh-anh-sang','Ban Âm thanh - Ánh sáng','ministry'),
 ('bien-soan-bai-hoc-ktht','Ban Biên soạn Bài học KTHT','ministry'),
 ('cau-nguyen','Ban Cầu nguyện','ministry'),
 ('giu-xe','Ban Giữ xe','ministry'),
 ('hau-can','Ban Hậu cần','ministry'),
 ('khanh-tiet','Ban Khánh tiết','ministry'),
 ('phien-dich','Ban Phiên dịch','ministry'),
 ('tham-vieng','Ban Thăm viếng','ministry'),
 ('tiep-tan-trat-tu','Ban Tiếp tân - Trật tự','ministry'),
 ('truyen-giang','Ban Truyền giảng','ministry'),
 ('truyen-thong','Ban Truyền thông','ministry'),
 ('truong-chua-nhat','Ban Trường Chúa nhật','ministry'),
 ('tu-bo-sua-chua','Ban Tu bổ sửa chữa','ministry'),
 ('y-te-xa-hoi','Ban Y tế xã hội','ministry'),
 ('diem-nhom-phu-loi','Điểm nhóm Phú Lợi','ministry'),
 ('chap-su','Ban Chấp sự','other'),
 ('nhan-vien','Nhân viên','other')
ON CONFLICT(id) DO UPDATE
SET name=EXCLUDED.name, department_type=EXCLUDED.department_type;

INSERT INTO church.schema_migrations(version) VALUES(25);
COMMIT;