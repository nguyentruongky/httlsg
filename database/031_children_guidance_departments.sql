BEGIN;

INSERT INTO church.departments(id,name,department_type) VALUES
 ('huong-dan-au-nhi','Ban hướng dẫn Ấu nhi','ministry'),
 ('huong-dan-thieu-nhi','Ban hướng dẫn Thiếu nhi','ministry'),
 ('huong-dan-thieu-nien','Ban hướng dẫn Thiếu niên','ministry')
ON CONFLICT(id) DO UPDATE
SET name=EXCLUDED.name, department_type=EXCLUDED.department_type;

INSERT INTO church.schema_migrations(version) VALUES(31);
COMMIT;
