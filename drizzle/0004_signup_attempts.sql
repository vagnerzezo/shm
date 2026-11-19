CREATE TABLE "signup_attempts" (
	"seq" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "signup_attempts_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ip" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "signup_attempts_ip_index" ON "signup_attempts" USING btree ("ip");