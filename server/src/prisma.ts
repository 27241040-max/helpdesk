import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { getRequiredEnv } from "./config";
import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: getRequiredEnv("DATABASE_URL"),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
