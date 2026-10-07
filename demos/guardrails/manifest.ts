import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "guardrails",
  order: 40,
  status: "soon",
  title: "Two gates",
  hook: "Watch it refuse a Qatar ID, a jailbreak and an off-topic question, in under a second, without a human.",
  lesson: {
    name: "Samsung",
    year: "2023",
    line: "Engineers pasted source code and meeting notes into a public chatbot despite instructions not to. A policy without a technical control.",
  },
  tags: { capability: ["Guardrails", "Data loss prevention", "Prompt injection"], useCase: ["Internal assistant", "HR"], vertical: ["Any"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "The assistant" },
    { act: 4, title: "Four attempts" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "Input and output are both checked by code before and after the model. Blocked events are logged. The model never sees what it must not see, and the requester never sees what they must not see.",
};
