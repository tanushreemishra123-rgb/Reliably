import { mk } from "../engine/blocks.js";
import { VALIDATORS } from "../engine/validators.js";
import { gradeChecks } from "../engine/grading.js";

export default {
  id: "extractor",
  title: "Validate the Data Extractor",
  difficulty: "Intermediate",
  objective: "Extract a structured record from a messy invoice email — and recover when the model returns invalid, malformed JSON.",
  sampleInput: {
    label: "Invoice email",
    value: "Hi, please pay Acme Corp for last month. Contact ap@acme.com. Total due: $1,250 USD by end of week.",
  },
  expected: "A record { name, email, amount } where name & email are non-empty strings and amount is a number.",
  failure: {
    label: "Invalid structured output",
    description: "On its first pass the model drops the email field and returns amount as the string \"N/A\" — schema-invalid.",
    plan(block, { attempt }) {
      if (block.type === "ai" && block.config.op === "extract" && attempt === 1) {
        return { kind: "mutate", apply: (v) => ({ record: { ...v.record, email: "", amount: "N/A" } }) };
      }
      return null;
    },
  },
  hint: "The extract step runs but nothing checks its shape. Add a Validator (check: schema). Retry alone won't help malformed data — set onFail to retry-previous (the second pass is clean), repair (safe defaults), or route to a human.",
  initial: () => [mk("input"), mk("ai", { op: "extract" }), mk("output")],
  checkValid: (p) => VALIDATORS.schema(p).valid,
  grade: (r) => gradeChecks([
    ["Invalid extraction was produced", r.injectedFired],
    ["Structured output was validated and is well-typed", r.completed && r.outputValid],
    ["Invalid data was caught, not shipped", !(r.injectedFired && !r.recovered && !r.outputValid)],
    ["The failure was handled", !r.injectedFired || r.recovered],
  ]),
};
