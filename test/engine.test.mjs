// Headless verification of the engine + every puzzle. No DOM, no React.
// Run with: npm test
import { PUZZLES } from "../src/puzzles/index.js";
import { mk, resetUid } from "../src/engine/blocks.js";
import {
  createRun, stepOnce, resumeRunning, resumeFromCheckpoint, restartFromBeginning, buildReport,
} from "../src/engine/engine.js";
import { mockProvider } from "../src/providers/mockProvider.js";

const P = Object.fromEntries(PUZZLES.map((p) => [p.id, p]));

async function solve(puzzle, blocks, { armed = true, human = "approve", onInterrupt = "resume" } = {}) {
  resetUid();
  const decisions = {};
  let s = { ...createRun(puzzle), status: "running" };
  const ctx = () => ({ puzzle, blocks, armed, decisions, provider: mockProvider });
  let guard = 0;
  while (!["completed", "failed", "safe-stopped"].includes(s.status) && guard++ < 300) {
    if (s.status === "paused") { decisions[s.pausedBlockId] = { decision: human, text: "edited text" }; s = resumeRunning(s); continue; }
    if (s.status === "interrupted") { s = onInterrupt === "resume" ? resumeFromCheckpoint(s) : restartFromBeginning(s, puzzle); continue; }
    s = await stepOnce(s, ctx());
  }
  return buildReport(s, puzzle);
}

let pass = 0, fail = 0;
const ok = (name, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? "✅" : "❌"} ${name}`); };

const run = async () => {
  // --- solutions should PASS ---
  ok("summarizer solved", (await P.summarizer.grade(await solve(P.summarizer,
    [mk("input"), mk("ai", { op: "summarize" }), mk("validator", { check: "meeting", onFail: "repair" }), mk("output")]))).passed);

  ok("approve solved", (await P.approve.grade(await solve(P.approve,
    [mk("input"), mk("ai", { op: "draft" }), mk("human"), mk("output")], { human: "approve" }))).passed);

  ok("router solved", (P.router.grade(await solve(P.router,
    [mk("input"), mk("ai", { op: "classify" }), mk("validator", { check: "confidence", threshold: 0.7, onFail: "human" }), mk("output")], { human: "approve" }))).passed);

  ok("extractor solved (retry-previous)", (P.extractor.grade(await solve(P.extractor,
    [mk("input"), mk("ai", { op: "extract" }), mk("validator", { check: "schema", onFail: "retryPrev" }), mk("output")]))).passed);
  ok("extractor solved (repair)", (P.extractor.grade(await solve(P.extractor,
    [mk("input"), mk("ai", { op: "extract" }), mk("validator", { check: "schema", onFail: "repair" }), mk("output")]))).passed);

  ok("timeout solved", (P.timeout.grade(await solve(P.timeout,
    [mk("input"), mk("tool", { op: "research", source: "Live Web Search" }), mk("fallback"), mk("ai", { op: "plan" }), mk("output")]))).passed);

  ok("grounding solved", (P.grounding.grade(await solve(P.grounding,
    [mk("input"), mk("retrieval"), mk("condition", { check: "hasEvidence", onFalse: "stop" }), mk("ai", { op: "answer" }), mk("output")]))).passed);

  ok("fallback solved", (P.fallback.grade(await solve(P.fallback,
    [mk("input"), mk("ai", { op: "plan", model: "primary" }), mk("retry", { maxAttempts: 3 }), mk("fallback"), mk("output")]))).passed);

  ok("resume solved (checkpoint)", (P.resume.grade(await solve(P.resume, P.resume.initial(), { onInterrupt: "resume" }))).passed);

  // --- broken / wrong choices should FAIL ---
  ok("summarizer broken fails", !(P.summarizer.grade(await solve(P.summarizer, P.summarizer.initial()))).passed);
  ok("approve broken fails", !(P.approve.grade(await solve(P.approve, P.approve.initial()))).passed);
  ok("router broken fails", !(P.router.grade(await solve(P.router, P.router.initial()))).passed);
  ok("extractor broken fails", !(P.extractor.grade(await solve(P.extractor, P.extractor.initial()))).passed);
  ok("timeout broken fails", !(P.timeout.grade(await solve(P.timeout, P.timeout.initial()))).passed);
  ok("grounding broken fails (hallucinates)", !(P.grounding.grade(await solve(P.grounding, P.grounding.initial()))).passed);
  ok("fallback broken fails", !(P.fallback.grade(await solve(P.fallback, P.fallback.initial()))).passed);
  ok("resume restart is wasteful (fails efficiency)", !(P.resume.grade(await solve(P.resume, P.resume.initial(), { onInterrupt: "restart" }))).passed);

  // --- checkpoint behaviour: ingest runs once on resume, twice on restart ---
  const r1 = await solve(P.resume, P.resume.initial(), { onInterrupt: "resume" });
  const r2 = await solve(P.resume, P.resume.initial(), { onInterrupt: "restart" });
  ok("resume ran ingest once", r1.opCounts.research === 1);
  ok("restart ran ingest twice", r2.opCounts.research === 2);

  // --- guard: block ids stay unique across a session (no resetUid mid-session) ---
  const ids = [mk("input").id, mk("ai").id, mk("human").id, mk("output").id, mk("tool").id];
  ok("block ids are unique after adds", new Set(ids).size === ids.length);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
run();
