import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "document-to-json",
  order: 70,
  status: "ready",
  title: "Paper in, record out",
  hook: "An invoice, an ID card and a handwritten delivery note become structured records, and code decides which ones are allowed downstream.",
  lesson: {
    name: "Straight-through processing",
    year: "Every back office",
    line: "Extraction is the easy part. The failures come from a wrong total or an expired document that nobody checked before it reached the ERP.",
  },
  tags: { capability: ["Vision", "Extraction", "Validation"], useCase: ["Accounts payable", "Onboarding", "Logistics"], vertical: ["Any", "Banking", "Construction"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "This morning's inbox" },
    { act: 4, title: "Extract, then validate" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "The model reads; code decides. Every field carries a confidence, every record passes deterministic checks, and downstream systems only ever receive validated records.",
};
