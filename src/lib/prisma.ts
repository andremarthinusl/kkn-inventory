import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Use transaction pooler (DATABASE_URL) on Vercel/serverless
  // Use session pooler (DIRECT_URL) for local dev
  const isVercel = !!process.env.VERCEL;
  const connectionString = isVercel
    ? process.env.DATABASE_URL
    : (process.env.DIRECT_URL || process.env.DATABASE_URL);

  if (!connectionString) {
    throw new Error("Database URL not set");
  }

  // Remove pgbouncer=true query param — PrismaPg adapter doesn't support it
  const cleanUrl = connectionString
    .replace("?pgbouncer=true", "")
    .replace("&pgbouncer=true", "");

  // Limit connections for serverless environment
  const url = isVercel
    ? cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "connection_limit=5"
    : cleanUrl;

  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}