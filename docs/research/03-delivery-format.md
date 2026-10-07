# Delivery Format & Stack (research agent 3, Oct 2026)

Gallery patterns that work for execs: card gallery with 3 tag axes (capability / use case / vertical) + one-line business outcome; "try it" always pre-loaded, never an empty box; replay/recorded runs with "Run live" button; side-by-side "without harness / with harness" toggle (most persuasive frame for a deployment consultancy); per-prospect playlists (3-5 demos as one link). Examples: Google Gemini Showcase https://ai.google.dev/showcase ; Anthropic quickstarts https://github.com/anthropics/claude-quickstarts ; Vercel ai-chatbot https://github.com/vercel/ai-chatbot ; Deloitte AI Gallery (briefing-centre walkthrough); Navattic/Arcade demo hubs.

Format verdict: static site cannot do live or scheduled demos; desktop app cannot be sent as a link + signing/packaging. Hosted web app with replay-first harness covers room, link, readiness session; same Next.js app runs locally (`next start` with bundled golden runs) as offline fallback.

Region: Anthropic API available in Qatar/GCC; Claude on Bedrock me-central-1 / me-south-1 via cross-region inference; Foundry lists Qatar Central/UAE North (verify per model). Vercel dxb1 (Dubai, sometimes maintenance, fallback fra1). Cloudflare PoP in Doha. Fly.io no ME region. Hosting region barely matters for LLM latency.

Stack rec: Next.js 16 + Vercel AI SDK + shadcn/ui; AI SDK `MockLanguageModelV3` + `simulateReadableStream` (ai/test) for deterministic replay that streams at realistic speed. Vercel Pro ($20/seat, per-minute cron, AI Gateway with $ budgets) or Cloudflare ($5, free cron, free AI Gateway with spend limits). Inngest free tier (50k step runs) for durable multi-step nightly agent. Turso (SQLite/libSQL, free) for sessions + cost ledger, also works as local file offline. Shared-password edge gate for v1; Better Auth magic links later (Auth.js in maintenance). Fixtures + golden runs as JSON in repo.

Never-fail harness: 1 golden.json per demo (record with RECORD=1); 3 run modes Replay / Live / Live-with-fallback (silent switch to golden from failed step, small "cached" badge); input-hash response cache; stepper reveal with presenter "Next"; per-step AbortSignal.timeout(20s), maxRetries 1-2, model fallback chain, stepCountIs(n); per-session $ cap (1-2) and daily team cap degrading to replay; /health preflight + rehearsal warm-up; one folder per demo demos/<slug>/{config.ts, fixtures/, golden.json, README}.

Cost ~50 sessions/mo: $40-60 replay-first Sonnet, $90-100 mostly live Opus. Gateway hard cap $150/mo.
