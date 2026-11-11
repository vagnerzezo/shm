import { defineConfig } from "drizzle-kit";

// Migrações usam a conexão direta (sem pooler). O Next carrega o .env sozinho; o drizzle-kit não.
process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/_lib/db-schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
});
