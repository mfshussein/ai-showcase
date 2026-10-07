# Protective Harness Demo Catalogue (research agent 1, Oct 2026)

Ranked by wow per unit of build effort (S=1-2d, M=3-5d, L=1-2w):
1. Conflicting-document quarantine (Air Canada) — S — Data
2. Guardrails: PII (Qatar ID) / injection / off-topic block — S — Compliance (Presidio, NeMo, Lakera, Azure Content Safety, Bedrock Guardrails)
3. RAG with citations + "no source, no answer" escalation — S-M — Data (Claude Citations API)
4. Approval gate + spend cap + drift auto-suspend (Zillow) — M — Governance (LangGraph interrupt / Agent SDK hooks, LiteLLM budget)
5. Citation validator (Deloitte AU$440k refund, Oct 2025) — S — Governance
6. Live eval set + regression diff, promote blocked <95% — M — Governance (promptfoo, DeepEval, Ragas, Braintrust)
7. Groundedness / claim-level faithfulness meter — S-M — Data (Ragas faithfulness, Vectara HHEM)
8. Structured-output contract + auto-retry (Instructor/Pydantic) — S
9. LLM-as-judge rubric + pairwise with swapped order (position bias) — S
10. Regulatory-change radar (QCB AI Guideline Sep 2024, NCSA secure AI, MCIT 2025, PDPPL) + evidence pack — M
11. AI usage register / shadow-AI inventory with "Scan" revealing unregistered tools — S
12. Drift & accuracy dashboard (Evidently, Phoenix) — M
13. Observability trace replay (Langfuse shared backend) — S
14. Red-team scan report (promptfoo red-team, Giskard) — M
15. Confidence threshold / abstain-and-route to human — S

Design principle: every demo uses the same 3-pane rhythm: request -> harness verdict (ALLOW/BLOCK/HOLD/QUARANTINE + reason + evidence) -> audit record. One shared "Control Event" card component. Shared corpus (HR/leave/IT policies in two versions), shared AI register feeding 10/11/12, shared Langfuse trace.

Suggested 20-min flow: Data (1,3,7) -> Governance (4,6,5) -> Compliance (2,10 with 11,13) -> close with exported Control Event log as evidence pack.

Key refs: Moffatt v Air Canada 2024 BCCRT 149; Zillow Offers Nov 2021; Deloitte Australia Oct 2025; QCB AI guideline https://www.qna.org.qa/en/newsbulletins/2024-09/04/0048-qatar-central-bank-issues-artificial-intelligence-guideline ; NCSA https://regulations.ai/regulations/RAI-QA-NA-GSAUAXX-2024 ; MCIT https://www.mcit.gov.qa/en/policies-and-reports/guidelines ; Presidio demo https://huggingface.co/spaces/presidio/presidio_demo ; Claude citations https://simonwillison.net/2025/Jan/24/anthropics-new-citations-api/ ; Anthropic evals cookbook https://platform.claude.com/cookbook/misc-building-evals ; LangGraph HITL https://docs.langchain.com/oss/python/langgraph/add-human-in-the-loop ; LiteLLM budgets https://docs.litellm.ai/docs/proxy/users ; Evidently https://docs.evidentlyai.com/get-started/quickstart-llm ; Langfuse https://langfuse.com/docs ; promptfoo red team https://promptfoo.dev/docs/red-team ; RegDelta https://github.com/asmuelle/regdelta
