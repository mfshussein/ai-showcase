import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "read-my-dashboard",
  order: 60,
  status: "soon",
  title: "Read this for me",
  hook: "Hand it a screenshot of a dashboard, in Arabic, and get what your CFO would say, what looks wrong, and what to ask, in seconds.",
  lesson: {
    name: "Board packs nobody reads",
    year: "Every month",
    line: "Dashboards are built and screenshotted into packs, and the anomaly on page 14 is found after the meeting. Reading is the bottleneck, not data.",
  },
  tags: { capability: ["Vision", "Arabic", "Analysis"], useCase: ["Finance", "Management reporting"], vertical: ["Real estate", "Any"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "Four dashboards" },
    { act: 4, title: "Read it" },
    { act: 5, title: "Proof" },
  ],
  takeaway: "It reads your artefacts, not just text: screenshots, scans, slides, in Arabic or English. And every number it quotes is traced back to the page before anyone relies on it.",
};
