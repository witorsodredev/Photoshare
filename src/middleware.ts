import { NextRequest, NextResponse } from "next/server";

// Lightweight gate: only checks that a session cookie is present so we can
// redirect to /login early. Real verification happens in the Node runtime
// (server components / route handlers) via lib/auth.
export function middleware(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get("ps_session")?.value);
  if (hasCookie) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/workspace/:path*"],
};
