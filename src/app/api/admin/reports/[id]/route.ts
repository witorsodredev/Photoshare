import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Handles a report:
 *  - "takedown": blocks the album (public link stops working) and resolves
 *  - "dismiss":  closes the report without action
 *  - "reopen":   puts it back in the queue
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const action = body.value.action;

  if (action === "takedown") {
    if (report.albumId) {
      await prisma.album.update({
        where: { id: report.albumId },
        data: { blockedAt: new Date(), blockedReason: report.reason, isPublic: false },
      });
    }
    await prisma.report.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  } else if (action === "dismiss") {
    await prisma.report.update({
      where: { id },
      data: { status: "DISMISSED", resolvedAt: new Date() },
    });
  } else if (action === "reopen") {
    await prisma.report.update({
      where: { id },
      data: { status: "OPEN", resolvedAt: null },
    });
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
