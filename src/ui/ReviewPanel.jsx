import React from "react";
import { fmt } from "./styles.js";

// Shown when the engine pauses for a human decision.
export function ReviewPanel({ entry, editText, setEditText, onSubmit }) {
  const p = (entry?.review && entry.review.payload) || {};
  const { input, grounded, model, ...rest } = p;
  const preview = p.draft || p.answer || (p.category ? { category: p.category, confidence: p.confidence } : rest);
  return (
    <div className="rl-review">
      <h4>☑ Human review needed</h4>
      <div className="rl-meta" style={{ marginBottom: 8 }}>{entry?.note}</div>
      <div className="body rl-mono">{typeof preview === "string" ? preview : fmt(preview)}</div>
      <textarea rows={2} placeholder="Optional edit — used only if you choose Edit & approve" value={editText} onChange={(e) => setEditText(e.target.value)} />
      <div className="rl-rev-actions">
        <button className="b-approve" onClick={() => onSubmit("approve")}>Approve</button>
        <button className="b-edit" onClick={() => onSubmit("edit")}>Edit &amp; approve</button>
        <button className="b-reject" onClick={() => onSubmit("reject")}>Reject</button>
      </div>
    </div>
  );
}

// Shown when the engine hits a simulated interruption (#8).
export function InterruptPanel({ onResume, onRestart }) {
  return (
    <div className="rl-review interrupt">
      <h4>⚡ Mission interrupted</h4>
      <div className="rl-meta" style={{ marginBottom: 10 }}>
        The run stopped mid-flight. You can pick up from the last successful step, or start over and redo the expensive work.
      </div>
      <div className="rl-rev-actions">
        <button className="b-resume" onClick={onResume}>Resume from checkpoint</button>
        <button className="b-restart" onClick={onRestart}>Restart from beginning</button>
      </div>
    </div>
  );
}
