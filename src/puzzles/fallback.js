import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "fallback",
  title: "Activate the Fallback",
  difficulty: "Advanced",
  objective: "Run a planning model that keeps erroring — retry it, then fail over to a backup model.",
  sampleInput: { label: "Task", value: "Draft a plan to resolve a duplicate-charge complaint." },
  expected: "A plan produced by the fallback model after the primary model fails repeatedly.",
  failure: {
    label: "Primary model overloaded",
    description: "The primary model returns 503 on every attempt. Retries exhaust; only a fallback model recovers.",
    plan(block, { model }) {
      if (block.type === "ai" && block.config.op === "plan" && model !== "fallback") {
        return { kind: "throw", type: "model_error", message: "primary model returned 503 (overloaded)" };
      }
      return null;
    },
  },
  hint: "Add a Retry (to show the attempts) then a Fallback after the model. Retry exhausts, Fallback switches to the backup model and produces the plan.",
  initial: () => [mk("input"), mk("ai", { op: "plan", model: "primary" }), mk("output")],
  checkValid: (p) => (p.plan || []).length > 0,
  grade: (r) => gradeChecks([
    ["The primary model failure fired", r.injectedFired],
    ["Retry attempts were recorded", r.retries > 0],
    ["The fallback model produced the plan", r.fallbackUsed],
    ["The workflow completed", r.completed],
  ]),
};
