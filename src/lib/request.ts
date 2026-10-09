import "server-only";

/**
 * Visitor IP. In production the app is only reachable through Caddy, which
 * always overwrites X-Real-IP with the resolved client address (the real
 * visitor even behind the Cloudflare proxy). The X-Forwarded-For fallback
 * covers running without Caddy (npm run dev).
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  return "unknown";
}

export function userAgent(req: Request): string | null {
  return req.headers.get("user-agent")?.slice(0, 300) ?? null;
}
