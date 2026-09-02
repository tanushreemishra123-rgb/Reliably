import React from "react";
import { C } from "./styles.js";

const Stat = ({ n, l, color }) => (
  <div className="rl-stat"><div className="n" style={{ color: color || C.ink }}>{n}</div><div className="l">{l}</div></div>
);

// The reliability summary shown when a run reaches a terminal state.
export default function ReportCard({ report, grade, armed }) {
  const r = report;
  const statusWord = r.completed ? "Completed" : r.safeStopped ? "Stopped safely" : "Failed";
  // A failure counts as handled if we recovered, safely stopped, or survived an
  // interruption via resume/restart.
  const handled = r.recovered || r.safeStopped || !!r.resumeChoice;
  return (
    <div className="rl-card">
      <div className="rl-eyebrow">Reliability report</div>
      <div className={`rl-verdict ${grade.passed ? "pass" : "fail"}`}>
        <div className="big">{grade.passed ? "🏆" : "🔧"}</div>
        <div>
          <div className="rl-vtitle">{grade.passed ? "Puzzle solved — resilient workflow" : "Not resilient yet"}</div>
          <div className="rl-vsub">{grade.passed ? "Every reliability check passed." : "Some checks failed — adjust your blocks and run again."}</div>
        </div>
      </div>

      <div className="rl-checks">
        {grade.checks.map((c, i) => (
          <div className="rl-check" key={i}>
            <span className="mk" style={{ background: c.ok ? `${C.ok}22` : `${C.fail}22`, color: c.ok ? C.ok : C.fail, border: `1px solid ${c.ok ? C.ok : C.fail}66` }}>{c.ok ? "✓" : "✕"}</span>
            <span style={{ color: c.ok ? "#cfe" : "#f0c4d2" }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="rl-stats">
        <Stat n={statusWord} l="final status" color={r.completed ? C.ok : r.safeStopped ? C.stop : C.fail} />
        <Stat n={r.outputValid ? "Valid" : "Invalid"} l="output" color={r.outputValid ? C.ok : C.fail} />
        <Stat n={r.retries} l="retry attempts" />
        <Stat n={r.fallbackUsed ? "Yes" : "No"} l="fallback used" color={r.fallbackUsed ? C.recov : C.mut} />
        <Stat n={r.humanUsed ? (r.humanDecision || "yes") : "No"} l="human decision" color={r.humanUsed ? C.human : C.mut} />
        <Stat
          n={!armed ? "Off" : !r.injectedFired ? "None" : (handled ? "Handled" : "Unhandled")}
          l="injected failure"
          color={!armed || !r.injectedFired ? C.mut : (handled ? C.ok : C.fail)}
        />
      </div>
    </div>
  );
}
