import conflictingDocs from "./conflicting-docs/golden.json";
import guardrails from "./guardrails/golden.json";
import readMyDashboard from "./read-my-dashboard/golden.json";
import documentToJson from "./document-to-json/golden.json";
import glossaryTranslation from "./glossary-translation/golden.json";
import enquiryToCrm from "./enquiry-to-crm/golden.json";
import nightWatchman from "./night-watchman/golden.json";

/** Server-only: statically imported recorded runs, keyed by slug. */
export const goldens: Record<string, unknown> = { "conflicting-docs": conflictingDocs, guardrails, "read-my-dashboard": readMyDashboard, "document-to-json": documentToJson, "glossary-translation": glossaryTranslation, "enquiry-to-crm": enquiryToCrm, "night-watchman": nightWatchman };
