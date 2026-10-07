import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { makeTools, normalisePhone, type CrmRecord, type Data } from "./tools";

async function setup() {
  const data = JSON.parse(await readFile(path.join(__dirname, "fixtures", "data.json"), "utf8")) as Data;
  const log: CrmRecord[] = [];
  const tools = Object.fromEntries(makeTools(data, log).map((t) => [t.name, t]));
  return { data, log, tools };
}

describe("enquiry-to-crm tools", () => {
  it("normalises Qatari phone numbers", () => {
    expect(normalisePhone("+974 5512 3487")).toBe("+97455123487");
    expect(normalisePhone("55123487")).toBe("+97455123487");
    expect(normalisePhone("00974-5512-3487")).toBe("+97455123487");
  });
  it("classify_enquiry routes by intent", async () => {
    const { tools } = await setup();
    expect(await tools.classify_enquiry.run({ intent: "purchase", language: "ar", summary: "2-bed" })).toMatchObject({ queue: "Sales: residential" });
  });
  it("lookup_customer finds the returning lead by phone in any format, and reports a miss", async () => {
    const { tools } = await setup();
    expect(await tools.lookup_customer.run({ phone: "+974 5512 3487" })).toMatchObject({ found: true, customer: { id: "CUST-20418" } });
    expect(await tools.lookup_customer.run({ phone: "+974 7000 0000" })).toEqual({ found: false });
  });
  it("check_policy returns the policy text for a topic", async () => {
    const { tools } = await setup();
    expect(await tools.check_policy.run({ topic: "financing" })).toMatchObject({ topic: "financing", policy: expect.stringContaining("do not give financing advice") });
  });
  it("log_to_crm appends a record with a deterministic id", async () => {
    const a = await setup();
    const b = await setup();
    const args = { customerId: "CUST-20418", intent: "purchase", summary: "2-bed, QAR 1.8M, viewing Saturday", nextAction: "Confirm viewing" };
    const r1 = (await a.tools.log_to_crm.run(args)) as { id: string };
    const r2 = (await b.tools.log_to_crm.run(args)) as { id: string };
    expect(r1.id).toMatch(/^CRM-\d{5}$/);
    expect(r1.id).toBe(r2.id);
    expect(a.log).toHaveLength(1);
  });
  it("send_whatsapp never sends: it is held for human approval", async () => {
    const { tools } = await setup();
    expect(await tools.send_whatsapp.run({ to: "+97455123487", text: "hello" })).toEqual({ status: "HELD", reason: "Outbound customer messages need human approval before sending." });
  });
});
