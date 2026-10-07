import type { DemoManifest } from "../types";

export const manifest: DemoManifest = {
  slug: "enquiry-to-crm",
  order: 50,
  status: "ready",
  title: "From WhatsApp to CRM, with a human on send",
  hook: "An Arabic WhatsApp enquiry is classified, matched, checked against policy, answered in two languages and logged. The one thing it cannot do alone is press send.",
  lesson: {
    name: "Agents that act",
    year: "2026",
    line: "An agent that can send messages, move money or change records on its own is one prompt away from an incident. The approval step has to be in the system, not in the prompt.",
  },
  tags: { capability: ["Agent", "Tool use", "Human approval", "Arabic"], useCase: ["Sales", "Customer service"], vertical: ["Real estate", "Any"] },
  acts: [
    { act: 1, title: "The claim" },
    { act: 2, title: "The enquiry" },
    { act: 4, title: "The agent works" },
    { act: 5, title: "A person approves" },
  ],
  takeaway: "The agent does the legwork in seconds and shows every step. Sending is a tool the harness intercepts: nothing reaches a customer until a named person approves it.",
};
