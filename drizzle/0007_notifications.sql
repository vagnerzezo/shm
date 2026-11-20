CREATE TABLE "notifications" (
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "notifications_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor_id" text,
	"professional" text,
	"customer_id" text,
	"reservation_id" text,
	"date" date,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notifications_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "notifications_at_index" ON "notifications" USING btree ("at");