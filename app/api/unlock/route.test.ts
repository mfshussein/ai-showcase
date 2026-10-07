import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";

beforeEach(() => {
  process.env.VIEWER_PASSWORD = "view";
  process.env.PRESENTER_PASSWORD = "present";
  process.env.COOKIE_SECRET = "s";
});

function jsonReq(password: string) {
  return new Request("http://localhost/api/unlock", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, next: "/demo/x" }),
  });
}
function formReq(password: string, next = "/demo/x") {
  const body = new URLSearchParams({ password, next });
  return new Request("http://localhost/api/unlock", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body,
  });
}

describe("POST /api/unlock", () => {
  it("sets a cookie for the viewer password and redirects to next", async () => {
    const res = await POST(jsonReq("view"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/demo/x");
    expect(res.headers.get("set-cookie")).toMatch(/sc_session=/);
  });
  it("accepts a form post and grants presenter for the presenter password", async () => {
    const res = await POST(formReq("present"));
    expect(res.headers.get("set-cookie")).toMatch(/sc_session=/);
    expect(res.headers.get("location")).toBe("/demo/x");
  });
  it("wrong password: no cookie, generic redirect back to unlock", async () => {
    const res = await POST(jsonReq("nope"));
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("location")).toBe("/unlock?error=1&next=%2Fdemo%2Fx");
  });
  it("empty password never matches an unset env password", async () => {
    delete process.env.PRESENTER_PASSWORD;
    const res = await POST(jsonReq(""));
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("ignores an external next URL", async () => {
    const res = await POST(formReq("view", "https://evil.example/x"));
    expect(res.headers.get("location")).toBe("/");
  });
});
