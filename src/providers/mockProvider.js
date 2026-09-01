// Deterministic, offline MODEL provider. Pure content generation for the AI
// ops (summarize / classify / draft / answer / plan). Failure injection is the
// engine's job, so these functions always return well-formed data.
//
// Tool and retrieval ops are delegated to the simulated tool layer
// (toolSimulator.js) — the model provider and the tool layer are separate
// responsibilities behind one provider interface.
import { isToolOp, runTool } from "./toolSimulator.js";

const MEETING_CLEAN = {
  summary: "Team aligned on the billing fix, launch timing, and roadmap follow-ups.",
  decisions: ["Delay the mobile launch to Q3"],
  actionItems: [
    { task: "Ship the billing fix", owner: "Priya", due: "Fri" },
    { task: "Email the vendor", owner: "UNASSIGNED", due: null },
    { task: "Update the roadmap doc", owner: "Raj", due: null },
  ],
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// Model ops only. Tool/retrieval ops are handled by the tool simulator.
const modelOps = {
  summarize: () => ({ value: clone(MEETING_CLEAN), note: "Structured summary produced" }),

  classify: () => ({ value: { category: "Billing", confidence: 0.91 }, note: "Confident classification" }),

  draft: () => ({
    value: { draft: "Hi there — good news: your refund has been approved and should arrive within 5 business days. Sorry for the trouble. — Support" },
    note: "Draft written",
  }),

  answer: ({ payload }) => {
    const ev = payload.evidence || [];
    return ev.length
      ? { value: { answer: "Per the Refund Policy, refunds are processed within 5 business days.", grounded: true }, note: "Grounded answer produced" }
      : { value: { answer: "Refunds usually take about two weeks.", grounded: false }, note: "Answered with no evidence (ungrounded)" };
  },

  extract: () => ({
    value: { record: { name: "Acme Corp", email: "ap@acme.com", amount: 1250, currency: "USD" } },
    note: "Structured record extracted",
  }),

  plan: ({ model }) => ({
    value: {
      plan: model === "fallback"
        ? ["Fallback model: triage the request", "Notify the owner", "Draft the resolution"]
        : ["Triage the request", "Notify the owner", "Draft the resolution"],
      model,
    },
    note: model === "fallback" ? "Plan produced by fallback model" : "Plan produced",
  }),
};

export const mockProvider = {
  id: "mock",
  label: "Mock AI (offline)",
  live: false,
  async run(op, args) {
    if (isToolOp(op)) return runTool(op, args); // delegate to the tool simulator
    const fn = modelOps[op];
    if (!fn) throw { type: "unknown_op", message: `Mock provider has no op "${op}"` };
    await new Promise((r) => setTimeout(r, 60)); // simulate model latency
    return fn(args);
  },
};
