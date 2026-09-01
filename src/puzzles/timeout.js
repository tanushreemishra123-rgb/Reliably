import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "timeout",
  title: "Survive the Research Timeout",
  difficulty: "Intermediate",
  objective: "Gather figures from a source and turn them into a plan — while surviving a source that times out.",
  sampleInput: { label: "Question", value: "How did Q2 revenue trend, and what should we do about it?" },
  expected: "A result even when the live source is down — recovered via a fallback source.",
  failure: {
    label: "Tool timeout",
    description: "The Live Web Search tool times out on every attempt. Retry alone can't save it.",
    plan(block, { model }) {
      if (block.type === "tool" && block.config.source === "Live Web Search" && model !== "fallback") {
        return { kind: "throw", type: "timeout", message: "Live Web Search timed out after 8s" };
      }
      return null;
    },
  },
  hint: "Retry re-runs the same failing call — it'll exhaust. Add a Fallback right after the tool; it swaps to the Cached Index and continues.",
  initial: () => [mk("input"), mk("tool", { op: "research", source: "Live Web Search" }), mk("ai", { op: "plan" }), mk("output")],
  checkValid: (p) => (p.points || []).length > 0,
  grade: (r) => gradeChecks([
    ["The timeout actually fired", r.injectedFired],
    ["A fallback recovered the workflow", r.fallbackUsed],
    ["The workflow completed with data", r.completed],
    ["No failure was left unhandled", !r.unhandled],
  ]),
};
