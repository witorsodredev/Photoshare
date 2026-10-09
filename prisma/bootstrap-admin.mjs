// Ensures an existing install has an admin: if there are users but none is
// ADMIN (e.g. accounts created before roles existed), the oldest account is
// promoted. A fresh install is left alone — the first sign-up becomes admin.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins === 0) {
    const oldest = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (oldest) {
      await prisma.user.update({
        where: { id: oldest.id },
        data: { role: "ADMIN", status: "ACTIVE", storageQuotaMb: null },
      });
      console.log(`[bootstrap] promoted ${oldest.email} to admin`);
    }
  }
} finally {
  await prisma.$disconnect();
}
