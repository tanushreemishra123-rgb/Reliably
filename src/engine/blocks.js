// Block catalogue: every step type the builder can place, with a default
// config factory. Kept deliberately small — a focused set of well-behaved
// blocks beats a sprawling no-code palette.
import { C } from "../ui/styles.js";

export const BLOCKS = {
  input:     { name: "Input",        glyph: "▸", accent: C.tool, cfg: () => ({}) },
  ai:        { name: "AI Model",     glyph: "✦", accent: C.ai,   cfg: () => ({ op: "summarize", model: "primary" }) },
  tool:      { name: "Tool / API",   glyph: "⚙", accent: C.tool, cfg: () => ({ op: "research", source: "Live Web Search" }) },
  retrieval: { name: "Retrieval",    glyph: "❖", accent: C.tool, cfg: () => ({}) },
  condition: { name: "Condition",    glyph: "◈", accent: C.human, cfg: () => ({ check: "hasEvidence", onFalse: "stop" }) },
  validator: { name: "Validator",    glyph: "▚", accent: C.ok,   cfg: () => ({ check: "meeting", threshold: 0.7, onFail: "repair" }) },
  retry:     { name: "Retry",        glyph: "↻", accent: C.run,  cfg: () => ({ maxAttempts: 3 }) },
  fallback:  { name: "Fallback",     glyph: "⇄", accent: C.recov, cfg: () => ({}) },
  human:     { name: "Human Review", glyph: "☑", accent: C.human, cfg: () => ({}) },
  output:    { name: "Output",       glyph: "◉", accent: C.ok,   cfg: () => ({}) },
};

// Which block types actually call the provider (and can fail).
export const EXECUTABLE = ["ai", "tool", "retrieval"];
export const isExecutable = (b) => EXECUTABLE.includes(b.type);

let _uid = 1;
export const uid = () => `b${_uid++}`;
export const resetUid = () => { _uid = 1; };

export const mk = (type, cfg = {}) => ({
  id: uid(),
  type,
  config: { ...BLOCKS[type].cfg(), ...cfg },
});

// The provider op a block invokes.
export function opName(block) {
  if (block.type === "ai") return block.config.op;
  if (block.type === "tool") return block.config.op;
  if (block.type === "retrieval") return "retrieve";
  return null;
}

// Human-readable one-liner shown under each block on the canvas.
export function describe(b) {
  const c = b.config;
  switch (b.type) {
    case "ai": return `op: ${c.op}${c.model ? ` · ${c.model}` : ""}`;
    case "tool": return `${c.op} · ${c.source}`;
    case "retrieval": return "fetch grounding docs";
    case "validator": return `check: ${c.check}${c.check === "confidence" ? ` ≥ ${c.threshold}` : ""} · onFail: ${c.onFail}`;
    case "retry": return `up to ${c.maxAttempts} attempts`;
    case "fallback": return "swap to backup on failure";
    case "condition": return `${c.check} · else ${c.onFalse}`;
    case "human": return "approve / edit / reject";
    case "input": return "commit sample input";
    case "output": return "emit final result";
    default: return "";
  }
}
