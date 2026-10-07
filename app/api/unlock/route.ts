import { signSession, COOKIE_NAME } from "@/lib/auth";

const THIRTY_DAYS_S = 30 * 24 * 3600;

async function readBody(req: Request): Promise<{ password?: string; next?: string }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("json")) return (await req.json().catch(() => ({}))) as { password?: string; next?: string };
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  return { password: String(form.get("password") ?? ""), next: String(form.get("next") ?? "") };
}

function roleFor(password: string | undefined): "viewer" | "presenter" | null {
  if (!password) return null;
  const presenter = process.env.PRESENTER_PASSWORD;
  const viewer = process.env.VIEWER_PASSWORD;
  if (presenter && password === presenter) return "presenter";
  if (viewer && password === viewer) return "viewer";
  return null;
}

export async function POST(req: Request) {
  const body = await readBody(req);
  const next = body.next && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : "/";
  const role = roleFor(body.password);
  if (!role) {
    return new Response(null, { status: 303, headers: { location: `/unlock?error=1&next=${encodeURIComponent(next)}` } });
  }
  const token = await signSession({ role, exp: Date.now() + THIRTY_DAYS_S * 1000 }, process.env.COOKIE_SECRET ?? "");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      location: next,
      "set-cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${THIRTY_DAYS_S}${secure}`,
    },
  });
}
