# Local believer workbook fixture

The supplied workbook has been mapped to `.local-data/believers.json` with an aggregate mapping report in `.local-data/believers-report.json`. Both files are ignored by Git. The original workbook is read without modification. The importer reads cell values only; document text and formulas are not executed as instructions.

## Run locally

```sh
npm run dev:mobile
# http://127.0.0.1:5173

npm run dev:admin
# http://127.0.0.1:3000
```

When the fixture exists, both development apps automatically select **Dữ liệu tín hữu cục bộ**. The People list contains 2,283 source records. A separate **Quản trị viên kiểm thử** account provides edit permissions and the Profile view; it is excluded from the People list and family selection options. Admin totals include this additional technical account.

If a server was already running, restart it and reload the page. The synthetic workspaces remain available in the organization selector. To return to synthetic-only startup, move the `.local-data/believers.json` file out of that directory and restart.

To regenerate after receiving another export with the same columns:

```sh
npm run import:believers -- /absolute/path/to/believers-export.xlsx
```

The importer uses Python's standard library; no spreadsheet runtime is needed. Unknown workbook headers are rejected rather than mapped by guessed column positions. Output defaults to the ignored `.local-data` directory. The workbook fingerprint determines a separate browser storage namespace, so imported data and older synthetic demo edits are not mixed. Reimporting an identical workbook retains stable IDs and the same namespace. A changed workbook gets a new namespace; this is a testing importer, not an identity reconciliation service.

## Field mapping

| Workbook                     | Local application                                                           |
| ---------------------------- | --------------------------------------------------------------------------- |
| Họ và Tên                    | Member/user name                                                            |
| Tên Thường gọi               | Source profile, searchable                                                  |
| Giới tính                    | Source profile                                                              |
| Ngày sinh                    | Date of birth, ISO date                                                     |
| Ngày tin chúa / Ngày báp têm | Source faith and baptism dates                                              |
| Tuổi                         | Source age, displayed as the age recorded in the file                       |
| Loại tín hữu                 | Source believer category                                                    |
| Khu vực                      | KV1–KV13 when recognizable; original subdivision label retained             |
| Vai trò                      | **Household role**, never application RBAC                                  |
| Ban nghành                   | Multiple department memberships; concatenated labels are split              |
| Số điện thoại                | First valid phone as the primary number; complete source string retained    |
| Thăm viếng gần nhất          | Source last-visit date                                                      |
| Tên hộ                       | Household display name and unambiguous family links                         |
| Địa chỉ                      | Complete source address; location matched by exact ward label when possible |

There is no email, occupation, membership-start date or application-access role column. Emails remain null, occupations remain empty, membership dates display **Chưa cập nhật**, and all imported people receive the neutral local `member` role. Technical timestamps record import time; they do not claim a real membership date. The technical administrator is the only imported-workspace admin and is not a workbook record.

## Mapping results for this file

- 2,283 source records retained; no people deduplicated by name.
- 622 records have department memberships. The importer registers 14 additional departments/groups from the file in the local workspace without changing the tracked base catalog. `Ban Thăm Viếng Chăm Sóc` maps to `Ban Thăm viếng`; capitalization differences map to existing canonical labels.
- 584 records use area subdivisions such as 06A/06B or 12A/12B. These map to KV6/KV12 for filtering while retaining the original label.
- 55 area values do not map to KV1–KV13: 53 `Phú Lợi` and 2 `Không chia`. Their filter area remains unassigned.
- 247 addresses match the supplied location catalog; 2,036 do not. Original addresses remain intact. No old-to-new administrative-boundary conversion is guessed.
- Family grouping uses the exact normalized exported household name plus original area. Ten groups have multiple household heads; their names/roles are preserved but automatic relative links are omitted. Relationships shown in the family card describe roles within the household, not an inferred relationship to the person being viewed.
- One record has multiple valid phone numbers; the first is primary and the complete source remains in the private fixture. One non-phone value remains in source metadata with no primary phone assigned.

The aggregate JSON report includes unmatched location labels for follow-up mapping without requiring inspection of individual profiles.

## Local-only delivery and verification

Vite serves the private fixture from a development-only middleware endpoint. The Next.js route returns 404 outside development. Both dev commands bind to loopback, responses use `Cache-Control: no-store`, and browser cross-origin requests are rejected. The fixture is outside public/static directories and is explicitly excluded from Next.js output tracing. Production code does not automatically load it.

The local fixture validated successfully against Zod and paginated through every source record. The client page and data endpoint returned 200 on localhost, while a cross-origin request returned 403. Production output was checked for source-name samples and private fixture trace entries, with no matches; the production data route returns 404. Full browser rendering and physical-device interaction checks have not been performed.

`npm test` runs core/data tests, DOM dropdown tests, and standard-library workbook mapper tests. The test that reads the real private fixture skips when that ignored file is absent. Tests never snapshot or print personal records.

Inline profile changes do not modify the workbook fixture. Faith/baptism dates initially use the imported values; saved overrides can replace or explicitly clear them. The client no longer displays the raw area/phone/believer-category summary fields, though these remain preserved in this private fixture. Department-specific role entries are local edit data, distinct from the exported household role and application permissions.
