import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession, type Session } from "./auth";

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return verifySession(c.get(COOKIE_NAME)?.value, process.env.COOKIE_SECRET ?? "");
}

export async function requirePresenter(): Promise<boolean> {
  return (await getSession())?.role === "presenter";
}
