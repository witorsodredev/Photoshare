// Unlocks an account locked by too many wrong passwords — the way back in
// when the locked account is the admin's. Usage:
//   docker compose exec app node prisma/unlock-user.mjs user@example.com
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("usage: node prisma/unlock-user.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const { count } = await prisma.user.updateMany({
    where: { email },
    data: { failedLogins: 0, lockedAt: null },
  });
  console.log(count ? `[unlock] ${email} unlocked` : `[unlock] no user ${email}`);
  process.exitCode = count ? 0 : 1;
} finally {
  await prisma.$disconnect();
}
