# Wow Demos (batch 2): Design Spec

Date: 2026-10-07 · Status: decided under Mohammed's standing instruction ("happy to go with your recommendation", work independently) · Builds on `2026-10-07-ai-showcase-design.md`

Five demos, each designed around one pin-drop moment. They use the existing case format (five acts, run events, golden replay) and add the minimum new machinery: three panel kinds, a tool-calling loop in `Llm`, a Telegram notifier, and five pure harness modules.

## 1. The five demos

Walkthrough order after this batch: night-watchman (10), conflicting-docs (20), guardrails (40), enquiry-to-crm (50), read-my-dashboard (60), document-to-json (70), glossary-translation (80). Build order: A, B, C, D, E.

### A. read-my-dashboard (order 60) "Read this for me"

- Act 1 claim: "It reads your artefacts, not just text."
- Act 2 setup: a 2x2 grid of four synthetic dashboards (Sales by region EN, Cash position EN, Call-centre SLA EN, Collections and occupancy fully in Arabic for a fictional Lusail property company). Pause, then the Arabic one is picked (the strongest proof for a Gulf room).
- Act 4 pin drop: one vision call returns `{ cfoLines[3], anomalies[2] {label, why, box}, questions[3] }`. The image panel draws the two anomaly callouts; three cards list the CFO lines and questions. Verdict `READ IN 6.2 S` (tone ok), the real elapsed time of the call, evidence: model, image, tile count.
- Act 5 takeaway: vision is triage; the numbers it quotes are checked against the source system before anything goes to a board pack.
- Callout reliability: the model returns a percent box per anomaly; `lib/harness/regions.ts` snaps it to the dashboard tile that contains the box centre (tile boxes are measured by Playwright when the PNG is generated and saved as `<name>.tiles.json`). A box whose centre lands in no tile is dropped. Clean, honest boxes; the model still did the locating.

### B. document-to-json (order 70) "Paper in, record out"

- Act 2: three images side by side: bilingual tax invoice (Doha supplier, VAT 5%, but the printed VAT does not equal 5% of the subtotal and the total does not sum), SPECIMEN Qatar ID card (expired 2025-03-14), handwritten delivery note (Caveat font, one quantity overwritten so it is ambiguous).
- Act 4: per document, a vision call fills a schema where every field is `{ value, confidence }`. A json panel shows the record; a table of validation results lands beside it: VAT mismatch (red, BLOCK), total mismatch (red), ID expired (red), ID number structure vs birth year (ok), low-confidence field below 0.8 (amber, "human check"). Final verdict over the batch: `0 OF 3 RELEASED` (quarantine tone), reason "2 blocked by validation, 1 waiting for a human check", headline "Downstream systems only ever receive validated records."
- On-screen caveat (markdown, info tone): production identity checks go through a licensed KYC provider; this is extraction and validation, not identity verification.
- Validation is pure code in `lib/harness/doc-checks.ts` (tested): `vatCheck`, `idChecks` (expiry vs a fixed "today" passed in, 11-digit structure, birth-year digits), `confidenceFlags`.

### C. glossary-translation (order 80) "Say it exactly this way"

- Act 2: an Arabic policy paragraph (fictional Al Dana Islamic Bank, Sukuk, QCB terms, product names) and the 14-term house glossary as a table.
- Act 3 gasp: translate with no glossary. A counter panel shows `9/14` style; the translation is shown with honoured terms highlighted green and the missed house terms listed red.
- Act 4 pin drop: same paragraph, glossary injected and enforced (prompt plus a deterministic check; if any term is still missed the harness re-asks once with the missed terms named). Counter flips to `14/14`, verdict `GLOSSARY 14/14` (ok). If the re-ask still misses, verdict is honest: `13/14 HELD FOR REVIEWER`.
- `lib/harness/glossary.ts` (tested): normalise (case, whitespace, Arabic diacritics/tatweel for the source side), `checkTerms(translation, glossary)` returns per-term honoured/missed with match spans for highlighting. Glossary terms are chosen so the natural translation differs from the house rendering (e.g. "Dana Sukuk Certificates", "QCB Circular", product names).

### D. enquiry-to-crm (order 50) "From WhatsApp to CRM, with a human on send"

- Act 2: the inbound WhatsApp message in Arabic (a fictional buyer asking about a 2-bed in "Lusail Residences", budget, mortgage, viewing) and the plan checklist (gate panel): Classify, Look up customer, Check policy, Draft reply, Log to CRM, Send.
- Act 4: a real tool-calling loop. Tools: `classify_enquiry`, `lookup_customer`, `check_policy`, `log_to_crm`, `send_whatsapp`. Each call appears as a json panel (in / out) and ticks its checklist step. The model drafts a bilingual reply (chat panel). A CRM card (table) appears from `log_to_crm`. `send_whatsapp` is implemented by the harness to return `{ status: "HELD", reason: "outbound customer messages need human approval" }`: the control is code, not a prompt. Verdict `HOLD` (warn) "Reply drafted and logged. Sending waits for a person."
- Pause, then Act 5: canned approval "Approved by Noora, 09:41", Send ticks, verdict becomes `SENT` (ok). Takeaway ties to the approval-gate principle.
- Tool data (customer DB, policy snippets, units) is fixture JSON. Tool implementations are pure functions in `demos/enquiry-to-crm/tools.ts`, tested.
- `Llm.tools()` (section 3). Max 8 steps. If the model never calls `send_whatsapp`, the harness still shows Send as HOLD (the send step is always gated by the runner).

