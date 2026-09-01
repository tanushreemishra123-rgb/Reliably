// Design tokens + the global stylesheet, kept in one place so the palette is
// easy to retune. Theme: a dark "control room" for wiring up AI plumbing.
export const C = {
  bg: "#0e1524", bg2: "#0a0f1c", panel: "#151d31", panel2: "#1b2640",
  line: "#28345a", line2: "#354268", ink: "#e8ecfb", mut: "#8a97bd", mut2: "#5f6d94",
  ai: "#8b7bf6", tool: "#4cc4f0", ok: "#3ddc97", run: "#f4b942", fail: "#f66d93",
  human: "#67d0ff", recov: "#b39bff", stop: "#2dd4bf",
};

export const STATUS_COLOR = {
  pending: C.mut2, running: C.run, completed: C.ok, failed: C.fail, paused: C.human,
  retrying: C.run, recovered: C.recov, "safe-stopped": C.stop, interrupted: "#ffa653",
  skipped: "#3a456b", idle: C.mut2, valid: C.ok, invalid: C.fail,
};

export const CSS = `
* { box-sizing: border-box; }
.rl-root {
  --bg:${C.bg}; --panel:${C.panel}; --panel2:${C.panel2}; --line:${C.line}; --ink:${C.ink}; --mut:${C.mut};
  background:${C.bg}; color:var(--ink);
  font-family:"Space Grotesk",ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  min-height:100vh; padding:20px; line-height:1.45;
}
.rl-mono { font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; }
.rl-wrap { max-width:1280px; margin:0 auto; }
.rl-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
.rl-brand { display:flex; align-items:center; gap:14px; }
.rl-logo { width:40px; height:40px; border-radius:11px; display:grid; place-items:center;
  background:linear-gradient(150deg,${C.ai},${C.tool}); color:#0a0f1c; font-size:22px; font-weight:700; box-shadow:0 6px 22px -8px ${C.ai}; }
.rl-title { font-size:26px; font-weight:600; letter-spacing:-0.02em; margin:0; }
.rl-sub { color:var(--mut); font-size:13px; margin-top:2px; }
.rl-badge { font-size:11px; letter-spacing:.04em; padding:5px 11px; border-radius:999px; border:1px solid ${C.line2};
  color:${C.ok}; background:#0f1a1a; display:inline-flex; gap:6px; align-items:center; cursor:pointer; }
.rl-badge[data-live="1"] { color:${C.ai}; background:#151033; border-color:${C.ai}66; }
.rl-dot { width:7px; height:7px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor; }
.rl-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
.rl-tab { border:1px solid var(--line); background:var(--panel); color:var(--mut); padding:9px 13px; border-radius:10px;
  font-size:13px; cursor:pointer; transition:.15s; font-family:inherit; display:flex; gap:8px; align-items:center; }
.rl-tab:hover { border-color:${C.line2}; color:var(--ink); }
.rl-tab[data-on="1"] { color:var(--ink); border-color:${C.ai}; background:var(--panel2); box-shadow:inset 0 0 0 1px ${C.ai}44; }
.rl-diff { font-size:10px; padding:2px 6px; border-radius:5px; letter-spacing:.03em; }
.rl-grid { display:grid; grid-template-columns:300px 1fr 388px; gap:16px; align-items:start; }
@media (max-width:1080px){ .rl-grid { grid-template-columns:1fr; } }
.rl-card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; }
.rl-card + .rl-card { margin-top:14px; }
.rl-eyebrow { font-size:11px; letter-spacing:.08em; color:var(--mut); text-transform:uppercase; margin-bottom:9px; }
.rl-h { font-size:16px; font-weight:600; margin:0 0 6px; letter-spacing:-0.01em; }
.rl-p { font-size:13px; color:#c4cdec; margin:0 0 8px; }
.rl-meta { font-size:12px; color:var(--mut); }
.rl-kv { font-size:12.5px; color:#cdd6f4; } .rl-kv b { color:var(--ink); font-weight:600; }
.rl-fail { border:1px solid ${C.fail}55; background:#1c1220; border-radius:10px; padding:10px 12px; margin-top:10px; }
.rl-fail .t { color:${C.fail}; font-size:12px; font-weight:600; display:flex; gap:7px; align-items:center; }
.rl-fail .d { color:#d9b6c6; font-size:12px; margin-top:4px; }
.rl-hintbtn { background:none; border:1px dashed ${C.line2}; color:var(--mut); font-size:12px; border-radius:8px; padding:7px 10px; cursor:pointer; width:100%; font-family:inherit; margin-top:10px; }
.rl-hintbtn:hover { color:var(--ink); border-color:${C.human}; }
.rl-hint { font-size:12.5px; color:#bcd; background:#0f1728; border:1px solid ${C.line}; border-radius:8px; padding:10px; margin-top:8px; }
.rl-palette { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.rl-pbtn { display:flex; align-items:center; gap:8px; border:1px solid var(--line); background:var(--panel2); color:var(--ink);
  border-radius:9px; padding:9px 10px; font-size:12.5px; cursor:pointer; font-family:inherit; transition:.12s; }
.rl-pbtn:hover { border-color:${C.line2}; transform:translateY(-1px); }
.rl-glyph { width:22px; height:22px; border-radius:6px; display:grid; place-items:center; font-size:13px; color:#0a0f1c; font-weight:700; flex:none; }
.rl-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
.rl-switch { display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--mut); cursor:pointer; user-select:none; border:1px solid var(--line); background:var(--panel); padding:8px 11px; border-radius:10px; }
.rl-track { width:34px; height:19px; border-radius:999px; background:#2a3252; position:relative; transition:.15s; flex:none; }
.rl-track[data-on="1"] { background:${C.fail}; }
.rl-knob { width:15px; height:15px; border-radius:50%; background:#e8ecfb; position:absolute; top:2px; left:2px; transition:.15s; }
.rl-track[data-on="1"] .rl-knob { left:17px; }
.rl-btn { border:none; border-radius:10px; padding:10px 16px; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit; transition:.14s; }
.rl-btn.run { background:linear-gradient(135deg,${C.ok},#2bb37c); color:#04140d; box-shadow:0 8px 22px -10px ${C.ok}; }
.rl-btn.run:hover { transform:translateY(-1px); }
.rl-btn.ghost { background:var(--panel2); color:var(--ink); border:1px solid var(--line); }
.rl-btn.ghost:hover { border-color:${C.line2}; }
.rl-btn:disabled { opacity:.5; cursor:default; transform:none; }
.rl-flow { display:flex; flex-direction:column; }
.rl-block { border:1px solid var(--line); background:var(--panel); border-radius:12px; padding:12px 13px; position:relative; transition:.18s; }
.rl-block[data-live="1"] { border-color:var(--sc); box-shadow:0 0 0 1px var(--sc)55,0 8px 26px -14px var(--sc); }
.rl-connector { width:2px; height:14px; margin:0 auto; background:linear-gradient(${C.line2},${C.line}); }
.rl-brow { display:flex; align-items:center; gap:10px; }
.rl-bname { font-size:13.5px; font-weight:600; }
.rl-btype { font-size:11px; color:var(--mut); }
.rl-status { margin-left:auto; font-size:10.5px; letter-spacing:.03em; padding:3px 8px; border-radius:6px; border:1px solid currentColor; text-transform:capitalize; font-weight:600; }
.rl-bctl { display:flex; gap:4px; margin-left:6px; }
.rl-ic { width:24px; height:24px; border-radius:6px; border:1px solid var(--line); background:var(--panel2); color:var(--mut); cursor:pointer; font-size:12px; display:grid; place-items:center; }
.rl-ic:hover { color:var(--ink); border-color:${C.line2}; } .rl-ic:disabled { opacity:.3; cursor:default; }
.rl-bcfg { display:flex; gap:8px; flex-wrap:wrap; margin-top:9px; padding-top:9px; border-top:1px solid var(--line); }
.rl-field { display:flex; flex-direction:column; gap:3px; }
.rl-field label { font-size:10px; color:var(--mut); letter-spacing:.03em; }
.rl-field select,.rl-field input { background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:7px; padding:5px 7px; font-size:12px; font-family:inherit; }
.rl-note { font-size:11.5px; color:var(--mut); margin-top:7px; }
.rl-empty { border:1px dashed var(--line2); border-radius:12px; padding:22px; text-align:center; color:var(--mut); font-size:13px; }
.rl-trace { display:flex; flex-direction:column; gap:7px; max-height:520px; overflow:auto; padding-right:4px; }
.rl-te { border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--panel); }
.rl-tehead { display:flex; align-items:center; gap:9px; padding:9px 11px; cursor:pointer; }
.rl-tick { width:9px; height:9px; border-radius:50%; flex:none; }
.rl-tename { font-size:12.5px; font-weight:600; }
.rl-tenote { font-size:11px; color:var(--mut); margin-top:1px; }
.rl-tebody { border-top:1px solid var(--line); padding:10px 11px; background:${C.bg2}; }
.rl-code { font-size:11px; white-space:pre-wrap; word-break:break-word; color:#bcd0f5; max-height:180px; overflow:auto; }
.rl-attempt { font-size:10px; color:${C.run}; margin-left:auto; }
.rl-review { border:1px solid ${C.human}66; background:#0e1a26; border-radius:12px; padding:14px; margin-top:12px; }
.rl-review.interrupt { border-color:#ffa65366; background:#231708; }
.rl-review h4 { margin:0 0 8px; font-size:14px; color:${C.human}; }
.rl-review.interrupt h4 { color:#ffb066; }
.rl-review .body { font-size:12.5px; color:#cfe4f5; background:${C.bg2}; border:1px solid var(--line); border-radius:8px; padding:9px; white-space:pre-wrap; }
.rl-review textarea { width:100%; margin-top:8px; background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px; font-family:inherit; font-size:12.5px; resize:vertical; }
.rl-rev-actions { display:flex; gap:8px; margin-top:10px; }
.rl-rev-actions button { flex:1; border-radius:9px; padding:9px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid var(--line); font-family:inherit; }
.b-approve { background:${C.ok}; color:#04140d; border:none; }
.b-edit { background:${C.human}; color:#042030; border:none; }
.b-reject { background:${C.fail}; color:#2a0713; border:none; }
.b-resume { background:${C.stop}; color:#03211d; border:none; }
.b-restart { background:var(--panel2); color:var(--ink); }
.rl-verdict { display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; margin-bottom:12px; }
.rl-verdict.pass { background:linear-gradient(135deg,#0e2a1f,#102a20); border:1px solid ${C.ok}66; }
.rl-verdict.fail { background:linear-gradient(135deg,#2a1420,#241120); border:1px solid ${C.fail}66; }
.rl-verdict .big { font-size:30px; }
.rl-vtitle { font-size:15px; font-weight:600; } .rl-vsub { font-size:12px; color:var(--mut); }
.rl-checks { display:flex; flex-direction:column; gap:6px; }
.rl-check { display:flex; align-items:center; gap:9px; font-size:12.5px; }
.rl-check .mk { width:18px; height:18px; border-radius:5px; display:grid; place-items:center; font-size:11px; flex:none; font-weight:700; }
.rl-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
.rl-stat { background:${C.bg2}; border:1px solid var(--line); border-radius:9px; padding:9px 10px; }
.rl-stat .n { font-size:17px; font-weight:600; } .rl-stat .l { font-size:10.5px; color:var(--mut); letter-spacing:.03em; }
.rl-settings { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:8px; }
.rl-settings input { background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px; font-size:12.5px; font-family:inherit; }
.rl-warn { font-size:11px; color:${C.run}; }
.rl-foot { color:${C.mut2}; font-size:11.5px; text-align:center; margin-top:22px; }
@keyframes pop { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
.rl-te,.rl-verdict,.rl-review { animation:pop .22s ease; }
@keyframes runpulse { 0%,100% { box-shadow:0 0 0 1px var(--sc)55; } 50% { box-shadow:0 0 0 1px var(--sc), 0 0 24px -6px var(--sc); } }
.rl-block[data-run="1"] { animation:runpulse 1s ease-in-out infinite; }
@keyframes tickpulse { 0%,100% { transform:scale(1); opacity:.85; } 50% { transform:scale(1.5); opacity:1; } }
.rl-tick[data-run="1"] { animation:tickpulse .8s ease-in-out infinite; }
.rl-solved { color:${C.ok}; margin-left:6px; font-size:11px; }
.rl-chip { font-size:11px; letter-spacing:.03em; padding:5px 11px; border-radius:999px; border:1px solid ${C.line2}; color:${C.mut}; background:${C.panel}; display:inline-flex; gap:6px; align-items:center; }
.rl-chip b { color:${C.ok}; font-weight:600; }
.rl-headright { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
@keyframes shine { from { background-position:-160% 0; } to { background-position:260% 0; } }
.rl-verdict.pass { position:relative; overflow:hidden; }
.rl-verdict.pass::after { content:""; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,${C.ok}22 50%,transparent 60%); background-size:200% 100%; animation:shine 1.6s ease-out 1; pointer-events:none; }
.rl-next { margin-top:10px; font-size:12px; color:${C.ok}; background:#0e2a1f; border:1px solid ${C.ok}44; border-radius:9px; padding:8px 10px; }
`;

export function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
