// Optional live provider backed by the Anthropic Messages API.
//
// Implements the exact same interface as the mock provider, so the engine is
// unaware of the swap. Only the *content* becomes real; failure injection stays
// deterministic in the engine.
//
// NOTE: calling the API directly from the browser requires the
// `anthropic-dangerous-direct-browser-access` header and exposes your key to
// client-side code. That's acceptable for a local demo with a throwaway key,
// but for anything real, proxy these calls through a small backend and drop the
// header. The key entered in the UI is held in memory only and never persisted.

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// System prompts steer each op to STRICT JSON so downstream validators work.
const PROMPTS = {
  summarize: {
    system: `Summarise meeting notes. Reply with ONLY JSON:
{"summary": string, "decisions": string[], "actionItems": [{"task": string, "owner": string, "due": string|null}]}
Every actionItem MUST include an owner; use "UNASSIGNED" if none is named.`,
    user: (p) => `Notes:\n${p.input}`,
    note: "Summary produced by Claude",
  },
  classify: {
    system: `Classify the support ticket into one of: Billing, Technical, Account, Other.
Reply with ONLY JSON: {"category": string, "confidence": number between 0 and 1}.`,
    user: (p) => `Ticket:\n${p.input}`,
    note: "Classified by Claude",
  },
  draft: {
    system: `Draft a short, friendly customer support message for the request.
Reply with ONLY JSON: {"draft": string}.`,
    user: (p) => `Request:\n${p.input}`,
    note: "Draft written by Claude",
  },
  answer: {
    system: `Answer the question USING ONLY the provided evidence. If the evidence
is empty, you MUST set grounded=false and say you cannot answer.
Reply with ONLY JSON: {"answer": string, "grounded": boolean}.`,
    user: (p) => `Question:\n${p.input}\n\nEvidence:\n${JSON.stringify(p.evidence || [])}`,
    note: "Answered by Claude",
  },
  plan: {
    system: `Produce a short ordered action plan (3–5 steps).
Reply with ONLY JSON: {"plan": string[]}.`,
    user: (p) => `Task:\n${p.input}`,
    note: "Plan produced by Claude",
  },
};

// retrieve/research have no meaningful live counterpart here, so they reuse
// deterministic content — the point of live mode is real model reasoning.
import { mockProvider } from "./mockProvider.js";

export function createAnthropicProvider({ apiKey, model = "claude-sonnet-4-5" }) {
  async function callJSON(spec, payload) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system: spec.system,
        messages: [{ role: "user", content: spec.user(payload) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw { type: "provider_error", message: `Claude API ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return parseJSON(text);
  }

  return {
    id: "anthropic",
    label: "Claude (live)",
    live: true,
    async run(op, args) {
      const spec = PROMPTS[op];
      if (!spec) return mockProvider.run(op, args); // retrieve/research fall back to fixtures
      const value = await callJSON(spec, args.payload);
      return { value: normalize(op, value, args), note: spec.note };
    },
  };
}

function parseJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); }
  catch { throw { type: "invalid_json", message: "Model did not return valid JSON" }; }
}

// Coerce live output into the shapes validators expect.
function normalize(op, v, args) {
  if (op === "classify") return { category: v.category || "Other", confidence: clamp(Number(v.confidence) || 0, 0, 1) };
  if (op === "summarize") return {
    summary: v.summary || "",
    decisions: v.decisions || [],
    actionItems: (v.actionItems || []).map((i) => ({ task: i.task || "", owner: i.owner || "UNASSIGNED", due: i.due ?? null })),
  };
  if (op === "answer") return { answer: v.answer || "", grounded: !!v.grounded };
  if (op === "plan") return { plan: v.plan || [], model: args.model };
  if (op === "draft") return { draft: v.draft || "" };
  return v;
}
