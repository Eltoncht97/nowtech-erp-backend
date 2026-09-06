import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Membership role migration (PostgreSQL)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([false, true])(
    'applies without defaults and preserves existing rows (populated=%s)',
    async (populated) => {
      const sql = readFileSync(
        join(
          __dirname,
          '../prisma/migrations/20260905000000_membership_role/migration.sql',
        ),
        'utf8',
      );
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'CREATE SCHEMA membership_role_migration_test',
        );
        await tx.$executeRawUnsafe(
          'SET LOCAL search_path TO membership_role_migration_test',
        );
        await tx.$executeRawUnsafe(
          'CREATE TABLE "Membership" (id TEXT PRIMARY KEY)',
        );
        if (populated)
          await tx.$executeRawUnsafe(
            `INSERT INTO "Membership" (id) VALUES ('existing')`,
          );
        for (const statement of sql.split(';').filter((part) => part.trim())) {
          await tx.$executeRawUnsafe(statement);
        }
        const rows = await tx.$queryRaw<
          { id: string; role: string }[]
        >`SELECT id, role::text FROM "Membership"`;
        expect(rows).toEqual(
          populated ? [{ id: 'existing', role: 'OWNER' }] : [],
        );
        const columns = await tx.$queryRaw<
          { is_nullable: string; column_default: string | null }[]
        >`
        SELECT is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'membership_role_migration_test' AND table_name = 'Membership' AND column_name = 'role'`;
        expect(columns).toEqual([{ is_nullable: 'NO', column_default: null }]);
        await tx.$executeRawUnsafe(
          'DROP SCHEMA membership_role_migration_test CASCADE',
        );
      });
    },
  );
});
