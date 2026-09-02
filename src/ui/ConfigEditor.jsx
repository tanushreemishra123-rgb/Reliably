import React from "react";

// Inline configuration controls for the block types that have options.
export default function ConfigEditor({ block, onChange }) {
  const c = block.config;
  const F = (label, el) => (<div className="rl-field" key={label}><label>{label}</label>{el}</div>);
  const sel = (val, opts, key) => (
    <select value={val} onChange={(e) => onChange({ [key]: e.target.value })}>
      {opts.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
    </select>
  );

  const byType = {
    ai: () => [
      F("Operation", sel(c.op, [
        { v: "summarize", t: "summarize" }, { v: "classify", t: "classify" }, { v: "draft", t: "draft" },
        { v: "extract", t: "extract" }, { v: "answer", t: "answer" }, { v: "plan", t: "plan" },
      ], "op")),
      F("Model", sel(c.model, [{ v: "primary", t: "primary" }, { v: "fallback", t: "fallback" }], "model")),
    ],
    tool: () => [F("Source", sel(c.source, [
      { v: "Live Web Search", t: "Live Web Search" }, { v: "Cached Index", t: "Cached Index" }, { v: "Data Warehouse", t: "Data Warehouse" },
    ], "source"))],
    validator: () => [
      F("Check", sel(c.check, [{ v: "meeting", t: "meeting owners" }, { v: "schema", t: "schema (record)" }, { v: "confidence", t: "confidence" }, { v: "grounded", t: "grounded" }], "check")),
      c.check === "confidence" && F("Threshold", <input type="number" step="0.1" min="0" max="1" value={c.threshold} onChange={(e) => onChange({ threshold: +e.target.value })} style={{ width: 64 }} />),
      F("On fail", sel(c.onFail, [{ v: "repair", t: "repair" }, { v: "retryPrev", t: "retry previous" }, { v: "human", t: "route to human" }, { v: "stop", t: "stop safely" }], "onFail")),
    ],
    retry: () => [F("Max attempts", <input type="number" min="1" max="5" value={c.maxAttempts} onChange={(e) => onChange({ maxAttempts: +e.target.value })} style={{ width: 60 }} />)],
    condition: () => [
      F("Check", sel(c.check, [{ v: "hasEvidence", t: "has evidence" }], "check")),
      F("If false", sel(c.onFalse, [{ v: "stop", t: "stop safely" }, { v: "human", t: "route to human" }], "onFalse")),
    ],
  };

  const build = byType[block.type];
  if (!build) return null;
  const els = build().filter(Boolean);
  if (!els.length) return null;
  return <div className="rl-bcfg">{els}</div>;
}
