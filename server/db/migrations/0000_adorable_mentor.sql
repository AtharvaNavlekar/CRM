CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"request_id" text NOT NULL,
	"event_type" text NOT NULL,
	"outcome" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"actor_tenant_id" text,
	"acting_as_user_id" text,
	"impersonation_session_id" text,
	"tenant_id" text,
	"resource_type" text,
	"resource_id" text,
	"action" text,
	"reason" text,
	"ip" text,
	"user_agent" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"lead_id" text NOT NULL,
	"lead_name" text NOT NULL,
	"lead_phone" text NOT NULL,
	"rep_id" text NOT NULL,
	"rep_name" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"outcome" text NOT NULL,
	"notes" text NOT NULL,
	"recording_simulated" boolean
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"call_cap_max_attempts" integer NOT NULL,
	"call_cap_days" integer NOT NULL,
	"whats_app_cap_max_attempts" integer NOT NULL,
	"whats_app_cap_days" integer NOT NULL,
	"sms_cap_max_attempts" integer NOT NULL,
	"sms_cap_days" integer NOT NULL,
	"quiet_hours_enabled" boolean NOT NULL,
	"quiet_hours_start" text NOT NULL,
	"quiet_hours_end" text NOT NULL,
	"enforce_timezone" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"dnc_enforcement" boolean DEFAULT true NOT NULL,
	"opt_out_enforcement" boolean DEFAULT true NOT NULL,
	"pause_enforcement" boolean DEFAULT true NOT NULL,
	"preferred_channel_enforcement" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb,
	"required" boolean
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"enabled_globally" boolean NOT NULL,
	"enabled_for_tenant_ids" jsonb,
	"rollout_percentage" integer
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_user_id" text NOT NULL,
	"platform_user_name" text NOT NULL,
	"platform_user_role" text NOT NULL,
	"target_tenant_id" text NOT NULL,
	"target_tenant_name" text NOT NULL,
	"target_user_id" text NOT NULL,
	"target_user_name" text NOT NULL,
	"target_user_role" text NOT NULL,
	"reason" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"active" boolean NOT NULL,
	"ip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"acting_as_user_id" text,
	"queue_job_id" text,
	"progress" integer DEFAULT 0,
	"result_metadata" jsonb,
	"error_details" jsonb,
	"created_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"source" text NOT NULL,
	"stage" text NOT NULL,
	"assigned_rep_id" text NOT NULL,
	"assigned_rep_name" text NOT NULL,
	"team_id" text,
	"created_date" timestamp NOT NULL,
	"notes" text NOT NULL,
	"industry" text,
	"value" real,
	"callback_reminder" timestamp,
	"email" text,
	"fatigue_status" text,
	"contact_attempts_7d" jsonb,
	"blocked_reason" text,
	"preferences" jsonb,
	"declared_call_reason" text,
	"assigned_campaign" text,
	"version" integer DEFAULT 1,
	"updated_at" timestamp,
	"custom_fields" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"lead_id" text NOT NULL,
	"direction" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"delivery_status" text NOT NULL,
	"retry_count" integer
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"color" text NOT NULL,
	"dot_bg" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"actions" jsonb NOT NULL,
	"requires_approval" jsonb,
	"can_view_all_leads" boolean,
	"can_export_data" boolean,
	"can_manage_templates" boolean
);
--> statement-breakpoint
CREATE TABLE "security_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp NOT NULL,
	"type" text,
	"title" text,
	"description" text,
	"severity" text NOT NULL,
	"tenant_id" text,
	"tenant_name" text,
	"user_id" text,
	"user_name" text,
	"ip" text,
	"source_ip" text,
	"details" text,
	"path" text,
	"resolved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text,
	"token_family_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoke_reason" text,
	"created_ip" text,
	"last_used_ip" text,
	"created_user_agent" text,
	"last_used_user_agent" text
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"tier" text,
	"primary_contact_name" text,
	"primary_contact_email" text,
	"lead_cap" integer,
	"user_cap" integer,
	"timezone" text DEFAULT 'Asia/Kolkata'
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sender" text NOT NULL,
	"sender_role" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"created_date" timestamp NOT NULL,
	"sla_due_time" timestamp NOT NULL,
	"priority" text NOT NULL,
	"lead_id" text,
	"lead_name" text,
	"assigned_rep_id" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"is_platform_staff" boolean DEFAULT false,
	"password_hash" text,
	"avatar" text,
	"title" text,
	"phone" text,
	"team_id" text,
	"manages_team_ids" jsonb
);
--> statement-breakpoint
CREATE INDEX "idx_audit_tenant_time" ON "audit_logs" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_actor_time" ON "audit_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_acting_as_time" ON "audit_logs" USING btree ("acting_as_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_event_time" ON "audit_logs" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_request" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_token_family_id" ON "sessions" USING btree ("token_family_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_refresh_token_hash" ON "sessions" USING btree ("refresh_token_hash");