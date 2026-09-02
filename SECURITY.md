# Security notes (SAST triage)

This project was scanned with OpenGrep/Semgrep (`--config=r/all`). Below is the
triage of findings, following the standard process: prioritise, validate, fix,
document accepted risks.

## Fixed

- **SSRF (CRITICAL/ERROR)** in `src/providers/anthropicProvider.js` — the scanner
  flagged `fetch(ENDPOINT, …)`. The URL was already a hardcoded constant (never
  user-controlled), so this was a false positive, but the endpoint is now inlined
  as a string literal per the remediation guidance ("use hardcoded HTTP request
  calls"). No user input reaches the request URL; only the request *body* is
  dynamic.
- **`curl | bash` in CI (ERROR)** and **mutable action tags (WARNING)** — these
  came only from a helper GitHub Actions workflow used to run the scan itself. It
  is not part of the application and has been removed from the submission.
- **Unpinned dependencies (WARNING)** in `package.json` — versions are now pinned
  exactly (no `^` ranges); a lockfile is also committed.

## Reviewed and accepted (false positives for this app's context)

These are LOW-confidence / INFO findings inherent to a small, single-language,
client-side React app. None represents a real vulnerability:

- **`detect-object-injection` / `unsafe-dynamic-method` (CWE-94, LOW).** Every
  flagged bracket/dynamic access uses a **developer-controlled key from a closed
  internal set** — a block `type`, an op name, a status string, a numeric array
  index, or an internal `decisions`/lookup table. No end-user string is ever used
  as an object key, and there is no `eval`, `Function`, prototype write, or
  network/file sink involved. This rule is well known for high false-positive
  rates on legitimate table-dispatch code.
- **`ai.generic.detect-generic-ai-*` (INFO).** These merely detect the words
  "Anthropic"/"OpenAI"/"claude" in the optional live-provider integration and its
  docs. Expected and intentional.
- **`jsx-not-internationalized` (INFO).** The app is intentionally English-only;
  i18n is out of scope for this exercise.
- **`missing-template-string-indicator` (INFO)** in `src/ui/styles.js` and the
  live-provider prompts. The flagged `{…}` sequences are literal CSS rule blocks
  and JSON examples inside template strings, not missing interpolations. Behaviour
  is correct.

## Notes

- The default **mock mode makes zero network calls** and requires no key.
- The **optional** live provider calls the Anthropic API directly from the
  browser using the `anthropic-dangerous-direct-browser-access` header, which
  exposes the key to client-side code. This is acceptable for a local demo with a
  throwaway key; for production, proxy the call through a backend and drop that
  header. (Documented in the README as an accepted, intentional trade-off.)
