import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from xml.sax.saxutils import escape
spec=importlib.util.spec_from_file_location('believer_import',Path(__file__).with_name('import-believers.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ImportTests(unittest.TestCase):
 def workbook(self,records):
  cells=[]
  for index,record in enumerate([dict(zip(module.HEADERS,module.HEADERS))]+records,1):
   body=''.join(f'<c r="{chr(65+j)}{index}" t="inlineStr"><is><t>{escape(record.get(header,""))}</t></is></c>' for j,header in enumerate(module.HEADERS))
   cells.append(f'<row r="{index}">{body}</row>')
  temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);path=Path(temp.name)/'test.xlsx'
  with ZipFile(path,'w') as z:z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="'+module.NS['s']+'"><sheetData>'+''.join(cells)+'</sheetData></worksheet>')
  return path
 def test_values_and_concatenated_departments(self):
  payload=module.map_workbook(self.workbook([
   {'Họ và Tên':'Người Kiểm Thử','Ngày sinh':'1980-01-02','Khu vực':'Khu vực 06A','Vai trò':'Chủ Hộ','Tên hộ':'Hộ Kiểm Thử','Ban nghành':'Ban Thăm Viếng Chăm SócBan Trường Chúa nhậtBan Âm nhạc','Số điện thoại':'0900000001, 0900000002','Địa chỉ':'TP. Hồ Chí Minh, Quận 1, Phường Sài Gòn, Đường Kiểm Thử'},
   {'Họ và Tên':'Người Kiểm Thử Hai','Khu vực':'Khu vực 06A','Vai trò':'Con','Tên hộ':'Hộ Kiểm Thử'}]))
  records=[m for m in payload['members'] if not payload['profiles'][m['id']].get('testAccount')]
  self.assertEqual(len(records),2);self.assertTrue(all(m['role']=='member' and m['user']['email'] is None for m in records))
  profile=payload['profiles'][records[0]['id']]
  self.assertEqual(profile['fields']['departmentIds'],['tham-vieng','truong-chua-nhat','ban-am-nhac']);self.assertEqual(profile['fields']['area'],'KV6');self.assertEqual(profile['source']['areaRaw'],'Khu vực 06A')
  self.assertEqual(profile['fields']['location'],'Phường Sài Gòn');self.assertEqual(profile['fields']['phone'],'0900000001');self.assertIn('0900000002',profile['source']['phoneRaw'])
  self.assertEqual(profile['fields']['familyMembers'][0]['relationship'],'Con');self.assertEqual(payload['report']['blankEmails'],2)
 def test_unknowns_and_ambiguous_households_are_not_invented(self):
  rows=[{'Họ và Tên':f'Người Kiểm Thử {i}','Khu vực':'Phú Lợi','Vai trò':'Chủ Hộ','Tên hộ':'Hộ Trùng','Ngày sinh':'2999-01-01','Số điện thoại':'Không rõ','Địa chỉ':'TP. Hồ Chí Minh, Quận 1, Phường 99, Đường Kiểm Thử'} for i in range(2)]
  path=self.workbook(rows);payload=module.map_workbook(path);again=module.map_workbook(path)
  self.assertEqual([m['id'] for m in payload['members']],[m['id'] for m in again['members']])
  for p in payload['profiles'].values():
   if p.get('testAccount'):continue
   self.assertEqual(p['fields']['dateOfBirth'],'');self.assertEqual(p['fields']['phone'],'');self.assertEqual(p['fields']['area'],'');self.assertEqual(p['fields']['location'],'');self.assertEqual(p['fields']['familyMembers'],[]);self.assertTrue(p['source']['ambiguousHousehold'])
  self.assertEqual(payload['report']['ambiguousHouseholdGroups'],1)
if __name__=='__main__':unittest.main()
