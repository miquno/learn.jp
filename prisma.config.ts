import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  // No seed script: content comes from scripts/import/ instead, so
  // `prisma migrate reset` must not point at a file that doesn't exist.
});
