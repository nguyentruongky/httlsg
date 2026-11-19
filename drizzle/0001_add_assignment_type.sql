CREATE TABLE "administrative_wards" (
	"id" serial PRIMARY KEY NOT NULL,
	"stt" integer,
	"name" text NOT NULL,
	"province" text DEFAULT 'TP.HCM' NOT NULL,
	"area_km2" real,
	"population" integer,
	"has_church" boolean DEFAULT false NOT NULL,
	"region_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_delegates" (
	"id" serial PRIMARY KEY NOT NULL,
	"assembly_number" integer DEFAULT 49 NOT NULL,
	"delegate_category" text NOT NULL,
	"stt" integer NOT NULL,
	"title" text NOT NULL,
	"last_name" text,
	"first_name" text,
	"full_name" text NOT NULL,
	"birth_year" integer,
	"role" text,
	"church_id" integer,
	"pastor_id" integer,
	"raw_church_name" text,
	"province" text DEFAULT 'Tp. HCM' NOT NULL,
	"autonomy_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_personnel" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer,
	"region_id" integer,
	"raw_church_name" text,
	"full_name" text NOT NULL,
	"ministry_role" text DEFAULT 'Đặc trách Truyền giáo' NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "form" SET DEFAULT 'Chi hội';--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ALTER COLUMN "church_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "ward_id" integer;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "old_district" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "regular_attendance_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ADD COLUMN "assignment_type" text DEFAULT 'church' NOT NULL;--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ADD COLUMN "work_name" text;--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ADD COLUMN "raw_assignment_text" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "chuc_vu" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "chuc_danh" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "nam_sinh" integer;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "ten_nhiem_so" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "dia_chi" text;--> statement-breakpoint
ALTER TABLE "pastors" ADD COLUMN "nhu_danh" text;--> statement-breakpoint
ALTER TABLE "administrative_wards" ADD CONSTRAINT "administrative_wards_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_delegates" ADD CONSTRAINT "assembly_delegates_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_delegates" ADD CONSTRAINT "assembly_delegates_pastor_id_pastors_id_fk" FOREIGN KEY ("pastor_id") REFERENCES "public"."pastors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_personnel" ADD CONSTRAINT "church_personnel_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_personnel" ADD CONSTRAINT "church_personnel_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "churches" ADD CONSTRAINT "churches_ward_id_administrative_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."administrative_wards"("id") ON DELETE set null ON UPDATE no action;