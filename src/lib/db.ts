import { PrismaClient } from '@/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const rawUrl = process.env.DATABASE_URL || "";
const isSqlite = rawUrl.startsWith("file:") || rawUrl.endsWith(".db") || (!rawUrl.startsWith("postgres:") && !rawUrl.startsWith("postgresql:") && rawUrl !== "");
let databaseUrl = isSqlite ? rawUrl : 'dev.db';

// Strip the 'file:' prefix if it exists, because better-sqlite3 expects a raw file path, not a URL.
if (databaseUrl.startsWith("file:")) {
  databaseUrl = databaseUrl.substring(5);
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };