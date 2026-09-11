import { PrismaClient } from '@/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
let filePath = rawUrl.startsWith('file:') ? rawUrl.substring(5) : rawUrl;
if (filePath.startsWith('./')) {
  filePath = filePath.substring(2);
}

const adapter = new PrismaBetterSqlite3({ url: filePath });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };