import React, { useState, useMemo, useRef } from "react";
import { PUZZLES } from "./puzzles/index.js";
import { BLOCKS, mk, uid, resetUid, describe } from "./engine/blocks.js";
import {
  createRun, stepOnce, resumeRunning, resumeFromCheckpoint, restartFromBeginning, buildReport,
} from "./engine/engine.js";
import { getProvider } from "./providers/index.js";
import { C, CSS, STATUS_COLOR } from "./ui/styles.js";
import ConfigEditor from "./ui/ConfigEditor.jsx";
import TracePanel from "./ui/TracePanel.jsx";
import { ReviewPanel, InterruptPanel } from "./ui/ReviewPanel.jsx";
import ReportCard from "./ui/ReportCard.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HALT = ["paused", "interrupted", "completed", "failed", "safe-stopped"];
const diffColor = { Beginner: C.ok, Intermediate: C.run, Advanced: C.fail };

export default function App() {
  const [pi, setPi] = useState(0);
  const puzzle = PUZZLES[pi];
  const [blocks, setBlocks] = useState(() => puzzle.initial());
  const [armed, setArmed] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [run, setRun] = useState(null);
  const [open, setOpen] = useState({});
  const [editText, setEditText] = useState("");
  const [prov, setProv] = useState({ mode: "mock", apiKey: "", model: "claude-sonnet-4-5" });
  const [showSettings, setShowSettings] = useState(false);
  const [solved, setSolved] = useState(() => new Set());

  const runRef = useRef(null);
  const driving = useRef(false);

  const buildCtx = (decisionsArg) => ({
    puzzle, blocks, armed, decisions: decisionsArg ?? decisions, provider: getProvider(prov),
  });

  async function drive(start, ctx) {
    if (driving.current) return;
    driving.current = true;
    let s = start;
    runRef.current = s; setRun(s);
    try {
      while (!HALT.includes(s.status)) {
        s = await stepOnce(s, ctx);
        runRef.current = s; setRun({ ...s });
        if (HALT.includes(s.status)) break;
        await sleep(prov.mode === "anthropic" ? 120 : 260);
      }
    } finally { driving.current = false; }
  }

  /* ---- lifecycle ---- */
  const loadPuzzle = (idx) => {
    resetUid(); setPi(idx); setBlocks(PUZZLES[idx].initial());
    setArmed(true); setShowHint(false); setDecisions({}); setRun(null); setOpen({});
  };
  const clearRun = () => { setRun(null); setDecisions({}); runRef.current = null; };
  const resetPuzzle = () => { setBlocks(puzzle.initial()); clearRun(); };

  /* ---- builder edits (any change invalidates the current run) ---- */
  const addBlock = (t) => { setBlocks((b) => [...b, mk(t)]); clearRun(); };
  const removeBlock = (id) => { setBlocks((b) => b.filter((x) => x.id !== id)); clearRun(); };
  const moveBlock = (id, dir) => {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id), j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const n = [...b]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
    clearRun();
  };
  const setCfg = (id, patch) => { setBlocks((b) => b.map((x) => x.id === id ? { ...x, config: { ...x.config, ...patch } } : x)); clearRun(); };

  /* ---- run controls ---- */
  const start = () => {
    if (!blocks.length) return;
    const s = { ...createRun(puzzle), status: "running" };
    setDecisions({}); setOpen({});
    drive(s, buildCtx({}));
  };
  const submitReview = (decision) => {
    const id = runRef.current.pausedBlockId;
    const d = { decision, text: decision === "edit" ? editText : undefined };
    const nd = { ...decisions, [id]: d };
    setDecisions(nd); setEditText("");
    drive(resumeRunning(runRef.current), buildCtx(nd));
  };
  const onResume = () => drive(resumeFromCheckpoint(runRef.current), buildCtx());
  const onRestart = () => drive(restartFromBeginning(runRef.current, puzzle), buildCtx());

  /* ---- derived ---- */
  const statusFor = (id) => {
    let s = null;
    if (run) for (const t of run.trace) if (t.blockId === id) s = t.status;
    if (!s && run && run.status === "running" && blocks[run.cursor]?.id === id) return "running";
    return s;
  };
  const terminal = run && ["completed", "failed", "safe-stopped"].includes(run.status);
  const reportData = useMemo(() => {
    if (!terminal) return null;
    const report = buildReport(run, puzzle);
    return { report, grade: puzzle.grade(report) };
  }, [terminal, run, puzzle]);
  const pausedEntry = run && run.status === "paused"
    ? [...run.trace].reverse().find((t) => t.blockId === run.pausedBlockId) : null;

  React.useEffect(() => {
    if (reportData?.grade?.passed) {
      setSolved((prev) => (prev.has(puzzle.id) ? prev : new Set(prev).add(puzzle.id)));
    }
  }, [reportData, puzzle.id]);
  const nextUnsolved = PUZZLES.findIndex((p, i) => i !== pi && !solved.has(p.id));

  return (
    <div className="rl-root">
      <style>{CSS}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="rl-wrap">

        <div className="rl-head">
          <div className="rl-brand">
            <div className="rl-logo">◇</div>
            <div>
              <h1 className="rl-title">Reliably</h1>
              <div className="rl-sub">A puzzle lab for building AI workflows that don't fall over.</div>
            </div>
          </div>
          <div className="rl-headright">
            <span className="rl-chip"><span className="rl-dot" style={{ color: C.ok }} /> <b>{solved.size}</b>/{PUZZLES.length} solved</span>
            <span className="rl-badge" data-live={prov.mode === "anthropic" ? 1 : 0} onClick={() => setShowSettings((s) => !s)}>
              <span className="rl-dot" /> {prov.mode === "anthropic" ? "Claude (live)" : "Mock AI mode"} · settings
            </span>
          </div>
        </div>

        <div className="rl-tabs">
          {PUZZLES.map((p, i) => (
            <button key={p.id} className="rl-tab" data-on={i === pi ? 1 : 0} onClick={() => loadPuzzle(i)}>
              <span className="rl-diff" style={{ color: diffColor[p.difficulty], border: `1px solid ${diffColor[p.difficulty]}55` }}>{p.difficulty[0]}</span>
              {p.title}
              {solved.has(p.id) && <span className="rl-solved">✓</span>}
            </button>
          ))}
        </div>

        <div className="rl-grid">
          {/* A — brief + palette */}
          <div>
            <div className="rl-card">
              <div className="rl-eyebrow">Puzzle {pi + 1} · {puzzle.difficulty}</div>
              <h2 className="rl-h">{puzzle.title}</h2>
              <p className="rl-p">{puzzle.objective}</p>
              <div className="rl-kv" style={{ marginBottom: 6 }}><b>Input</b> — {puzzle.sampleInput.label}</div>
              <div className="rl-mono" style={{ fontSize: 11.5, color: "#aeb9e0", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 9, marginBottom: 10 }}>{puzzle.sampleInput.value}</div>
              <div className="rl-kv"><b>Expected</b> — {puzzle.expected}</div>
              <div className="rl-fail">
                <div className="t">⚠ Failure scenario · {puzzle.failure.label}</div>
                <div className="d">{puzzle.failure.description}</div>
              </div>
              <button className="rl-hintbtn" onClick={() => setShowHint((s) => !s)}>{showHint ? "Hide hint" : "Show hint"}</button>
              {showHint && <div className="rl-hint">{puzzle.hint}</div>}

              {showSettings && (
                <div className="rl-settings">
                  <div className="rl-eyebrow" style={{ margin: 0 }}>Model provider</div>
                  <label className="rl-switch" style={{ justifyContent: "space-between" }} onClick={() => setProv((p) => ({ ...p, mode: p.mode === "mock" ? "anthropic" : "mock" }))}>
                    {prov.mode === "anthropic" ? "Claude (live)" : "Mock (offline)"}
                    <span className="rl-track" data-on={prov.mode === "anthropic" ? 1 : 0}><span className="rl-knob" /></span>
                  </label>
                  {prov.mode === "anthropic" && (
                    <>
                      <input type="password" placeholder="Anthropic API key (held in memory only)" value={prov.apiKey} onChange={(e) => setProv((p) => ({ ...p, apiKey: e.target.value }))} />
                      <input placeholder="model id" value={prov.model} onChange={(e) => setProv((p) => ({ ...p, model: e.target.value }))} />
                      <div className="rl-warn">Failure scenarios stay simulated for consistency. Direct browser calls expose your key — use a throwaway.</div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rl-card">
              <div className="rl-eyebrow">Add a block</div>
              <div className="rl-palette">
                {Object.entries(BLOCKS).map(([type, def]) => (
                  <button key={type} className="rl-pbtn" onClick={() => addBlock(type)}>
                    <span className="rl-glyph" style={{ background: def.accent }}>{def.glyph}</span>{def.name}
                  </button>
                ))}
              </div>
              <div className="rl-note">Blocks run top-to-bottom. Retry and Fallback protect the executable step directly above them.</div>
            </div>
          </div>

          {/* B — builder */}
          <div className="rl-card">
            <div className="rl-toolbar">
              <label className="rl-switch" onClick={() => { setArmed((a) => !a); clearRun(); }}>
                <span className="rl-track" data-on={armed ? 1 : 0}><span className="rl-knob" /></span>
                {armed ? "Failure armed" : "Failure off"}
              </label>
              <button className="rl-btn run" onClick={start} disabled={!blocks.length || (run && run.status === "running")}>▶ Run workflow</button>
              <button className="rl-btn ghost" onClick={clearRun} disabled={!run}>Clear run</button>
              <button className="rl-btn ghost" onClick={resetPuzzle}>Reset puzzle</button>
            </div>

            <div className="rl-flow">
              {!blocks.length && <div className="rl-empty">No blocks yet. Add some from the palette to build a workflow.</div>}
              {blocks.map((b, i) => {
                const def = BLOCKS[b.type];
                const st = statusFor(b.id);
                const sc = st ? STATUS_COLOR[st] : C.line;
                return (
                  <React.Fragment key={b.id}>
                    {i > 0 && <div className="rl-connector" />}
                    <div className="rl-block" data-live={st ? 1 : 0} data-run={st === "running" ? 1 : 0} style={{ "--sc": sc }}>
                      <div className="rl-brow">
                        <span className="rl-glyph" style={{ background: def.accent }}>{def.glyph}</span>
                        <div>
                          <div className="rl-bname">{def.name}</div>
                          <div className="rl-btype rl-mono">{describe(b)}</div>
                        </div>
                        {st && <span className="rl-status" style={{ color: sc }}>{st}</span>}
                        <div className="rl-bctl">
                          <button className="rl-ic" title="Move up" disabled={i === 0} onClick={() => moveBlock(b.id, -1)}>↑</button>
                          <button className="rl-ic" title="Move down" disabled={i === blocks.length - 1} onClick={() => moveBlock(b.id, 1)}>↓</button>
                          <button className="rl-ic" title="Remove" onClick={() => removeBlock(b.id)}>✕</button>
                        </div>
                      </div>
                      <ConfigEditor block={b} onChange={(patch) => setCfg(b.id, patch)} />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* C — trace + review + report */}
          <div>
            <div className="rl-card">
              <div className="rl-eyebrow">Execution trace</div>
              {!run && <div className="rl-empty">Run the workflow to watch each step execute, with its input, output, and status.</div>}
              {run && <TracePanel trace={run.trace} open={open} setOpen={setOpen} />}
              {run && run.status === "paused" && (
                <ReviewPanel entry={pausedEntry} editText={editText} setEditText={setEditText} onSubmit={submitReview} />
              )}
              {run && run.status === "interrupted" && (
                <InterruptPanel onResume={onResume} onRestart={onRestart} />
              )}
            </div>
            {reportData && <ReportCard report={reportData.report} grade={reportData.grade} armed={armed} />}
            {reportData?.grade?.passed && nextUnsolved >= 0 && (
              <div className="rl-next">
                🎉 Solved — {solved.size}/{PUZZLES.length} done.{" "}
                <a onClick={() => loadPuzzle(nextUnsolved)} style={{ color: C.ok, cursor: "pointer", textDecoration: "underline" }}>
                  Try “{PUZZLES[nextUnsolved].title}” →
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="rl-foot">
          Failure injection lives in the engine, so mock and live runs share the same execution, validation, and recovery flow — no API key needed to review any puzzle.
        </div>
      </div>
    </div>
  );
}
