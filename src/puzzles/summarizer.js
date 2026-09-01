import { mk } from "../engine/blocks.js";
import { VALIDATORS } from "../engine/validators.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "summarizer",
  title: "Fix the Meeting Summarizer",
  difficulty: "Beginner",
  objective: "Turn raw meeting notes into a summary, decisions, and action items — and don't let malformed output through.",
  sampleInput: {
    label: "Meeting notes",
    value: "Sync 10am. Priya ships the billing fix by Fri. We decided to delay the mobile launch to Q3. Someone needs to email the vendor. Raj to update the roadmap doc.",
  },
  expected: "Object with summary, decisions[], and actionItems[] where every item has an owner.",
  failure: {
    label: "Malformed model output",
    description: "On its first pass the model drops the owner field from every action item.",
    plan(block, { attempt }) {
      if (block.type === "ai" && block.config.op === "summarize" && attempt === 1) {
        return { kind: "mutate", apply: (v) => ({ ...v, actionItems: v.actionItems.map(({ task, due }) => ({ task, due })) }) };
      }
      return null;
    },
  },
  hint: "The AI step runs, but nothing checks its output. Add a Validator (check: meeting). Set onFail to repair, retry-previous, or route-to-human.",
  initial: () => [mk("input"), mk("ai", { op: "summarize" }), mk("output")],
  checkValid: (p) => VALIDATORS.meeting(p).valid,
  grade: (r) => gradeChecks([
    ["Workflow reached the end", r.completed],
    ["Final output is valid (every item has an owner)", r.completed && r.outputValid],
    ["Malformed output was caught, not shipped", !(r.injectedFired && !r.recovered && !r.outputValid)],
    ["The injected failure was handled", !r.injectedFired || r.recovered],
  ]),
};
