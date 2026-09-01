// ============================================================================
// The execution engine.
//
// Unlike a run-to-completion function, this is a resumable state machine. It
// executes ONE block per `stepOnce` call, keeps a rolling checkpoint of the
// last successful step, and can genuinely resume from that checkpoint after a
// pause (human review) or a simulated interruption — without re-running the
// steps that already succeeded.
//
// Failure injection lives here, not in the providers, so mock and live runs
// share identical failure/recovery behaviour. Providers only generate content.
// ============================================================================
import { BLOCKS, EXECUTABLE, opName } from "./blocks.js";
import { runValidator, repair } from "./validators.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const TERMINAL = ["completed", "failed", "safe-stopped"];
const HALTED = ["paused", "interrupted", ...TERMINAL];

// ---- run state ------------------------------------------------------------
// `ctx` (puzzle, blocks, armed, decisions, provider) is passed to every call
// and is NOT part of the serializable state.
export function createRun(puzzle) {
  const payload = { input: puzzle.sampleInput.value };
  return {
    status: "ready",
    cursor: 0,
    payload,
    checkpoint: { cursor: 0, payload: clone(payload) },
    trace: [],
    pending: null,            // { blockId, error } — a thrown failure awaiting recovery
    pausedBlockId: null,      // block awaiting a human decision
    interruptBlockId: null,   // block where a simulated interruption struck
    flags: {
      retries: 0, fallbackUsed: false, humanUsed: false, humanDecision: null,
      injectedFired: false, recovered: false, hallucinated: false,
      survivedInterrupt: false, resumeChoice: null, opCounts: {},
    },
  };
}

// Ask the puzzle whether a failure should fire for this block, in this context.
function failureFor(ctx, block, { attempt = 1, model }) {
  if (!ctx.armed || !ctx.puzzle.failure?.plan) return null;
  return ctx.puzzle.failure.plan(block, { attempt, model }) || null;
}

// Run one executable block through the provider, applying any injected failure.
// Throws on "throw"-kind failures; mutates content on "mutate"-kind failures.
async function execProvider(state, ctx, block, attempt, modelOverride) {
  const op = opName(block);
  const model = modelOverride || block.config.model;
  const fp = failureFor(ctx, block, { attempt, model });

  if (fp?.kind === "throw") {
    state.flags.injectedFired = true;
    throw { type: fp.type, message: fp.message };
  }

  const r = await ctx.provider.run(op, {
    payload: state.payload,
    attempt,
    model,
    source: block.config.source,
  });
  state.flags.opCounts[op] = (state.flags.opCounts[op] || 0) + 1;

  if (fp?.kind === "mutate") {
    state.flags.injectedFired = true;
    return { ...r, value: fp.apply(r.value, { attempt }), injected: true };
  }
  return r;
}

const merge = (payload, r) => {
  const v = r && r.value ? r.value : r;
  if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(payload, v);
  return payload;
};

const label = (b) => b.label || BLOCKS[b.type].name;
const findPrevExec = (blocks, idx) => {
  for (let j = idx - 1; j >= 0; j--) if (EXECUTABLE.includes(blocks[j].type)) return blocks[j];
  return null;
};

function checkpoint(state) {
  state.checkpoint = { cursor: state.cursor, payload: clone(state.payload) };
}

