import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

// This puzzle exercises the engine's genuine checkpoint/resume. An expensive
// early step (the data ingest) succeeds and is checkpointed. Then a simulated
// interruption strikes before the planning step. The learner chooses:
//   • Resume  → continue from the checkpoint; the ingest is NOT re-run.
//   • Restart → throw progress away; the ingest runs a second time (wasteful).
export default {
  id: "resume",
  title: "Resume the Interrupted Mission",
  difficulty: "Advanced",
  objective: "An expensive step already finished when the run is interrupted. Continue from the last successful step instead of redoing everything.",
  sampleInput: { label: "Mission", value: "Ingest the sales dataset, then draft a recovery plan for the duplicate-charge spike." },
  expected: "A completed plan where the expensive ingest step ran exactly once — recovered from the checkpoint, not from scratch.",
  failure: {
    label: "Mid-run interruption",
    description: "After the costly ingest succeeds, the run is interrupted before planning. Restarting wastes the ingest; resuming continues from the checkpoint.",
    plan(block) {
      // interrupt fires just before the planning step; the engine ignores it
      // once the interruption has been survived (i.e. after a resume/restart).
      if (block.type === "ai" && block.config.op === "plan") return { kind: "interrupt" };
      return null;
    },
  },
  hint: "This one is about the engine, not new blocks. Run it, let the interruption hit, then choose “Resume from checkpoint”. Watch the ingest step NOT run again.",
  initial: () => [
    mk("input"),
    mk("tool", { op: "research", source: "Data Warehouse" }), // the expensive ingest
    mk("ai", { op: "plan", model: "primary" }),
    mk("output"),
  ],
  checkValid: (p) => (p.plan || []).length > 0,
  grade: (r) => gradeChecks([
    ["The interruption fired", r.injectedFired],
    ["The workflow completed", r.completed],
    ["Resumed from the checkpoint — the ingest ran only once", (r.opCounts.research || 0) === 1 && r.resumeChoice !== "restart"],
  ]),
};
