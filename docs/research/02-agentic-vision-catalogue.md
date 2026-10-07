# Agentic / Vision / Vertical Demo Catalogue (research agent 2, Oct 2026)

Context: QCB AI Guidelines (Sep 2024) require AI-systems register, human oversight, decisions "transparent, traceable and auditable" -> every demo shows an evidence drawer (inputs, model, prompt hash, output, confidence, approval state). Roland Berger: <1 in 3 GCC orgs have operating model to scale AI.

Ranked (wow per build effort):
1. A1 Night Watchman — scheduled agent hunts anomalies in invoices/logins/payments, alerts phone via WhatsApp/Telegram; "Run now" button + pre-seeded 14-night timeline (11 quiet, 3 alerts); bilingual alert; tap -> evidence page. M (S Telegram-only). Channels: Telegram Bot API free; Meta WhatsApp Cloud API free test number to 5 fixed verified numbers (real WhatsApp on real phone, best for the room); Twilio sandbox; Slack webhook (Gulf is Teams/WhatsApp); Resend email free 3k/mo. Refs: Railway "Claude Agent SDK worker" cron template https://railway.com/deploy/claude-agent-sdk-worker ; Claude Code Routines https://code.claude.com/docs/en/scheduled-tasks.md ; Hermes Agent https://github.com/nousresearch/hermes-agent
2. V3 Read my dashboard — 4 screenshots (one Arabic) -> CFO narrative, anomalies, callouts. S. https://platform.claude.com/cookbook/multimodal-reading-charts-graphs-powerpoints
3. V1 Invoice / Qatar ID / contract -> validated JSON with per-field confidence and red flags (VAT not summing, ID expired). S-M. Production KYC via licensed provider (ID Analyzer, Shufti) - say so.
4. L1 Glossary-locked Arabic/English translation, toggle glossary on/off, 14/14 vs 9/14 compliance counter. S.
5. R1 "You don't need AI for this" rules vs AI side by side (threshold flagging: rule wins; clustering complaints: LLM wins); 2x2 matrix clear/unclear spec x low/high consequence. S. Brand demo.
6. D1 Anomaly hunter on AP ledger (exact dup, fuzzy dup, z-score outlier, split invoices under threshold, weekend admin login); pandas/IsolationForest flags, LLM explains. S. Engine behind A1.
7. A2 Enquiry -> CRM agent: 3 inbound messages (Arabic property enquiry, mortgage question, complaint); visible plan checklist, tool call JSON, bilingual reply, CRM card; human-approval gate on send. M.
8. A3 Ask the data: NL -> SQL (DuckDB over CSV) -> chart. S.
9. V2 Damage photo -> severity/estimate with "what I could not see" caveat. S.
10. D2 Mailroom: 20 docs into kanban lanes (Legal/Finance/HR/Complaints/Spam) + human-review lane. S-M. Ref mAIl rules-first https://github.com/gniewkob/mAIl
11. L2 Call transcription (ElevenLabs Scribe Gulf Arabic 11.1% WER). S.
12. D3 Contract v1 vs v2 redline + materiality badges. M.
13. V4 Count pallets/vehicles (<20 objects). S.
14. X1 Procurement/RFP bid comparison (Qatar gov already runs an Intelligent Procurement Assistant). M.
15. P1 Process mining (pm4py). M.
16. V5 Spot the difference — VLMs poor at fine diffs; pair with OpenCV SSIM. M. Low.

Arabic vision: KITAB-Bench (ACL 2025) frontier VLMs beat classic OCR by ~60% CER on Arabic; use Claude/Gemini for understanding+JSON, Mistral OCR 3 ($2/1k pages) or Qari for bulk text; never classic OCR for Arabic cursive. https://arxiv.org/pdf/2502.14949

Suggested 20-min flow: R1 -> V3 -> V1 -> D1+A1 (phone) -> A2 -> L1 -> close on shared audit-trail panel.
Shared decisions: one shell + common evidence drawer; DuckDB+pandas for tabular; all sample data synthetic and Qatar-flavoured (QAR, Qatar ID format, Doha addresses, Arabic vendor names).
