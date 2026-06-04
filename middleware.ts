import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { RESERVED_SLUGS } from "@/lib/constants";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/invite/")) return true;
  if (pathname.startsWith("/i/")) return true;
  return false;
}

function isOrgRoute(pathname: string): boolean {
  const segment = pathname.split("/")[1];
  if (!segment) return false;
  if (RESERVED_SLUGS.has(segment)) return false;
  return true;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    if (req.auth && AUTH_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/organizations", req.url));
    }
    return NextResponse.next();
  }

  if (!req.auth) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/organizations") {
    return NextResponse.next();
  }

  if (isOrgRoute(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