### E. night-watchman (order 10, walkthrough opener) "It works the night shift"

- Act 1 claim: "Every night it reads every payment and login, and messages you only when something is wrong."
- Act 2: timeline panel of the last 14 nights (seeded: 11 quiet green, 3 with alerts), and a ledger summary (500 AP rows, 1 access log). The pause label reads "Run tonight's shift".
- Act 4: stats pass in `lib/harness/anomalies.ts` (no model) flags exactly the planted five: exact duplicate, fuzzy duplicate (same vendor and amount, dates 2 days apart), outlier (z > 3 vs the vendor's own history), split invoices (same vendor, within 3 days, each under QAR 50,000, together over it), weekend 03:00 admin login. A table fills row by row. The model writes for each flag a one-line English explanation, an Arabic line, and a suggested action (one `parse` call). Tonight's tile on the timeline turns red with "5 alerts".
- Pin drop: a phone panel shows the Telegram message arriving (bilingual summary, 5 flags, "Reply 1 to open the evidence"). Verdict `ALERT SENT` (warn) "5 issues worth QAR <sum> found in 500 payments. Your phone has the summary."
- Real phone: when the phone panel appears in a presenter's browser, the stage POSTs its text to `/api/notify` (presenter-only, once per run) which calls Telegram `sendMessage` if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set, and otherwise returns `{ sent: false, reason: "not configured" }`. The phone panel shows "Delivered to Telegram" or "Preview (Telegram not configured)". So the phone buzzes in replay too, at no model cost. Tokens are never logged or returned.
- Ledger: `lib/harness/ledger.ts` generates 500 rows from a seed (mulberry32) with the five issues planted; tests pin that the detectors find exactly those and nothing else.

## 2. New panel kinds

Added to `PanelKind` and `PANELS`:

- `counter` `{ title?, value, total, label?, tone?, text?, highlights?: {text, tone}[], missed?: string[] }`: a large `n/m` with an optional body text where highlight phrases are marked. Used by glossary.
- `timeline` `{ title?, nights: {date, state: "quiet"|"alert"|"running"|"pending", count?}[] }`: a strip of tiles. Used by night-watchman.
- `phone` `{ title?, app: "Telegram", from, messages: {text, time}[], delivery?: string, notify?: boolean }`: a phone-frame mockup. `notify: true` asks the stage to call `/api/notify` once. Used by night-watchman.

Existing kinds cover the rest: `gate` is the plan checklist; `json` gains optional per-field `confidence` rendering via a `fields` prop `{ path, value, confidence, tone }[]` shown as a table under the JSON; `image` gains `grid` mode via a new `images` prop `{src, alt, caption, selected?}[]`.

## 3. `Llm.tools()`

```ts
type ToolDef = { name: string; description: string; parameters: z.ZodType; run: (args: unknown) => Promise<unknown> };
type ToolStep =
  | { type: "call"; id: string; name: string; args: unknown }
  | { type: "result"; id: string; name: string; result: unknown }
  | { type: "final"; text: string };
tools(o: Common & { tools: ToolDef[]; maxSteps?: number }): AsyncGenerator<ToolStep>;
```

OpenAI-compatible path: `chat.completions.create` with `tools` (JSON schema from `z.toJSONSchema`), run each tool call, append `tool` messages, loop until the reply has no tool calls or `maxSteps` (default 8) is reached. Bad JSON arguments become a tool result `{ error }` so the model can correct. Anthropic path: throws "tools() not implemented for the Anthropic provider yet" (noted in README). Tested with the existing fake-server pattern.

## 4. Telegram

`lib/notify.ts`: `telegramConfigured(env)`, `sendTelegram(text, env, fetchImpl)`; `POST /api/notify` (presenter cookie required, text length capped at 4000, returns `{ sent, reason? }`). `.env.example` gains `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Until Mohammed provides them the phone panel shows the preview label.

## 5. Images

`scripts/make-images.mts` renders HTML templates under `demos/<slug>/fixtures/src/*.html` to PNG with Playwright (1280x800 dashboards; documents at natural size), and writes tile boxes for dashboards. PNGs are committed under `demos/<slug>/fixtures/` and copied to `public/fixtures/<slug>/` for the image panel (png is already excluded from the gate matcher; the images are synthetic). Fonts: system Arabic plus Google "Caveat" for handwriting, loaded in the template. ID card carries a diagonal SPECIMEN watermark and an obviously fictional name.

## 6. Testing

- Unit first for every harness module: regions, doc-checks, glossary, ledger + anomalies, notify, tools loop, enquiry tools.
- Runner tests per demo with a fake `Llm` (including a fake `tools()` generator), pinning the deterministic preconditions and that the verdict follows the data (e.g. glossary 14/14 vs held; doc-json counts).
- Registry test already checks every ready demo has a valid golden whose acts match the manifest; e2e replay covers each new demo.

## 7. Decisions

- Pick the Arabic dashboard: strongest proof for the room.
- Snap callouts to measured tiles rather than trust raw coordinates: boxes always look right, and a wrong locate drops a box instead of drawing it in the wrong place.
- `send_whatsapp` exists as a tool so the gate is visible as code intercepting a model action.
- Notify from the browser on replay rather than from the runner on record: the phone buzz is the moment, and it must work without a live run.
- Pure stats for anomalies, model only for wording: "you don't need AI for this" applied to our own demo.
