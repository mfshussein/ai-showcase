/** The agent's tools. Pure functions over fixture data; send_whatsapp is the harness's approval gate. */
import { z } from "zod";
import type { ToolDef } from "@/lib/llm";
import { sha256Hex } from "@/lib/harness/text";

export type Customer = { id: string; phone: string; name: string; nameAr: string; status: string; lastContact: string; notes: string; language: string };
export type Data = {
  inbound: { channel: string; from: string; receivedAt: string };
  customers: Customer[];
  policy: Record<"pricing" | "financing" | "viewing" | "communication", string>;
  routing: Record<"purchase" | "rental" | "complaint" | "other", string>;
};
export type CrmRecord = { id: string; customerId?: string; intent: string; summary: string; nextAction: string; owner: string };

export const HOLD_REASON = "Outbound customer messages need human approval before sending.";

export function normalisePhone(p: string): string {
  const d = p.replace(/\D/g, "").replace(/^00/, "");
  return `+${d.startsWith("974") ? d : "974" + d}`;
}

export function makeTools(data: Data, log: CrmRecord[]): ToolDef[] {
  return [
    {
      name: "classify_enquiry",
      description: "Record the classification of the inbound message and get the queue it routes to.",
      parameters: z.object({ intent: z.enum(["purchase", "rental", "complaint", "other"]), language: z.enum(["ar", "en"]), summary: z.string() }),
      run: async (a) => {
        const { intent } = a as { intent: keyof Data["routing"] };
        return { recorded: true, queue: data.routing[intent] };
      },
    },
    {
      name: "lookup_customer",
      description: "Look up a customer in the CRM by phone number.",
      parameters: z.object({ phone: z.string() }),
      run: async (a) => {
        const phone = normalisePhone((a as { phone: string }).phone);
        const customer = data.customers.find((c) => c.phone === phone);
        return customer ? { found: true, customer } : { found: false };
      },
    },
    {
      name: "check_policy",
      description: "Read the company policy for a topic before replying: pricing, financing, viewing or communication.",
      parameters: z.object({ topic: z.enum(["pricing", "financing", "viewing", "communication"]) }),
      run: async (a) => {
        const { topic } = a as { topic: keyof Data["policy"] };
        return { topic, policy: data.policy[topic] };
      },
    },
    {
      name: "log_to_crm",
      description: "Create a CRM activity for this enquiry.",
      parameters: z.object({ customerId: z.string().optional(), intent: z.string(), summary: z.string(), nextAction: z.string() }),
      run: async (a) => {
        const r = a as Omit<CrmRecord, "id" | "owner">;
        const id = `CRM-${String(parseInt(sha256Hex(`${r.customerId ?? ""}|${r.intent}`).slice(0, 8), 16) % 100000).padStart(5, "0")}`;
        const rec: CrmRecord = { id, ...r, owner: "Sales: residential" };
        log.push(rec);
        return { created: true, id };
      },
    },
    {
      name: "send_whatsapp",
      description: "Send a WhatsApp reply to the customer.",
      parameters: z.object({ to: z.string(), text: z.string() }),
      run: async () => ({ status: "HELD", reason: HOLD_REASON }),
    },
  ];
}
