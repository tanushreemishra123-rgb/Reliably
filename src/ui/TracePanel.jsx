import React from "react";
import { STATUS_COLOR, C, fmt } from "./styles.js";

// The execution trace: one entry per executed step, expandable to show payloads.
export default function TracePanel({ trace, open, setOpen }) {
  return (
    <div className="rl-trace">
      {trace.map((t, i) => {
        const sc = STATUS_COLOR[t.status] || C.mut;
        const isOpen = open[i];
        const hasBody = t.output !== undefined || t.error;
        return (
          <div className="rl-te" key={i}>
            <div className="rl-tehead" onClick={() => hasBody && setOpen((o) => ({ ...o, [i]: !o[i] }))}>
              <span className="rl-tick" data-run={t.status === "running" ? 1 : 0} style={{ background: sc, boxShadow: `0 0 7px ${sc}` }} />
              <div>
                <div className="rl-tename">{t.label} <span style={{ color: sc, fontWeight: 500 }}>· {t.status}</span></div>
                {t.note && <div className="rl-tenote">{t.note}</div>}
              </div>
              {t.attempts > 1 && <span className="rl-attempt rl-mono">×{t.attempts}</span>}
              {hasBody && <span style={{ marginLeft: t.attempts > 1 ? 8 : "auto", color: C.mut2, fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>}
            </div>
            {isOpen && hasBody && (
              <div className="rl-tebody">
                {t.error && <div className="rl-code rl-mono" style={{ color: C.fail }}>⚠ {t.error}</div>}
                {t.output !== undefined && <div className="rl-code rl-mono">{fmt(t.output)}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
