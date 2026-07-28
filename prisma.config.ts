import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  // Ein Seed-Skript gibt es erst mit der Content-Pipeline (Phase 1) —
  // bis dahin würde `prisma migrate reset` sonst auf eine fehlende Datei laufen.
});
