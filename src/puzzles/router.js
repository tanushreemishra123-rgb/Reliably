import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "router",
  title: "Repair the Ticket Router",
  difficulty: "Intermediate",
  objective: "Classify a support ticket and route it — but never act on a low-confidence guess.",
  sampleInput: { label: "Ticket", value: "I was charged twice for my subscription this month. Please refund the duplicate." },
  expected: "A category with confidence ≥ 0.7, OR a human decision when the model isn't sure.",
  failure: {
    label: "Low-confidence classification",
    description: "The classifier returns confidence 0.42. Retrying won't raise it — this needs a human.",
    plan(block) {
      if (block.type === "ai" && block.config.op === "classify") {
        return { kind: "mutate", apply: (v) => ({ ...v, confidence: 0.42 }) };
      }
      return null;
    },
  },
  hint: "Add a Validator (check: confidence, threshold 0.7). Retry can't fix a confidence problem — set onFail to human so a reviewer decides.",
  initial: () => [mk("input"), mk("ai", { op: "classify" }), mk("output")],
  checkValid: (p) => (p.confidence ?? 0) >= 0.7 || p.approved,
  grade: (r) => gradeChecks([
    ["Low confidence was detected", r.injectedFired],
    ["It was routed to a human, not auto-acted", r.humanUsed],
    ["A decision was recorded and the flow resolved", r.humanUsed && (r.completed || r.safeStopped)],
  ]),
};
