import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./auth";

describe("session tokens", () => {
  it("round-trips a presenter session", async () => {
    const tok = await signSession({ role: "presenter", exp: Date.now() + 1000 }, "secret");
    expect(await verifySession(tok, "secret")).toMatchObject({ role: "presenter" });
  });
  it("rejects tampering and wrong secret", async () => {
    const tok = await signSession({ role: "viewer", exp: Date.now() + 1000 }, "secret");
    expect(await verifySession(tok + "x", "secret")).toBeNull();
    expect(await verifySession(tok, "other")).toBeNull();
    const sig = tok.split(".")[1];
    const forged = Buffer.from(JSON.stringify({ role: "presenter", exp: Date.now() + 1000 })).toString("base64url") + "." + sig;
    expect(await verifySession(forged, "secret")).toBeNull();
  });
  it("rejects expired", async () => {
    const tok = await signSession({ role: "viewer", exp: Date.now() - 1 }, "secret");
    expect(await verifySession(tok, "secret")).toBeNull();
  });
  it("rejects garbage", async () => {
    expect(await verifySession(undefined, "secret")).toBeNull();
    expect(await verifySession("nodot", "secret")).toBeNull();
  });
});
