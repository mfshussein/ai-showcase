import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const session = await verifySession(req.cookies.get(COOKIE_NAME)?.value, process.env.COOKIE_SECRET ?? "");
  if (session) return NextResponse.next();
  const url = new URL("/unlock", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt)$).*)"],
};
