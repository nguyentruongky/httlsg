#!/usr/bin/env python3
"""Read XLSX values only; workbook content is never executed as code or instructions."""
import argparse, hashlib, json, re, unicodedata, uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ORG = '10000000-0000-4000-8000-000000000003'
VIEWER = '20000000-0000-4000-8000-000000000001'
ACTOR = '30000000-0000-4000-8000-000000000001'
NAMESPACE = uuid.UUID('1ec0e196-88f0-473f-84e9-542f685a9878')
HEADERS = ['Họ và Tên','Tên Thường gọi','Giới tính','Ngày sinh','Ngày tin chúa','Ngày báp têm','Tuổi','Loại tín hữu','Khu vực','Vai trò','Ban nghành','Số điện thoại','Thăm viếng gần nhất','Tên hộ','Địa chỉ']

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.casefold().replace('đ','d')) if unicodedata.category(c) != 'Mn').strip()

def read_workbook(path):
    with ZipFile(path) as archive:
        shared = [''.join(el.itertext()) for el in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si',NS)] if 'xl/sharedStrings.xml' in archive.namelist() else []
        rows=[]
        for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('s:sheetData/s:row',NS):
            cells={}
            for cell in row.findall('s:c',NS):
                v=cell.find('s:v',NS); value=v.text if v is not None and v.text else ''
                if cell.get('t')=='s': value=shared[int(value)] if value else ''
                elif cell.get('t')=='inlineStr': value=''.join(cell.find('s:is',NS).itertext())
                cells[re.sub(r'\d','',cell.get('r'))]=value.strip()
            rows.append((int(row.get('r')),cells))
    header=rows.pop(0)[1]
    if list(header.values())!=HEADERS: raise ValueError('Workbook columns do not match the supported believer export.')
    return [(index,{header[col]:value for col,value in cells.items() if col in header}) for index,cells in rows if any(cells.values())]

def map_workbook(path):
    rows=read_workbook(path)
    revision=hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    now=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    # Read the owned, static TypeScript catalog without importing or executing it.
    catalog=(ROOT/'packages/core/src/catalog.ts').read_text()
    department_block=catalog.split('export const departments = [',1)[1].split('];',1)[0]
    base_departments=[dict(id=a,name=b) for a,b in re.findall(r'id: "([^"]+)"[\s\S]*?name: "([^"]+)"',department_block)]
    location_block=catalog.split('...new Set([',1)[1].split(']),',1)[0]
    locations=list(dict.fromkeys(re.findall(r'"([^"]+)"',location_block)))
    by_department={normalize(d['name']):d for d in base_departments}
    by_department[normalize('Ban Thăm Viếng Chăm Sóc')]=next(d for d in base_departments if d['id']=='tham-vieng')
    additional={}; issues=Counter(); ward_issues=Counter(); area_issues=Counter()
    full_locations={normalize(v):v for v in locations}
    short_locations=defaultdict(list)
    for v in locations: short_locations[normalize(re.sub(r'^(Phường|Xã|Đặc khu)\s+','',v))].append(v)
    ids={index:str(uuid.uuid5(NAMESPACE,f'{revision}:member:{index}')) for index,_ in rows}
    groups=defaultdict(list)
    for index,row in rows:
        if row.get('Tên hộ'):groups[(normalize(row['Tên hộ']),normalize(row.get('Khu vực','')))].append((index,row))
    ambiguous={key for key,g in groups.items() if sum(normalize(r.get('Vai trò',''))=='chu ho' for _,r in g)>1}
    members=[]; profiles={}
    def parse_date(value,field):
        if not value:return ''
        try:
            parsed=date.fromisoformat(value)
            if parsed>date.today():raise ValueError()
            return parsed.isoformat()
        except ValueError:issues[f'invalid_{field}']+=1;return ''
    for index,row in rows:
        name=row.get('Họ và Tên','')
        if len(name)<2:raise ValueError(f'Row {index} has a name too short for the member model.')
        member_id=ids[index]; user_id=str(uuid.uuid5(NAMESPACE,f'{revision}:user:{index}'))
        members.append({'id':member_id,'organizationId':ORG,'userId':user_id,'role':'member','status':'active','joinedAt':now,'user':{'id':user_id,'name':name,'email':None,'avatarUrl':None,'createdAt':now}})
        department_ids=[]
        for token in filter(None,re.split(r'(?=Ban\s|Nhân\s+Viên|Điểm\s+Nhóm)',row.get('Ban nghành',''))):
            token=token.strip(); key=normalize(token)
            item=by_department.get(key)
            if not item:
                slug=re.sub(r'[^a-z0-9]+','-',key).strip('-')
                item={'id':slug,'name':token};additional[slug]=item;by_department[key]=item
            if item['id'] not in department_ids:department_ids.append(item['id'])
        raw_area=row.get('Khu vực','');match=re.fullmatch(r'Khu vực\s+0*(\d+)([AB]?)',raw_area,re.I)
        area=f'KV{int(match[1])}' if match and 1<=int(match[1])<=13 else ''
        if not area:area_issues[raw_area or '(blank)']+=1
        if match and match[2]:issues['area_subdivision_preserved']+=1
        address=row.get('Địa chỉ','');parts=[p.strip() for p in address.split(',')]
        ward=parts[-2] if len(parts)>1 else ''
        location=full_locations.get(normalize(ward),'')
        candidates=short_locations.get(normalize(ward),[])
        if not location and len(candidates)==1:location=candidates[0]
        if not location:ward_issues[ward or '(blank)']+=1
        raw_phone=row.get('Số điện thoại','')
        phone_tokens=[p.strip() for p in re.split(r'[,;/]',raw_phone) if p.strip()]
        valid_phones=[p for p in phone_tokens if re.fullmatch(r'[+\d\s().-]{7,30}',p)]
        phone=valid_phones[0] if valid_phones else ''
        if raw_phone and not phone:issues['invalid_phone_preserved']+=1
        if len(valid_phones)>1:issues['multiple_phone_numbers_preserved']+=1
        key=(normalize(row.get('Tên hộ','')),normalize(raw_area))
        relatives=[] if key in ambiguous else [{'id':ids[other_index],'relationship':other.get('Vai trò') or 'Người thân'} for other_index,other in groups.get(key,[]) if other_index!=index]
        fields={'name':name,'email':'','phone':phone,'dateOfBirth':parse_date(row.get('Ngày sinh',''),'birth'),'address':address,'occupation':'','bio':'','departmentIds':department_ids,'area':area,'location':location,'position':'Chưa cập nhật','familyName':row.get('Tên hộ',''),'familyMembers':relatives}
        profiles[member_id]={'fields':fields,'source':{'row':index,'preferredName':row.get('Tên Thường gọi',''),'gender':row.get('Giới tính',''),'faithDate':parse_date(row.get('Ngày tin chúa',''),'faith'),'baptismDate':parse_date(row.get('Ngày báp têm',''),'baptism'),'age':row.get('Tuổi',''),'believerType':row.get('Loại tín hữu',''),'areaRaw':raw_area,'familyRole':row.get('Vai trò',''),'lastVisitDate':parse_date(row.get('Thăm viếng gần nhất',''),'visit'),'departmentRaw':row.get('Ban nghành',''),'phoneRaw':raw_phone,'householdName':row.get('Tên hộ',''),'addressRaw':address,'ambiguousHousehold':key in ambiguous}}
    members.append({'id':ACTOR,'organizationId':ORG,'userId':VIEWER,'role':'admin','status':'active','joinedAt':now,'user':{'id':VIEWER,'name':'Quản trị viên kiểm thử','email':None,'avatarUrl':None,'createdAt':now}})
    profiles[ACTOR]={'fields':{'name':'Quản trị viên kiểm thử','email':'','phone':'','dateOfBirth':'','address':'','occupation':'','bio':'Tài khoản kỹ thuật chỉ dùng kiểm thử cục bộ.','departmentIds':[],'area':'','location':'','position':'Quản trị viên kiểm thử','familyName':'','familyMembers':[]},'testAccount':True}
    report={'sourceFile':path.name,'revision':revision,'importedRecords':len(rows),'testAccounts':1,'blankEmails':len(rows),'recordsWithDepartments':sum(bool(p['fields']['departmentIds']) for p in profiles.values()),'additionalDepartments':list(additional.values()),'unmappedAreas':dict(area_issues),'matchedLocations':len(rows)-sum(ward_issues.values()),'unmatchedLocationCount':sum(ward_issues.values()),'unmatchedLocationLabels':dict(ward_issues),'ambiguousHouseholdGroups':len(ambiguous),'householdGroups':len(groups),'issues':dict(issues)}
    return {'revision':revision,'organization':{'id':ORG,'name':'Dữ liệu tín hữu cục bộ','short':'TH'},'departments':list(additional.values()),'members':members,'profiles':profiles,'report':report}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('workbook',type=Path);parser.add_argument('--output',type=Path,default=ROOT/'.local-data/believers.json');args=parser.parse_args()
    payload=map_workbook(args.workbook)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
    report_path=args.output.with_name(args.output.stem+'-report.json');report_path.write_text(json.dumps(payload['report'],ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in payload['report'].items() if k not in ['unmatchedLocationLabels']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
