import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "grounding",
  title: "Ground the Knowledge Assistant",
  difficulty: "Advanced",
  objective: "Answer a policy question only when there's evidence — and refuse safely when there isn't.",
  sampleInput: { label: "Question", value: "What is our refund window?" },
  expected: "A grounded answer when evidence exists; a safe refusal (no guessing) when retrieval is empty.",
  failure: {
    label: "Empty retrieval",
    description: "Retrieval returns zero documents. With no guard, the model answers anyway — and hallucinates.",
    plan(block) {
      if (block.type === "retrieval") return { kind: "mutate", apply: () => ({ evidence: [] }) };
      return null;
    },
  },
  hint: "Between Retrieval and the AI answer, add a Condition (check: hasEvidence, onFalse: stop). No evidence → refuse instead of inventing an answer.",
  initial: () => [mk("input"), mk("retrieval"), mk("ai", { op: "answer" }), mk("output")],
  checkValid: (p) => p.grounded === true,
  grade: (r) => gradeChecks([
    ["Empty retrieval was detected", r.injectedFired],
    ["The assistant refused instead of hallucinating", !r.hallucinated],
    ["It stopped safely with a clear message", r.safeStopped || r.completed],
  ]),
};
