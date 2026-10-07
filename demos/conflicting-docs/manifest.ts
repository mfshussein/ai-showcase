import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "conflicting-docs",
  order: 20,
  status: "soon",
  title: "The Air Canada test",
  hook: "Your chatbot will cite whichever version of the policy it finds first. Ours refuses to load two that disagree.",
  lesson: {
    name: "Moffatt v. Air Canada",
    year: "Feb 2024",
    line: "A chatbot quoted a bereavement refund rule that contradicted the policy published elsewhere on the airline's own website. The tribunal held the airline liable.",
  },
  tags: { capability: ["RAG", "Data quality", "Ingestion gate"], useCase: ["Customer service", "Policy Q&A"], vertical: ["Aviation", "Any"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "Three files" },
    { act: 3, title: "Without the harness" },
    { act: 4, title: "With the harness" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "Duplicates and conflicting versions are caught at the gate, before the model ever answers. This is the control that would have stopped Air Canada.",
};
