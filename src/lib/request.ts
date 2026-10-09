import "server-only";

/**
 * Client IP as seen by our reverse proxy. Caddy overwrites X-Forwarded-For
 * from untrusted clients, so the rightmost entry is the one it added and
 * can't be spoofed by the client.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

export function userAgent(req: Request): string | null {
  return req.headers.get("user-agent")?.slice(0, 300) ?? null;
}
