#!/usr/bin/env ts-node
/**
 * Promote a registered user to admin (or demote them).
 *
 * Usage:
 *   npx ts-node scripts/promote-admin.ts <email>           # promote
 *   npx ts-node scripts/promote-admin.ts <email> --revoke  # demote
 *
 * Idempotent. Refuses to operate on a non-existent user (no auto-create —
 * admins must register through the normal /auth/register flow first, then
 * be promoted; never minted directly via CLI).
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const revoke = args.includes('--revoke');

  if (!email) {
    console.error('Usage: promote-admin.ts <email> [--revoke]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`User ${email} not found. Register them first via /api/auth/register.`);
      process.exit(2);
    }
    if (user.isAdmin === !revoke) {
      console.log(`No change — ${email} is already isAdmin=${user.isAdmin}`);
      return;
    }
    const updated = await prisma.user.update({
      where: { email },
      data: { isAdmin: !revoke },
      select: { email: true, isAdmin: true },
    });
    console.log(`${updated.email}: isAdmin=${updated.isAdmin}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
