import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../../src/generated/prisma/client";

// Dedicated client for the importers: the scripts run outside Next, need no
// hot-reload handling and should disconnect cleanly at the end.
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
