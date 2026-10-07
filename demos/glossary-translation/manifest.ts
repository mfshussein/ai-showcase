import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "glossary-translation",
  order: 80,
  status: "soon",
  title: "Say it exactly this way",
  hook: "A fluent translation that renames your products and regulators is a compliance problem. Lock the glossary and count every term.",
  lesson: {
    name: "Arabic-first teams",
    year: "Every launch",
    line: "Machine translation reads well and quietly renames the Sukuk, the product and the regulator. Legal finds it after the notice is published.",
  },
  tags: { capability: ["Translation", "Arabic", "Terminology control"], useCase: ["Customer notices", "Product documents"], vertical: ["Islamic banking", "Government"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "The notice and the glossary" },
    { act: 3, title: "Without the glossary" },
    { act: 4, title: "With the glossary" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "Terminology is a control, not a style guide: every house term is checked in code, the model is re-asked once if it slips, and anything still off goes to a reviewer.",
};
