CREATE TABLE "login_attempts" (
	"seq" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_attempts_email_index" ON "login_attempts" USING btree ("email");