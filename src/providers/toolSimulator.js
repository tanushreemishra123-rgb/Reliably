// Simulated tool layer — deterministic stand-ins for external tools and
// retrieval systems. Kept separate from the model provider so "what a tool
// returns" and "what a model says" are independent concerns. The engine injects
// tool failures (timeouts, empty retrieval); this layer only returns content.

export const TOOLS = {
  // Web search / data source. Returns points for whatever source is requested;
  // the "Cached Index" (or a fallback run) yields the recovered snapshot.
  research: ({ source, model }) => {
    const cached = source === "Cached Index" || model === "fallback";
    return {
      value: { source: cached ? "Cached Index" : source, points: [cached ? "Q2 revenue up ~11% (cached snapshot)" : "Q2 revenue up 12% YoY"] },
      note: cached ? "Recovered figures from cached index" : `Fetched live figures from ${source}`,
    };
  },

  // Document retrieval for grounding.
  retrieve: () => ({
    value: { evidence: [{ title: "Refund Policy", text: "Refunds are processed within 5 business days." }] },
    note: "1 supporting document retrieved",
  }),
};

export function isToolOp(op) {
  return Object.prototype.hasOwnProperty.call(TOOLS, op);
}

export async function runTool(op, args) {
  await new Promise((r) => setTimeout(r, 60)); // simulate latency
  return TOOLS[op](args);
}
