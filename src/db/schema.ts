import { pgTable, serial, text, integer, boolean, timestamp, real } from 'drizzle-orm/pg-core';

export const governanceLevels = pgTable('governance_levels', {
  id: serial('id').primaryKey(),
  tier: integer('tier').notNull().unique(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  permissionsSummary: text('permissions_summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  areaDescription: text('area_description').notNull(),
  coordinatorName: text('coordinator_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pastors = pgTable('pastors', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  title: text('title').notNull().default('Mục sư'),
  phone: text('phone'),
  email: text('email'),
  status: text('status').notNull().default('active'),
  chucVu: text('chuc_vu'),        // chức vụ
  namSinh: integer('nam_sinh'),   // năm sinh
  tenNhiemSo: text('ten_nhiem_so'), // tên nhiệm sở
  diaChi: text('dia_chi'),        // địa chỉ
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pastorNhuDanh = pgTable('pastor_nhu_danh', {
  id: serial('id').primaryKey(),
  pastorId: integer('pastor_id')
    .notNull()
    .references(() => pastors.id, { onDelete: 'cascade' }),
  nhuDanh: text('nhu_danh').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const churches = pgTable('churches', {
  id: serial('id').primaryKey(),
  stt: integer('stt').notNull().unique(),
  code: text('code').notNull().unique(),
  form: text('form').notNull().default('Chi hội'),
  legalType: text('legal_type').notNull().default('Chính thức'),
  autonomy: text('autonomy'),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  parentChurchName: text('parent_church_name'),
  parentChurchId: integer('parent_church_id'),
  regionId: integer('region_id')
    .notNull()
    .references(() => regions.id, { onDelete: 'restrict' }),
  wardId: integer('ward_id').references(() => administrativeWards.id, {
    onDelete: 'set null',
  }),
  foundedYear: integer('founded_year'),
  oldDistrict: text('old_district'),
  oldWard: text('old_ward'),
  oldAddress: text('old_address'),
  newAddress: text('new_address'),
  newWard: text('new_ward'),
  isInHcm: boolean('is_in_hcm').notNull().default(true),
  memberCount: integer('member_count').notNull().default(0),
  regularAttendanceCount: integer('regular_attendance_count').notNull().default(0),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pastoralAssignments = pgTable('pastoral_assignments', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id')
    .references(() => churches.id, { onDelete: 'cascade' }),
  organizationId: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  pastorId: integer('pastor_id')
    .notNull()
    .references(() => pastors.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('Quản nhiệm'),
  isPrimary: boolean('is_primary').notNull().default(true),
  assignmentType: text('assignment_type').notNull().default('church'),
  workName: text('work_name'),
  rawAssignmentText: text('raw_assignment_text'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  levelScope: text('level_scope').notNull(),
  headName: text('head_name').notNull(),
  headTitle: text('head_title').notNull(),
  activeUnitsCount: integer('active_units_count').notNull().default(0),
  totalMembersCount: integer('total_members_count').notNull().default(0),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const churchDepartments = pgTable('church_departments', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').notNull().references(() => churches.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  leaderName: text('leader_name').notNull(),
  memberCount: integer('member_count').notNull().default(0),
  meetingSchedule: text('meeting_schedule').notNull().default('Chúa Nhật · 10:30'),
});

export const administrativeWards = pgTable('administrative_wards', {
  id: serial('id').primaryKey(),
  stt: integer('stt'),
  name: text('name').notNull(),
  province: text('province').notNull().default('TP.HCM'),
  areaKm2: real('area_km2'),
  population: integer('population'),
  hasChurch: boolean('has_church').notNull().default(false),
  regionId: integer('region_id').references(() => regions.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const churchPersonnel = pgTable('church_personnel', {
  id: serial('id').primaryKey(),
  churchId: integer('church_id').references(() => churches.id, {
    onDelete: 'set null',
  }),
  regionId: integer('region_id').references(() => regions.id, {
    onDelete: 'set null',
  }),
  rawChurchName: text('raw_church_name'),
  fullName: text('full_name').notNull(),
  ministryRole: text('ministry_role').notNull().default('Đặc trách Truyền giáo'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assemblyDelegates = pgTable('assembly_delegates', {
  id: serial('id').primaryKey(),
  assemblyNumber: integer('assembly_number').notNull().default(49),
  delegateCategory: text('delegate_category').notNull(),
  stt: integer('stt').notNull(),
  title: text('title').notNull(),
  lastName: text('last_name'),
  firstName: text('first_name'),
  fullName: text('full_name').notNull(),
  birthYear: integer('birth_year'),
  role: text('role'),
  churchId: integer('church_id').references(() => churches.id, {
    onDelete: 'set null',
  }),
  pastorId: integer('pastor_id').references(() => pastors.id, {
    onDelete: 'set null',
  }),
  rawChurchName: text('raw_church_name'),
  province: text('province').notNull().default('Tp. HCM'),
  autonomyNote: text('autonomy_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
