import type { Flow } from "../types";
import { invoiceApprovals } from "./invoice-approvals";

/** Flows hold functions (the impact calculation), so client components look them up by slug instead of receiving them as props. */
export const flows: Record<string, Flow> = { [invoiceApprovals.slug]: invoiceApprovals };
