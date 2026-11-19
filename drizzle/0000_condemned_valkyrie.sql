CREATE TABLE "church_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"leader_name" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"meeting_schedule" text DEFAULT 'Chúa Nhật · 10:30' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" serial PRIMARY KEY NOT NULL,
	"stt" integer NOT NULL,
	"code" text NOT NULL,
	"form" text DEFAULT 'Chi Hội' NOT NULL,
	"legal_type" text DEFAULT 'Chính thức' NOT NULL,
	"autonomy" text,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"parent_church_name" text,
	"parent_church_id" integer,
	"region_id" integer NOT NULL,
	"founded_year" integer,
	"old_ward" text,
	"old_address" text,
	"new_address" text,
	"new_ward" text,
	"is_in_hcm" boolean DEFAULT true NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "churches_stt_unique" UNIQUE("stt"),
	CONSTRAINT "churches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"level_scope" text NOT NULL,
	"head_name" text NOT NULL,
	"head_title" text NOT NULL,
	"active_units_count" integer DEFAULT 0 NOT NULL,
	"total_members_count" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "governance_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"permissions_summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "governance_levels_tier_unique" UNIQUE("tier"),
	CONSTRAINT "governance_levels_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pastoral_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"pastor_id" integer NOT NULL,
	"role" text DEFAULT 'Quản nhiệm' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pastors" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"title" text DEFAULT 'Mục sư' NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"area_description" text NOT NULL,
	"coordinator_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "church_departments" ADD CONSTRAINT "church_departments_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_departments" ADD CONSTRAINT "church_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "churches" ADD CONSTRAINT "churches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ADD CONSTRAINT "pastoral_assignments_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastoral_assignments" ADD CONSTRAINT "pastoral_assignments_pastor_id_pastors_id_fk" FOREIGN KEY ("pastor_id") REFERENCES "public"."pastors"("id") ON DELETE cascade ON UPDATE no action;