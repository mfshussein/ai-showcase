import { describe, it, expect } from "vitest";
import { createStageExtras } from "./stage-extras";

describe("stage extras", () => {
  it("remembers the recipient typed in the room and notifies subscribers", () => {
    const s = createStageExtras();
    let calls = 0;
    s.subscribe(() => calls++);
    s.setRecipient("guest@corp.example");
    expect(s.getRecipient()).toBe("guest@corp.example");
    expect(calls).toBe(1);
  });
  it("lets a send happen once per key", () => {
    const s = createStageExtras();
    expect(s.claimSend("run-1")).toBe(true);
    expect(s.claimSend("run-1")).toBe(false);
    expect(s.claimSend("run-2")).toBe(true);
  });
  it("collects extra evidence records with fresh ids", () => {
    const s = createStageExtras();
    s.addControl({ detector: "alert.email", policyId: "FIN-08", action: "skipped", detail: "Email not sent: SMTP_HOST not set" });
    expect(s.getControls()).toEqual([{ type: "control.event", t: 0, detector: "alert.email", policyId: "FIN-08", action: "skipped", detail: "Email not sent: SMTP_HOST not set", recordId: "CE-STAGE-1" }]);
  });
  it("clears controls and claims on reset, keeping the recipient", () => {
    const s = createStageExtras();
    s.setRecipient("a@b.co");
    s.claimSend("k");
    s.addControl({ detector: "d", policyId: "p", action: "a" });
    s.reset();
    expect(s.getControls()).toEqual([]);
    expect(s.claimSend("k")).toBe(true);
    expect(s.getRecipient()).toBe("a@b.co");
  });
});
