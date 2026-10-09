import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { resetPasswordLink } from "@/lib/emails";

export const runtime = "nodejs";

/**
 * Admin-issued password reset link (valid 1h, single use). The way to recover
 * an account when no SMTP is configured: the admin sends it to the user.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ link: await resetPasswordLink(req, user.id) });
}
