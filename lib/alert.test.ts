import { describe, it, expect } from "vitest";
import { maskAddress, isEmail, baseUrl, rewriteLinks, createRateLimit, handleAlert } from "./alert";

describe("maskAddress", () => {
  it("hides everything but the top-level domain", () => {
    expect(maskAddress("someone@gmail.com")).toBe("*********.com");
    expect(maskAddress("")).toBe("");
  });
});

describe("isEmail", () => {
  it("accepts ordinary addresses and rejects junk or header injection", () => {
    expect(isEmail("a.b+c@example.co.qa")).toBe(true);
    expect(isEmail("not an email")).toBe(false);
    expect(isEmail("a@b.com\nBcc: x@y.com")).toBe(false);
    expect(isEmail("a@b.com, c@d.com")).toBe(false);
  });
});

describe("baseUrl", () => {
  it("prefers PUBLIC_BASE_URL, then Vercel's production URL, then localhost", () => {
    expect(baseUrl({ PUBLIC_BASE_URL: "https://show.example/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://show.example");
    expect(baseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ai-showcase.vercel.app" })).toBe("https://ai-showcase.vercel.app");
    expect(baseUrl({})).toBe("http://localhost:3000");
  });
});

describe("rewriteLinks", () => {
  it("points demo links recorded on another host at the current base", () => {
    expect(rewriteLinks('see http://localhost:3000/demo/night-watchman and <a href="http://localhost:3000/demo/night-watchman">', "https://s.example"))
      .toBe('see https://s.example/demo/night-watchman and <a href="https://s.example/demo/night-watchman">');
  });
});

describe("createRateLimit", () => {
  it("allows a few sends per window, then refuses", () => {
    let t = 0;
    const ok = createRateLimit(2, 60_000, () => t);
    expect([ok(), ok(), ok()]).toEqual([true, true, false]);
    t = 60_001;
    expect(ok()).toBe(true);
  });
});

describe("handleAlert", () => {
  const report = { subject: "S", text: "T http://localhost:3000/demo/night-watchman", html: "<p>H</p>" };
  const env = { ALERT_EMAIL_TO: "owner@gmail.com", SMTP_HOST: "h", PUBLIC_BASE_URL: "https://s.example" };
  const sent: { to?: string; text: string }[] = [];
  const send = async (m: { text: string }, e: Record<string, string | undefined>) => { sent.push({ to: e.ALERT_EMAIL_TO, text: m.text }); return { sent: true }; };
  const base = { report, env, send, allow: () => true };

  it("refuses anyone who is not a presenter", async () => {
    expect(await handleAlert({ ...base, role: "viewer", to: undefined })).toMatchObject({ status: 403 });
  });
  it("sends to the default address when none is given, and only returns it masked", async () => {
    const r = await handleAlert({ ...base, role: "presenter", to: undefined });
    expect(r).toEqual({ status: 200, body: { sent: true, to: "*********.com" } });
    expect(sent.at(-1)).toEqual({ to: "owner@gmail.com", text: "T https://s.example/demo/night-watchman" });
  });
  it("sends to the address typed in the room, and echoes it back in full", async () => {
    const r = await handleAlert({ ...base, role: "presenter", to: " guest@corp.example " });
    expect(r.body).toEqual({ sent: true, to: "guest@corp.example" });
    expect(sent.at(-1)?.to).toBe("guest@corp.example");
  });
  it("rejects an invalid address", async () => {
    expect(await handleAlert({ ...base, role: "presenter", to: "nope" })).toMatchObject({ status: 400 });
  });
  it("refuses when rate limited", async () => {
    expect(await handleAlert({ ...base, role: "presenter", to: undefined, allow: () => false })).toMatchObject({ status: 429 });
  });
  it("reports a missing report or unconfigured SMTP without sending", async () => {
    expect(await handleAlert({ ...base, role: "presenter", to: undefined, report: null })).toMatchObject({ status: 404 });
    const r = await handleAlert({ ...base, role: "presenter", to: undefined, env: { ALERT_EMAIL_TO: "owner@gmail.com" }, send: async () => ({ sent: false, reason: "SMTP_HOST not set" }) });
    expect(r).toEqual({ status: 200, body: { sent: false, reason: "SMTP_HOST not set", to: "*********.com" } });
  });
});
