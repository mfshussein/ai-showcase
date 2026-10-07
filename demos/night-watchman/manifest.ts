import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "night-watchman",
  order: 10,
  status: "ready",
  title: "It works the night shift",
  hook: "Every night it reads every payment and every login, and it only messages you when something is wrong. Tonight, something is.",
  lesson: {
    name: "Duplicate and split payments",
    year: "Every audit",
    line: "Duplicate payments, invoices split under the approval limit and odd admin logins are found months later by auditors, after the money has left.",
  },
  tags: { capability: ["Agent", "Anomaly detection", "Alerts", "Arabic"], useCase: ["Accounts payable", "Internal audit", "Security"], vertical: ["Any", "Government", "Banking"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "Fourteen nights" },
    { act: 4, title: "Tonight's shift" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "Plain statistics find the problems, so the findings are exact and explainable. The model only writes the explanation, in English and Arabic. The report lands in an inbox before anyone is at their desk.",
};
