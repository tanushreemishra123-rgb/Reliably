# Reliably - an AI Workflow Puzzle Lab

Build multi-step AI workflows, watch them break under realistic failures, and
repair them with **retries, fallbacks, validation, human review, and
checkpoint-resume**. Every puzzle runs fully offline against a deterministic
mock model - no API key required - and an optional live Claude provider drops in
behind the same interface.

**Stack:** React + Vite (JavaScript), with a custom **resumable state-machine**
workflow engine. No database, no paid services - runs entirely in the browser in
mock mode.

![architecture](docs/architecture.svg)

---

## Run it locally

Requires Node 18+.

```bash
npm install
npm run dev        # opens http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build
npm test           # headless engine + puzzle checks (no browser)
```

No environment variables, no accounts, and no network calls in the default
(mock) mode.

## Demo

> **Video:** https://www.loom.com/share/c1fb0b2b63054619a617d3556539b51f

The walkthrough covers selecting a puzzle, building and modifying a workflow,
running it normally, triggering a controlled failure, observing the failed step,
recovering with retry/fallback, validating structured output,
approving/editing/rejecting a human-review step, resuming from a checkpoint after
an interruption, reviewing the execution trace and reliability report, and
running entirely in mock AI mode.

---

## Solve your first puzzle in four steps

1. Open the app and pick **Fix the Meeting Summarizer**. Read the objective and
   the failure it will inject.
2. Make sure **Failure armed** is on, and press **Run workflow**. The AI step
   ships malformed output (action items with no owner). The **reliability report**
   grades it *not resilient* - nothing caught the problem.
3. Click **Validator** in the palette, move it above **Output** with the ↑ arrow,
   and set its check to `meeting` with *on fail: repair*.
4. Run again. The validator catches and repairs the bad output, every check turns
   green, and the puzzle is **solved**.

That loop - *run → see it fail → add the reliability block that handles it → run
again* - is the whole game. Each puzzle needs a different block.

---

## How it works

You assemble a workflow from **blocks** that run top-to-bottom, then press **Run**
and watch the execution trace fill in step by step. When a failure fires, you add
reliability blocks to catch and recover from it, then re-run until the reliability
report grades your workflow as resilient.

### The blocks

| Block | Purpose |
|-------|---------|
| **Input** | Commits the puzzle's sample input |
| **AI Model** | Runs an op (`summarize` / `classify` / `draft` / `extract` / `answer` / `plan`) on the `primary` or `fallback` model |
| **Tool / API** | Calls a simulated external source (Live Web Search, Cached Index, Data Warehouse) |
| **Retrieval** | Fetches grounding documents |
| **Condition** | Branches on a check (e.g. *has evidence?*) - continue, stop safely, or route to a human |
| **Validator** | Checks structured output (`meeting` owners / `schema` record / `confidence` ≥ threshold / `grounded`); on fail: repair, retry-previous, route-to-human, or stop |
| **Retry** | Re-runs the executable step above it, up to N attempts |
| **Fallback** | Swaps to a backup model/source when the step above fails |
| **Human Review** | Pauses for a person to approve, edit, or reject |
| **Output** | Emits the final result |

Retry and Fallback protect the executable block **directly above** them. A small,
well-designed block set is intentional - the recommended "Confidence Check",
"Approval Gate", "Safe Stop", and "Error Handler" blocks are expressed as
configurations of these (Validator with `confidence`; Human Review; Condition /
Validator `onFail: stop`; Retry / Fallback).

---

## Failure simulation and recovery

Failure injection is controlled by the **Failure armed** toggle and is fully
**deterministic** - the same failure fires at the same step on every run, so a
reviewer can reproduce each scenario exactly. Crucially, injection lives in the
**engine**, not the providers, so mock and live runs share identical
execution/failure/recovery behaviour.

| Puzzle | Injected failure | Recovery strategy you add |
|--------|------------------|---------------------------|
| Fix the Meeting Summarizer | Malformed output / missing required field | Validator (`meeting`) → repair or retry-previous |
| Approve Before Sending | *(design gap - no injected fault)* | Human Review gate before Output |
| Repair the Ticket Router | Low-confidence classification | Validator (`confidence`) → route to human |
| Validate the Data Extractor | Invalid JSON / wrong type / missing field | Validator (`schema`) → repair or retry-previous |
| Survive the Research Timeout | Tool / API timeout | Fallback → cached source |
| Ground the Knowledge Assistant | Empty retrieval result | Condition (`hasEvidence`) → stop safely (refuse) |
| Activate the Fallback | Primary model error (503) | Retry (max attempts) → Fallback model |
| Resume the Interrupted Mission | Mid-run interruption | Resume from last successful checkpoint |