// ---- the single-step reducer ---------------------------------------------
export async function stepOnce(prev, ctx) {
  // shallow-clone the parts we mutate so React sees a new object
  const s = {
    ...prev,
    trace: prev.trace.slice(),
    flags: { ...prev.flags, opCounts: { ...prev.flags.opCounts } },
    payload: prev.payload,
  };
  const { blocks, decisions } = ctx;
  const block = blocks[s.cursor];
  const push = (e) => s.trace.push(e);

  if (!block) { s.status = s.pending ? "failed" : "completed"; return s; }
  const base = { blockId: block.id, type: block.type, label: label(block) };

  // An open thrown failure that reaches a non-protector block is unhandled.
  if (s.pending && !["retry", "fallback"].includes(block.type)) {
    push({ ...base, status: "skipped", note: "Not reached — upstream failure unhandled" });
    s.status = "failed";
    s.cursor = blocks.length;
    return s;
  }

  switch (block.type) {
    case "input": {
      push({ ...base, status: "completed", output: s.payload.input, note: "Sample input committed" });
      s.cursor++; checkpoint(s); break;
    }

    case "ai":
    case "tool":
    case "retrieval": {
      // simulated interruption strikes *before* this step runs
      const fp = failureFor(ctx, block, { attempt: 1, model: block.config.model });
      if (fp?.kind === "interrupt" && !s.flags.survivedInterrupt) {
        s.flags.injectedFired = true;
        s.interruptBlockId = block.id;
        push({ ...base, status: "interrupted", note: "Mission interrupted before this step ran" });
        s.status = "interrupted";
        return s; // cursor stays; checkpoint preserved at last success
      }
      try {
        const r = await execProvider(s, ctx, block, 1);
        merge(s.payload, r);
        push({ ...base, status: "completed", output: r.value, note: r.note, attempts: 1 });
        s.cursor++; checkpoint(s);
      } catch (err) {
        s.pending = { blockId: block.id, error: err };
        push({ ...base, status: "failed", error: err.message, note: `${err.type} on attempt 1`, attempts: 1 });
        s.cursor++;
      }
      break;
    }

    case "retry": {
      const target = findPrevExec(blocks, s.cursor);
      if (!s.pending || !target) {
        push({ ...base, status: "idle", note: s.pending ? "No matching step to retry" : "Previous step already succeeded" });
        s.cursor++; break;
      }
      const max = Math.max(1, block.config.maxAttempts);
      let attempt = 1, ok = false, lastErr = s.pending.error;
      while (attempt < max && !ok) {
        attempt++;
        try { merge(s.payload, await execProvider(s, ctx, target, attempt)); ok = true; }
        catch (e) { lastErr = e; }
      }
      s.flags.retries += attempt - 1;
      if (ok) {
        s.flags.recovered = true; s.pending = null;
        markLast(s.trace, target.id, "recovered");
        push({ ...base, status: "recovered", note: `Step succeeded on attempt ${attempt}`, attempts: attempt });
        s.cursor++; checkpoint(s);
      } else {
        s.pending.error = lastErr;
        push({ ...base, status: "failed", error: lastErr.message, note: `Exhausted ${max} attempts`, attempts: max });
        s.cursor++;
      }
      break;
    }

    case "fallback": {
      const target = findPrevExec(blocks, s.cursor);
      if (!s.pending || !target) { push({ ...base, status: "idle", note: "Primary step succeeded — fallback not needed" }); s.cursor++; break; }
      try {
        const r = await execProvider(s, ctx, target, 1, "fallback");
        merge(s.payload, r);
        s.flags.fallbackUsed = true; s.flags.recovered = true; s.pending = null;
        markLast(s.trace, target.id, "recovered");
        push({ ...base, status: "recovered", output: r.value, note: `Fallback engaged: ${r.note}` });
        s.cursor++; checkpoint(s);
      } catch (err) {
        s.pending.error = err;
        push({ ...base, status: "failed", error: err.message, note: "Fallback also failed" });
        s.cursor++;
      }
      break;
    }

    case "validator": {
      const v = runValidator(block.config.check, s.payload, block.config.threshold);
      if (v.valid) { push({ ...base, status: "valid", note: v.detail }); s.cursor++; checkpoint(s); break; }

      const policy = block.config.onFail;
      if (policy === "repair") {
        const msg = repair(block.config.check, s.payload);
        const v2 = runValidator(block.config.check, s.payload, block.config.threshold);
        if (v2.valid) {
          s.flags.recovered = true;
          push({ ...base, status: "recovered", note: `Invalid → repaired. ${msg}`, output: { repaired: true, ...v2 } });
          s.cursor++; checkpoint(s);
        } else {
          push({ ...base, status: "safe-stopped", note: `Could not repair (${v.detail}) — stopped safely` });
          s.status = "safe-stopped"; s.cursor = blocks.length;
        }
      } else if (policy === "retryPrev") {
        const target = findPrevExec(blocks, s.cursor);
        if (target) { merge(s.payload, await execProvider(s, ctx, target, 2)); s.flags.retries += 1; }
        const v2 = runValidator(block.config.check, s.payload, block.config.threshold);
        if (v2.valid) {
          s.flags.recovered = true;
          push({ ...base, status: "recovered", note: `Invalid → re-ran previous step → ${v2.detail}` });
          s.cursor++; checkpoint(s);
        } else {
          push({ ...base, status: "failed", note: `Still invalid: ${v2.detail}` });
          s.status = "failed"; s.cursor = blocks.length;
        }
      } else if (policy === "human") {
        const d = decisions[block.id];
        if (!d) {
          push({ ...base, status: "paused", note: `Validation failed (${v.detail}) — awaiting human review`, review: { kind: "validator", payload: clone(s.payload) } });
          s.status = "paused"; s.pausedBlockId = block.id;
          return s; // cursor stays; re-enters this block once a decision exists
        }
        applyHuman(s, block, d, base, push);
        if (d.decision === "reject") { s.status = "safe-stopped"; s.cursor = blocks.length; }
        else { s.cursor++; checkpoint(s); }
      } else { // stop
        push({ ...base, status: "safe-stopped", note: `Stopped safely: ${v.detail}` });
        s.status = "safe-stopped"; s.cursor = blocks.length;
      }
      break;
    }

    case "condition": {
      const ok = block.config.check === "hasEvidence" ? (s.payload.evidence || []).length > 0 : true;
      if (ok) { push({ ...base, status: "completed", note: "Condition met — continuing" }); s.cursor++; checkpoint(s); break; }
      if (block.config.onFalse === "human") {
        const d = decisions[block.id];
        if (!d) {
          push({ ...base, status: "paused", note: "Condition failed — awaiting human", review: { kind: "condition", payload: clone(s.payload) } });
          s.status = "paused"; s.pausedBlockId = block.id; return s;
        }
        applyHuman(s, block, d, base, push); s.cursor++; checkpoint(s);
      } else {
        s.payload.answer = "I can't answer this safely — no supporting evidence was found.";
        s.payload.grounded = true;
        push({ ...base, status: "safe-stopped", note: "No evidence — refused instead of guessing" });
        s.status = "safe-stopped"; s.cursor = blocks.length;
      }
      break;
    }

    case "human": {
      const d = decisions[block.id];
      if (!d) {
        push({ ...base, status: "paused", note: "Waiting for reviewer", review: { kind: "message", payload: clone(s.payload) } });
        s.status = "paused"; s.pausedBlockId = block.id; return s;
      }
      applyHuman(s, block, d, base, push);
      if (d.decision === "reject") { s.status = "safe-stopped"; s.cursor = blocks.length; }
      else { s.cursor++; checkpoint(s); }
      break;
    }

    case "output": {
      if (s.payload.grounded === false) s.flags.hallucinated = true;
      push({ ...base, status: "completed", output: cleanPayload(s.payload), note: "Final result emitted" });
      s.cursor++; checkpoint(s);
      break;
    }
  }

  if (s.cursor >= blocks.length && !HALTED.includes(s.status)) s.status = s.pending ? "failed" : "completed";
  else if (!HALTED.includes(s.status)) s.status = "running";
  s.pausedBlockId = s.status === "paused" ? s.pausedBlockId : null;
  return s;
}

