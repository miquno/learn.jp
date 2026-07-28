import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../../src/generated/prisma/client";

// Eigener Client für die Importer: die Skripte laufen außerhalb von Next,
// brauchen kein Hot-Reload-Handling und sollen sich am Ende sauber trennen.
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
