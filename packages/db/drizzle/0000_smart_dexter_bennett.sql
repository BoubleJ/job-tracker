CREATE TYPE "public"."apply_policy" AS ENUM('allowed', 'not_allowed', 'conditional', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_category" AS ENUM('frontend', 'backend', 'fullstack', 'mobile', 'devops', 'data_ai', 'qa', 'etc_dev');--> statement-breakpoint
CREATE TYPE "public"."job_posting_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."scrape_strategy" AS ENUM('greeting', 'ninehire', 'lever', 'greenhouse', 'llm');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('applied', 'document_passed', 'document_rejected', 'assignment', 'interview_1', 'interview_1_passed', 'interview_2', 'final_passed', 'rejected', 'offer', 'withdrawn');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage" "stage" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"gmail_message_id" text,
	"summary" text,
	"confidence" real,
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_posting_id" uuid,
	"position" text NOT NULL,
	"applied_at" date NOT NULL,
	"current_stage" "stage" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"careers_url" text NOT NULL,
	"scrape_strategy" "scrape_strategy" NOT NULL,
	"scrape_config" jsonb NOT NULL,
	"reapply_policy" "apply_policy" DEFAULT 'unknown' NOT NULL,
	"duplicate_apply_policy" "apply_policy" DEFAULT 'unknown' NOT NULL,
	"policy_note" text,
	"policy_source_url" text,
	"policy_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_sync_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"history_id" text NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "job_category" NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"deadline" date,
	"content_hash" text NOT NULL,
	"status" "job_posting_status" DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_postings_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "processed_messages" (
	"gmail_message_id" text PRIMARY KEY NOT NULL,
	"is_recruiting_related" boolean NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;