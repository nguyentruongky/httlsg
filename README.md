# Hệ Thống Quản Lý Hội Thánh Khu Vực TP.HCM (Church Management System)

A multi-tier **Church Governance, Department & Congregation Management System** built with **Bun**, **Vite**, **React 19**, **Tailwind CSS v4**, **TanStack Router & Query**, **Hono RPC**, and **Drizzle ORM** connected directly via `DATABASE_URL` (Supabase PostgreSQL).

## Multi-Level Hierarchy & Database Architecture

1. **Governance Levels (`governance_levels`):**
   - **Cấp 1 — Tổng Liên Hội / Ban Đại Diện TP.HCM** (Regional Executive Council)
   - **Cấp 2 — Khu Vực (KV I – KV VI)** (6 Administrative Zones covering 172 congregations & 42,103+ members)
   - **Cấp 3 — Chi Hội (110)** (Mother Churches — `Tự lập` & `Tự dưỡng`)
   - **Cấp 4 — Hội Nhánh (11) & Điểm Nhóm (51)** (Branch Churches & Fellowship Points linked to parent `Chi Hội`)
2. **Clergy & Leadership (`pastors` & `pastoral_assignments`):**
   - Deduplicated directory of 136+ pastors (`Mục sư`, `Mục sư Nhiệm chức`, `Truyền đạo`) with role flags for **Quản nhiệm** (Senior Pastor), **Kiêm nhiệm** (Concurrent Pastor), and **Đặc trách** (Special Assignment).
3. **Congregations (`churches`):**
   - All **172 records** from the 2026 TP.HCM dataset with both legacy administrative addresses (`PHƯỜNG/XÃ Cũ`) and post-2026 merger addresses (`ĐỊA CHỈ MỚI Sau sáp nhập 2026`), legal status (`Chính thức` / `Nội bộ`), autonomy tier (`TỰ LẬP` / `TỰ DƯỠNG`), and member counts.
4. **Departments & Committees (`departments` & `church_departments`):**
   - Standard church ministries (**Ban Thanh Tráng**, **Ban Thanh Niên**, **Ban Thiếu Nhi / Trường Chúa Nhật**, **Ban Tráng Niên**, **Ban Phụ Nữ**, **Ban Truyền Giảng**, **Ban Âm Nhạc & Thờ Phượng**, **Ban Tài Chánh & Xây Dựng**) tracked across management levels and local congregations.

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Locally Right Away (Zero-Config Pre-Seeded Mode)
```bash
bun run dev
```
- **Frontend (Vite):** http://localhost:5173
- **Backend API (Hono RPC):** http://localhost:3001/api/health

### 3. Push Schema & Seed Supabase PostgreSQL (`DATABASE_URL`)
```bash
cp .env.example .env
# Add your Supabase DATABASE_URL (port 6543) and DIRECT_URL (port 5432)
bun run db:push
bun run db:seed
```
The idempotent seed script (`src/db/seed.ts`) parses `src/db/seed-data.json` (all 172 records from your CSV) and populates `regions`, `governance_levels`, `pastors`, `churches` (with parent-child `Chi Hội` hierarchy), `pastoral_assignments`, and `departments`.