// ---- control operations ---------------------------------------------------
// Record a human decision; the paused block re-runs on the next step and picks
// it up from ctx.decisions.
export function resumeRunning(prev) {
  return { ...prev, status: "running", pausedBlockId: null };
}

// #8 — resume from the last successful checkpoint after an interruption.
export function resumeFromCheckpoint(prev) {
  return {
    ...prev,
    status: "running",
    interruptBlockId: null,
    cursor: prev.checkpoint.cursor,
    payload: clone(prev.checkpoint.payload),
    flags: { ...prev.flags, survivedInterrupt: true, resumeChoice: "resume" },
  };
}

// #8 — the wasteful alternative: throw away progress and start over.
export function restartFromBeginning(prev, puzzle) {
  const fresh = createRun(puzzle);
  return {
    ...fresh,
    trace: prev.trace.concat([{ blockId: "_divider", type: "note", label: "↺ Restarted from the beginning", status: "idle", note: "All prior progress discarded" }]),
    status: "running",
    flags: { ...fresh.flags, ...carry(prev.flags), survivedInterrupt: true, resumeChoice: "restart" },
  };
}
const carry = (f) => ({ opCounts: { ...f.opCounts }, injectedFired: f.injectedFired, retries: f.retries });

function applyHuman(s, block, d, base, push) {
  s.flags.humanUsed = true;
  s.flags.humanDecision = d.decision;
  if (d.decision === "approve") {
    s.payload.approved = true;
    push({ ...base, status: "completed", note: "Human approved", output: { decision: "approved" } });
  } else if (d.decision === "edit") {
    s.payload.approved = true;
    if (typeof s.payload.draft !== "undefined") s.payload.draft = d.text;
    if (typeof s.payload.answer !== "undefined") s.payload.answer = d.text;
    s.payload.edited = d.text;
    push({ ...base, status: "completed", note: "Human edited then approved", output: { decision: "edited", text: d.text } });
  } else {
    s.flags.recovered = true;
    push({ ...base, status: "safe-stopped", note: "Human rejected — stopped safely", output: { decision: "rejected" } });
  }
}

function markLast(trace, blockId, status) {
  for (let i = trace.length - 1; i >= 0; i--) if (trace[i].blockId === blockId) { trace[i].status = status; return; }
}

function cleanPayload(p) {
  const { input, grounded, model, edited, injected, ...rest } = p;
  return Object.keys(rest).length ? rest : p;
}

// Convenience: derive the reliability report once a run is terminal.
export function buildReport(state, puzzle) {
  const f = state.flags;
  const outputValid = puzzle.checkValid(state.payload);
  return {
    status: state.status,
    completed: state.status === "completed",
    safeStopped: state.status === "safe-stopped",
    unhandled: state.status === "failed",
    outputValid,
    retries: f.retries,
    fallbackUsed: f.fallbackUsed,
    humanUsed: f.humanUsed,
    humanDecision: f.humanDecision,
    injectedFired: f.injectedFired,
    recovered: f.recovered,
    hallucinated: f.hallucinated,
    resumeChoice: f.resumeChoice,
    opCounts: f.opCounts,
    payload: state.payload,
  };
}
