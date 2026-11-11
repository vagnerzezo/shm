CREATE TABLE "closures" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "closures_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"start" date NOT NULL,
	"end" date NOT NULL,
	"professional" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "dispatches_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"customer_id" text NOT NULL,
	"channel" text NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"last_visit_id" text NOT NULL,
	"last_visit_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" text NOT NULL,
	"template_id" text,
	"template_name" text,
	"subject" text,
	"body" text,
	"reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "messages_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"from" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "password_resets_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"used_at" bigint
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "professionals_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text PRIMARY KEY NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "reservations_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"service_id" text NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"note" text,
	"attendance" text,
	"price_cents" integer,
	"created_by" text,
	"professional" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "rules_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"days_after" integer NOT NULL,
	"template_id" text,
	"active" boolean NOT NULL,
	"active_since" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "services_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"professional" text,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "sessions_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "templates_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"active" boolean NOT NULL,
	"is_default" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "users_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"role" text,
	"consent" jsonb,
	"admin_note" text,
	"disabled_at" timestamp with time zone,
	"unsubscribe_token" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_unsubscribeToken_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispatches_customer_id_index" ON "dispatches" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "dispatches_status_index" ON "dispatches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_customer_id_index" ON "messages" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservations_date_index" ON "reservations" USING btree ("date");--> statement-breakpoint
CREATE INDEX "reservations_user_id_index" ON "reservations" USING btree ("user_id");