**Recovery strategies supported:** retry with a max attempt count, fallback
model/tool, repair invalid output, safe default result, route to human review,
stop safely with a clear error, and resume from the last successful step.

---

## Validation and human review

A **Validator** can check required fields, data types, output format/schema, a
confidence threshold, or the presence of supporting evidence. Validation is a
small set of plain functions returning `{ valid, detail }`
(`src/engine/validators.js`), so it is trivially swappable for JSON Schema, Zod,
Valibot, etc. without touching the engine.

When validation fails, the workflow can **repair** the output, **retry** the
previous step, **route to human review**, or **stop safely** with a clear message.

A **Human Review** step pauses the run and records the reviewer's decision:
**approve**, **edit** (the message is pre-filled so you edit real text), or
**reject** (stops safely). The decision is written into the execution trace.

---

## Checkpoint-resume (puzzle 8)

The engine keeps a **rolling checkpoint** of the last successful step. In
*Resume the Interrupted Mission*, an expensive ingest step finishes and is
checkpointed; then the run is interrupted before planning. You choose:

- **Resume from checkpoint** - continues from the last successful step; the
  expensive ingest is **not** re-run.
- **Restart from beginning** - throws progress away and re-runs everything (works,
  but wasteful - the report flags it).

This is genuine resumption, not a re-run from the start: the engine restores the
checkpoint's cursor and payload, so already-completed work is preserved. The
report verifies the expensive step ran exactly once on resume (and twice on
restart).

---

## The execution trace

Every step is visible without touching any logs. Each trace entry shows its
label, **status**, and - when expanded - its input/output payload, error
information, validation result, and recovery note.

| Status | Meaning |
|--------|---------|
| `completed` | Step finished normally |
| `failed` | Step threw and the error is not yet handled |
| `valid` / `invalid` | Validator result |
| `recovered` | A retry, fallback, or repair rescued a failed/invalid step (attempt count shown as xN) |
| `paused` | Waiting for a human decision |
| `interrupted` | A simulated interruption struck before this step |
| `safe-stopped` | The workflow stopped safely with a clear reason |
| `skipped` | Not reached because of an upstream unhandled failure |

## The reliability report

After a run finishes, fails, or stops safely, the report grades the workflow with
green / green-red checks and a verdict, and surfaces: final status, output
validity, whether the injected failure was **handled / unhandled / none**, retry
count, whether a fallback was used, the human decision, and whether anything
shipped without oversight. It explicitly calls out both **successful recovery**
and **remaining weaknesses**, so you know exactly what to fix.

---

## The puzzles

| # | Puzzle | Difficulty | The lesson |
|---|--------|-----------|-----------|
| 1 | Fix the Meeting Summarizer | Beginner | Validate structured output; catch a malformed result |
| 2 | Approve Before Sending | Beginner | Gate an outbound message behind human review |
| 3 | Repair the Ticket Router | Intermediate | Route a low-confidence result to a human, don't auto-act |
| 4 | Validate the Data Extractor | Intermediate | Recover from invalid/malformed JSON via schema validation |
| 5 | Survive the Research Timeout | Intermediate | Recover from a tool timeout with a fallback source |
| 6 | Ground the Knowledge Assistant | Advanced | Refuse safely on empty retrieval instead of hallucinating |
| 7 | Activate the Fallback | Advanced | Retry a failing model, then fail over to a backup |
| 8 | Resume the Interrupted Mission | Advanced | Continue from the last successful step after an interruption |

Each puzzle module (`src/puzzles/*.js`) is self-contained: it defines its initial
blocks, sample input, expected output/schema, failure configuration, and
completion criteria. Add your own by dropping a module in and listing it in
`src/puzzles/index.js`.

---

## Optional: use a live Claude model

Click the provider badge (top-right) → **settings** → switch to **Claude (live)**
and paste an Anthropic API key. The key is held in memory only and never
persisted. The engine is unchanged - only the *content* of AI steps becomes real.

> **Failure scenarios stay simulated even in live mode.** A real model won't
> deterministically time out or return malformed JSON on command, so the engine
> keeps injecting failures for consistent, reviewable puzzles. The provider's
> only job is generating content. See `src/providers/README.md` for the contract.

> **Security note:** live mode calls the Anthropic API directly from the browser
> using the `anthropic-dangerous-direct-browser-access` header, which exposes the
> key to client-side code. That's fine for a local demo with a throwaway key. For
> anything real, proxy the calls through a small backend and remove that header.

---

## Architecture

