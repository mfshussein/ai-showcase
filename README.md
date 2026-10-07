# Cypher-One AI Showcase

Short, pre-loaded demonstrations that make the Cypher-One pitch tangible: watch an AI get it wrong, then watch a system control catch it. Built for a laptop in a meeting room and for a gated link sent afterwards.

Design spec: `docs/superpowers/specs/2026-10-07-ai-showcase-design.md`. Research: `docs/research/`.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

`.env.local` needs:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `anthropic` (default) or `openai` for any OpenAI-compatible API (Qwen, DeepSeek, Kimi, GLM, MiniMax, OpenRouter). |
| `ANTHROPIC_API_KEY` | When the provider is Anthropic. Only for live runs and recording. Replay works without it. |
| `LLM_BASE_URL`, `LLM_API_KEY` | When the provider is `openai`. See `.env.example` for base URLs. |
| `LLM_PRICE_MAIN`, `LLM_PRICE_FAST` | Optional "input,output" USD per million tokens, for the cost shown in the evidence drawer. |
| `VIEWER_PASSWORD` | The code prospects use. Replay only. |
| `PRESENTER_PASSWORD` | The code partners use. Adds "Run live" and the preflight page. |
| `COOKIE_SECRET` | Any long random string. Signs the session cookie. |
| `MODEL_MAIN`, `MODEL_FAST` | The capable model and the cheap classifier model. Defaults depend on the provider. |

## Presenting

- Open the gallery, press "Start the walkthrough", or open a single case.
- Space, Enter or the right arrow advance. Left arrow goes back one screen. E opens the evidence drawer. Esc returns to the gallery.
- Replay is the default and needs no network. Presenters can press L or "Run live" to run the real pipeline; if it fails, the stage continues from the recording and shows a "Cached" badge.
- Before a meeting, open Preflight (presenter only) and probe the model.

## Adding a case

1. Create `demos/<slug>/` with `manifest.ts` (title, hook, lesson, tags, acts, takeaway), `run.ts` (an async generator that yields run events; see `lib/events.ts` for the contract and `components/panels/index.tsx` for panel props), and `fixtures/`.
2. Register the manifest in `demos/registry.ts` and the runner in `demos/runners.ts`.
3. Add the runner to the static import map at the top of `scripts/record.mts`, then record it: `npm run record <slug>`. Read the printed transcript; re-record until the gasp and the verdict land.
4. Add the golden to `demos/goldens.ts`, set the manifest `status` to `ready`, run `npm test` and `npm run test:e2e`.

The two recorded cases were made with Qwen 3.8 Max and Qwen 3.8 Flash through OpenRouter. The Anthropic code path compiles and is unit-tested against the SDK types but has not been exercised against the live API yet; probe it from Preflight before relying on it.

Fixtures are synthetic and fictional. Real incidents are cited only as public lessons, using the wording checked for the deck.

## Checks

```bash
npm test           # unit tests (harness logic, event schema, player, gate)
npm run test:e2e   # Playwright: gate and a full replay of every recorded case
npm run lint
npx tsc --noEmit
```

## Deploying

Vercel project with the environment variables above. Set a monthly spend limit on the Anthropic workspace. Live mode is presenter-only, so a shared viewer link cannot spend on the API. For a no-network meeting, `npm run build && npm start` on the laptop serves replay from the bundled recordings.
