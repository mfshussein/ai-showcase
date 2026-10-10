import { describe, expect, it } from "vitest";
import { currentStep, defaultResponse, gateState, initialState, respond, strength, type DiscoveryState } from "./engine";
import { invoiceApprovals as flow } from "./flows/invoice-approvals";

function walk(pick: (stepId: string) => number | undefined = () => undefined): DiscoveryState {
  let s = initialState(flow);
  for (let step = currentStep(flow, s); step; step = currentStep(flow, s)) {
    const choice = pick(step.id);
    s = respond(flow, s, choice !== undefined ? { kind: "choice", index: choice } : defaultResponse(step));
  }
  return s;
}

describe("discovery engine", () => {
  it("walks the suggested path to the end card with every checklist item covered", () => {
    const s = walk();
    expect(s.exchanges.at(-1)?.stepId).toBe("end");
    expect(strength(flow, s)).toBe(100);
    expect(s.stage).toBe("outputs");
    // This flow has one pain point, so it never passes through prioritisation.
    expect(s.visited).not.toContain("prioritise");
  });

  it("confirms the pain point only once it is quantified, with the client's figures", () => {
    let s = initialState(flow);
    while (currentStep(flow, s)?.id !== "quantify") s = respond(flow, s, defaultResponse(currentStep(flow, s)!));
    expect(s.pain.status).toBe("candidate");
    s = respond(flow, s, defaultResponse(currentStep(flow, s)!));
    expect(s.pain.status).toBe("confirmed");
    // 1,850 × 12 × 9 / 60 × 95 = 316,350 plus 600,000 × 12 × 2% × 60% = 86,400.
    expect(s.pain.impact?.total).toBe(402_750);
  });

  it("recalculates when the client corrects a figure", () => {
    let s = initialState(flow);
    while (currentStep(flow, s)?.id !== "quantify") s = respond(flow, s, defaultResponse(currentStep(flow, s)!));
    const d = defaultResponse(currentStep(flow, s)!);
    if (d.kind !== "roi") throw new Error("expected roi");
    s = respond(flow, s, { kind: "roi", values: { ...d.values, minutes: 6 } });
    expect(s.pain.impact?.total).toBe(210_900 + 86_400);
  });

  it("follows a fork and rejoins", () => {
    const s = walk((id) => (id === "who" ? 1 : undefined));
    const ids = s.exchanges.map((e) => e.stepId);
    expect(ids).toContain("supplier-impact");
    expect(ids).not.toContain("finance-load");
    expect(ids).toContain("process");
  });

  it("records rungs below the solvable layer as obstacles, not as the target", () => {
    const s = walk();
    expect(s.notes.find((n) => n.tag === "root-cause")?.text).toMatch(/approval workflow was never configured/);
    expect(s.obstacles.map((o) => o.text)).toContain("The ERP rollout ran out of budget, and nobody has owned finance systems since.");
  });

  it("keeps hypothesis history when an answer kills or strengthens a shape", () => {
    const s = walk();
    const erp = s.hypotheses.find((h) => h.id === "h-erp")!;
    expect(erp.status).toBe("strengthened");
    expect(erp.history.map((h) => h.status)).toEqual(["open", "strengthened"]);
    expect(s.hypotheses.find((h) => h.id === "h-nudge")?.status).toBe("killed");
  });

  it("leaves a hard gate open until it is satisfied or deferred", () => {
    let s = initialState(flow);
    while (currentStep(flow, s)?.id !== "gates") s = respond(flow, s, defaultResponse(currentStep(flow, s)!));
    const step = currentStep(flow, s)!;
    if (step.input.kind !== "gates") throw new Error("expected gates");
    const g5 = step.input.gates.find((g) => g.id === "G5")!;
    const g2 = step.input.gates.find((g) => g.id === "G2")!;
    expect(gateState(g5, s)).toBe("open");
    expect(gateState(g2, s)).toBe("satisfied");
    expect(gateState(g5, s, ["G5"])).toBe("deferred");
  });

  it("refuses an answer of the wrong kind", () => {
    expect(() => respond(flow, initialState(flow), { kind: "choice", index: 0 })).toThrow(/expects text/);
  });
});
