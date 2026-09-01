import { mk } from "../engine/blocks.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "approve",
  title: "Approve Before Sending",
  difficulty: "Beginner",
  objective: "Draft an outbound customer message, but require a human to approve, edit, or reject it before it leaves the building.",
  sampleInput: { label: "Request", value: "Tell the customer their refund is approved and will arrive in about 5 days." },
  expected: "A drafted message that a human explicitly approved, edited, or rejected. Nothing sends without a decision.",
  failure: {
    label: "No human gate",
    description: "Without an approval step the draft is emitted automatically — no oversight at all.",
    plan: () => null,
  },
  hint: "Insert a Human Review block between the AI draft and Output. Run it, then choose approve / edit / reject.",
  initial: () => [mk("input"), mk("ai", { op: "draft" }), mk("output")],
  checkValid: () => true,
  grade: (r) => gradeChecks([
    ["A human decision was recorded", r.humanUsed],
    ["Approved/edited continues; rejected stops safely", r.humanUsed && (r.completed || r.safeStopped)],
    ["Nothing shipped without oversight", r.humanUsed],
  ]),
};