```
UI (src/ui, App.jsx)
  builder · trace · review/interrupt · report
        │ stepOnce() / resume / decide          ▲ state
        ▼                                        │
ENGINE (src/engine) ── resumable async state machine
  createRun → stepOnce (one block/step)
  rolling checkpoint · retry/fallback · validators/conditions
  human pause (decisions map) · interrupt→resume · buildReport
  ── failure injection lives HERE, not in providers ──
        │ run(op, args)                          ▲ { value, note }
        ▼                                        │
PROVIDERS (src/providers) ── one interface, layered implementations
  getProvider(cfg) → mockProvider | anthropicProvider
  mockProvider delegates tool/retrieval ops to the tool simulator

PUZZLES (src/puzzles) feed the engine: initial() blocks,
  failure.plan(block, ctx), checkValid(payload), grade(report)
```

**Design decisions**

- **One block per `stepOnce` call.** The engine is a resumable state machine, not
  a run-to-completion function. That's what makes pause/resume, mid-run
  interruption, and step-by-step trace animation fall out naturally.
- **Failure injection lives in the engine, not the providers.** This is the key
  decision that lets mock and live share identical execution, validation, and
  recovery behaviour - every puzzle stays deterministic and reviewable no matter
  which model backs it.
- **Providers are pure content generators** behind a tiny `run(op, args)`
  contract, so adding OpenAI, a local model, etc. is a single file. The **tool
  simulator** (`src/providers/toolSimulator.js`) is a separate layer for
  tool/retrieval responses.
- **Validation is swappable.** `src/engine/validators.js` is plain functions
  returning `{ valid, detail }`; replace with JSON Schema / Zod without touching
  the engine.
- **No persistence, no build-time secrets.** State is in-memory React state;
  nothing is written to a database, disk, or localStorage.

### Where each requirement lives

| Requirement | Location |
|-------------|----------|
| Workflow builder UI | `src/App.jsx`, `src/ui/` |
| Workflow definitions | `src/puzzles/` |
| Execution engine (state machine) | `src/engine/engine.js` |
| Model provider | `src/providers/mockProvider.js`, `anthropicProvider.js`, `index.js` |
| Tool simulator | `src/providers/toolSimulator.js` |
| Validation logic | `src/engine/validators.js` |
| Failure & recovery logic | per-puzzle `failure.plan` + engine recovery branches |
| Human-review flow | `src/ui/ReviewPanel.jsx` + engine `human` handling |
| Execution trace | `src/ui/TracePanel.jsx` + engine trace entries |
| Reliability feedback | `src/ui/ReportCard.jsx` + `buildReport` / `grading.js` |

### Layout

```
src/
  engine/     blocks · validators · engine (state machine) · grading
  providers/  index (registry) · mockProvider · anthropicProvider · toolSimulator · README
  puzzles/    one module per puzzle + index
  ui/         styles (tokens+CSS) · ConfigEditor · TracePanel · ReviewPanel · ReportCard
  App.jsx     builder UI + async run driver
test/         headless engine + puzzle checks
docs/         architecture.svg
```

---

## Data & persistence

The app uses an **in-memory store only** - all state (the workflow you build, the
run and its trace, and your solved-puzzle count) lives in React state. **No
database is used**, in line with the challenge guidance that an in-memory store is
sufficient. The seed content (puzzles, sample inputs, mock model/tool responses)
is committed as code in `src/puzzles/` and `src/providers/`. Reloading the page
resets the lab; there is no cross-session persistence by design.

---

## Assumptions & known limitations

- **Linear workflows.** Blocks execute top-to-bottom. Conditions can stop or
  escalate but there's no arbitrary branching/DAG - deliberate, to keep the
  puzzles legible.
- **Simulated failures by design.** Even with a live model, failures are injected
  by the engine so puzzles behave identically every run.
- **Mock content is fixed** to a few scenarios (a meeting, a billing ticket, a
  revenue question, an invoice) - enough to make each reliability pattern land.
- **Live mode is browser-direct** and single-turn per op; production usage should
  proxy through a backend (see the security note above). `retrieve` / `research`
  fall back to fixtures in live mode.
- **No auth, multiplayer, or saved progress.** Reloading resets the lab.

---

## Security

The default mock mode makes zero network calls and needs no key. The project was
scanned with OpenGrep/Semgrep and Trivy; see **`SECURITY.md`** for the full triage
(no unresolved Critical/High findings; the remaining low/informational items are
documented false positives).

---

## Testing

`npm test` drives the engine headlessly and asserts, for every puzzle, that the
intended solution grades **passed** and that the broken/naive version grades
**failed** - including that resume runs the expensive step once while restart runs
it twice, and that block ids stay unique across a session. **20 checks, no browser
required.**
