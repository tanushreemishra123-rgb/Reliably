import React from "react";
import { fmt } from "./styles.js";

// Shown when the engine pauses for a human decision.
export function ReviewPanel({ entry, editText, setEditText, onSubmit }) {
  const p = (entry?.review && entry.review.payload) || {};
  const { input, grounded, model, ...rest } = p;
  const editable = typeof p.draft === "string" ? p.draft
    : typeof p.answer === "string" ? p.answer : null;
  const preview = editable ?? (p.category ? { category: p.category, confidence: p.confidence } : rest);

  // Prefill the edit box with the actual draft so the reviewer edits real text
  // (and an empty box can never blank the message). Runs when a new pause opens.
  React.useEffect(() => {
    if (editable) setEditText(editable);
  }, [entry?.blockId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rl-review">
      <h4>☑ Human review needed</h4>
      <div className="rl-meta" style={{ marginBottom: 8 }}>{entry?.note}</div>
      <div className="body rl-mono">{typeof preview === "string" ? preview : fmt(preview)}</div>
      {editable !== null && (
        <>
          <div className="rl-meta" style={{ margin: "8px 0 3px" }}>Edit the message below, then choose <b>Edit &amp; approve</b> — or <b>Approve</b> to send as-is.</div>
          <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
        </>
      )}
      <div className="rl-rev-actions">
        <button className="b-approve" onClick={() => onSubmit("approve")}>Approve</button>
        {editable !== null && (
          <button className="b-edit" onClick={() => onSubmit("edit")}>Edit &amp; approve</button>
        )}
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
