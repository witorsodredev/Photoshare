import "server-only";
import { NextResponse } from "next/server";

// Input validation for auth forms. Prisma already parameterizes every query
// and React escapes output, so this is the strict allowlist layer on top:
// reject anything that isn't plainly a name / e-mail / password.

const MAX_BODY_BYTES = 8 * 1024;

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
// bcrypt only uses the first 72 bytes; longer passwords would silently
// share a hash with their 72-byte prefix, so refuse them instead.
export const PASSWORD_MAX_BYTES = 72;

// Letters (any script), combining marks, digits, space and . ' - &
const NAME_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'&-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Control chars, zero-width chars and bidi overrides (used to spoof names).
const INVISIBLE_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

type Result<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function fail(error: string, status = 400): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/** Parses a small JSON object body; rejects other content types and big payloads. */
export async function readJsonBody(req: Request): Promise<Result<Record<string, unknown>>> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return fail("Formato de requisição inválido.", 415);
  }
  // Refuse early when the size is declared; the check below still covers
  // chunked bodies that don't declare one.
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return fail("Requisição grande demais.", 413);
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    return fail("Requisição grande demais.", 413);
  }
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ok: true, value: body };
    }
  } catch {}
  return fail("Formato de requisição inválido.");
}

export function validateName(raw: unknown): Result<string> {
  if (typeof raw !== "string") return fail("Informe seu nome.");
  if (INVISIBLE_RE.test(raw)) return fail("O nome contém caracteres não permitidos.");
  const name = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > NAME_MAX) {
    return fail(`O nome deve ter entre 2 e ${NAME_MAX} caracteres.`);
  }
  if (!NAME_RE.test(name)) {
    return fail("O nome só pode conter letras, números, espaços e . ' - &");
  }
  return { ok: true, value: name };
}

export function validateEmail(raw: unknown): Result<string> {
  if (typeof raw !== "string") return fail("Informe um e-mail válido.");
  const email = raw.trim().toLowerCase();
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email) || email.includes("..")) {
    return fail("Informe um e-mail válido.");
  }
  return { ok: true, value: email };
}

export function validateNewPassword(raw: unknown): Result<string> {
  if (typeof raw !== "string") return fail("Informe uma senha.");
  if (raw.length < PASSWORD_MIN) {
    return fail(`A senha deve ter ao menos ${PASSWORD_MIN} caracteres.`);
  }
  if (Buffer.byteLength(raw) > PASSWORD_MAX_BYTES) {
    return fail(`A senha deve ter no máximo ${PASSWORD_MAX_BYTES} caracteres.`);
  }
  if (INVISIBLE_RE.test(raw)) return fail("A senha contém caracteres não permitidos.");
  return { ok: true, value: raw };
}
