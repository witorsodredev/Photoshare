import { randomBytes } from "node:crypto";

export function shareToken(): string {
  return randomBytes(12).toString("base64url");
}

export function safeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.length ? base.slice(0, 200) : "photo";
}

export function appBaseUrl(reqUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  try {
    const u = new URL(reqUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}
