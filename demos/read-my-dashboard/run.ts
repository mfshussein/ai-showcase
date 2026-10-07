import type { DemoRunner } from "../types";
import { snapToTile } from "@/lib/harness/regions";
import { extractFigures, traceFigures } from "@/lib/harness/figures";
import { DASHBOARDS, PICK, Reading, TilesFile, src, toBox } from "./shared";

const bullets = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

export const run: DemoRunner = async function* (ctx) {
  const layout = TilesFile.parse(JSON.parse(await ctx.fixture(`${PICK}.tiles.json`)));
  const onScreen = await ctx.fixture(`${PICK}.text.txt`);
  const image = (await ctx.fixtureBuffer(`${PICK}.png`)).toString("base64");
  const picked = DASHBOARDS.find((d) => d.name === PICK)!;

  yield { type: "run.start", demo: "read-my-dashboard", mode: "live", runId: crypto.randomUUID() };

  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "It reads your artefacts, not just text.",
      text: "Every month someone screenshots dashboards into a board pack, and the number that matters is spotted after the meeting. Give it the picture. No data feed, no integration, no translation step.",
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 2, title: "Four dashboards", subtitle: "Screenshots, exactly as they would land in a pack. One is entirely in Arabic." };
  yield {
    type: "panel", id: "grid", kind: "image",
    props: { title: "This month's pack", images: DASHBOARDS.map((d) => ({ src: src(d.name), alt: d.caption, caption: d.caption })) },
  };
  yield { type: "pause", label: "Read the Arabic one" };
  yield { type: "panel.patch", id: "grid", patch: { images: DASHBOARDS.map((d) => ({ src: src(d.name), alt: d.caption, caption: d.caption, selected: d.name === PICK })) } };

  yield { type: "act.start", act: 4, title: "Read it", subtitle: "One look at the image. Answer in English, figures quoted as printed." };
  yield { type: "panel", id: "dash", kind: "image", slot: "left", props: { title: picked.caption, src: src(PICK), alt: picked.caption, callouts: [] } };
  const t0 = Date.now();
  const reading = (await ctx.llm.vision({
    model: "main",
    image: { data: image, mediaType: "image/png" },
    schema: Reading,
    system: "You are a senior finance analyst reading a management dashboard image for the CFO of a Qatari company. Write in plain English for an executive. Quote figures exactly as printed on the dashboard and say which tile they come from. No emoji. Be specific: name towers, months and amounts.",
    prompt: `Read this dashboard (${layout.width}x${layout.height} pixels). Return:
- cfoLines: the three things the CFO would say about it in the board meeting, one sentence each.
- anomalies: the two things that look wrong or contradictory. For each: a short label (max 5 words), why it matters (one sentence), and box: the bounding box of the tile or chart where it appears, as percentages of image width and height (0 to 100), with x,y the top-left corner.
- questions: three questions to ask the team before the meeting.`,
  })) as Reading;
  reading.cfoLines = reading.cfoLines.slice(0, 3);
  reading.anomalies = reading.anomalies.slice(0, 2);
  reading.questions = reading.questions.slice(0, 3);
  const seconds = (Date.now() - t0) / 1000;

  const callouts = reading.anomalies.flatMap((a) => {
    const box = toBox(a.box);
    const tile = box ? snapToTile(box, layout.tiles, layout) : null;
    return tile ? [{ x: tile.x, y: tile.y, w: tile.w, h: tile.h, label: a.label }] : [];
  });
  yield { type: "panel.patch", id: "dash", patch: { callouts } };
  yield { type: "panel", id: "cfo", kind: "markdown", slot: "right", props: { title: "What the CFO will say", text: bullets(reading.cfoLines) } };
  yield { type: "panel", id: "anomalies", kind: "markdown", slot: "right", props: { tone: "block", title: reading.anomalies.length === 1 ? "One thing looks wrong" : `${reading.anomalies.length === 2 ? "Two things" : "Things that"} look wrong`, text: bullets(reading.anomalies.map((a) => `**${a.label}.** ${a.why}`)) } };
  yield { type: "panel", id: "questions", kind: "markdown", slot: "right", props: { title: "Ask before the meeting", text: bullets(reading.questions) } };
  yield {
    type: "verdict", id: "verdict", status: `READ IN ${seconds.toFixed(1)} S`, tone: "ok",
    headline: `Board lines, ${["no anomaly could be", "one anomaly", "two anomalies"][callouts.length]} circled, questions to ask. From a screenshot in Arabic.`,
    reason: "One call to a vision model. The callouts are snapped to the dashboard tiles it pointed at, so a box is never drawn in the wrong place.",
    evidence: [
      { label: "Model", value: ctx.llm.label },
      { label: "Input", value: `${PICK}.png, ${layout.width}x${layout.height}` },
      { label: "Callouts", value: `${callouts.length} of ${reading.anomalies.length} matched to a tile` },
      { label: "Elapsed", value: `${seconds.toFixed(1)} s` },
    ],
  };
  yield { type: "control.event", detector: "vision.read", policyId: "VIS-01", action: "allow", recordId: "CE-6001", detail: `${callouts.length}/${reading.anomalies.length} callouts snapped to tiles` };
  yield { type: "pause" };

  yield { type: "act.start", act: 5, title: "Proof", subtitle: "Vision is triage. Every figure it quoted is traced back to the page." };
  const quoted = extractFigures([...reading.cfoLines, ...reading.anomalies.map((a) => `${a.label} ${a.why}`), ...reading.questions].join("\n"));
  const trace = traceFigures(quoted, onScreen);
  yield {
    type: "panel", id: "trace", kind: "table",
    props: {
      title: `Figures quoted: ${trace.found.length} printed on the dashboard, ${trace.notFound.length} not printed`,
      columns: [{ key: "figure", label: "Figure" }, { key: "status", label: "On the dashboard?" }],
      rows: [
        ...trace.found.map((f) => ({ figure: f, status: { text: "PRINTED", tone: "ok" } })),
        ...trace.notFound.map((f) => ({ figure: f, status: { text: "DERIVED OR READ OFF A CHART, CHECK", tone: "warn" } })),
      ],
    },
  };
  yield { type: "control.event", detector: "figures.trace", policyId: "VIS-02", action: trace.notFound.length ? "flag" : "allow", recordId: "CE-6002", detail: `${trace.found.length} traced, ${trace.notFound.length} flagged` };
  yield {
    type: "panel", id: "takeaway", kind: "markdown",
    props: { tone: "ok", title: "It reads your artefacts, not just text.", text: "Screenshots, scans and slides, Arabic or English. The reading is fast; the control is that every number is traced to the source before it reaches a board pack." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
