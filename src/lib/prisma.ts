import { mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_DATABASE_URL = "file:./data/cliphouse.db";
const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

ensureSqliteDirectory(databaseUrl);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function ensureSqliteDirectory(url: string) {
  if (!url.startsWith("file:")) return;

  const rawPath = url.replace(/^file:/, "");
  if (!rawPath || rawPath === ":memory:") return;

  const relativePath = rawPath.replace(/^\.\//, "");
  const databasePath = path.isAbsolute(rawPath) ? rawPath : path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  mkdirSync(path.dirname(databasePath), { recursive: true });
}
