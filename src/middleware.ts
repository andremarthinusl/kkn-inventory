import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const isLoggedIn = AUTH_COOKIE_NAMES.some(
    (name) => !!req.cookies.get(name)?.value
  );

  const pathname = nextUrl.pathname;
  const isOnAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/items") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/locations") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/loans") ||
    pathname.startsWith("/borrowed-items") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname === "/";

  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isLoggedIn && isOnDashboard) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|avatars|iconkkn).*)",
  ],
};