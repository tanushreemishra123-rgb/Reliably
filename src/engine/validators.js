// Output validation. Each validator inspects the running payload and returns
// { valid, detail }. Swap this file for JSON Schema / Zod / Valibot without
// touching the engine — the contract is all the engine depends on.

export const VALIDATORS = {
  // Every action item must name an owner (may be "UNASSIGNED", but not blank).
  meeting: (p) => {
    const items = p.actionItems || [];
    const bad = items.filter((i) => !i.owner || String(i.owner).trim() === "");
    return bad.length === 0
      ? { valid: true, detail: "Every action item has an owner" }
      : { valid: false, detail: `${bad.length} action item(s) missing an owner` };
  },

  // Classification confidence must clear a threshold.
  confidence: (p, threshold = 0.7) => {
    const c = p.confidence ?? 0;
    return c >= threshold
      ? { valid: true, detail: `confidence ${c} ≥ ${threshold}` }
      : { valid: false, detail: `confidence ${c} below ${threshold}` };
  },

  // The answer must be grounded in retrieved evidence.
  grounded: (p) =>
    p.grounded
      ? { valid: true, detail: "Answer is grounded in evidence" }
      : { valid: false, detail: "Answer is not grounded" },

  // Extracted record must match the schema: name & email are non-empty strings,
  // amount is a real number. Catches invalid JSON / missing-field / wrong-type.
  schema: (p) => {
    const r = p.record || {};
    const errs = [];
    if (!r.name || typeof r.name !== "string") errs.push("name");
    if (!r.email || typeof r.email !== "string" || !r.email.trim()) errs.push("email");
    if (typeof r.amount !== "number" || Number.isNaN(r.amount)) errs.push("amount");
    return errs.length
      ? { valid: false, detail: `invalid/missing fields: ${errs.join(", ")}` }
      : { valid: true, detail: "All required fields present and well-typed" };
  },
};

export function runValidator(check, payload, threshold) {
  return check === "confidence"
    ? VALIDATORS.confidence(payload, threshold)
    : VALIDATORS[check](payload);
}

// Repair strategies used by validator onFail:"repair".
export function repair(check, p) {
  if (check === "meeting") {
    p.actionItems = (p.actionItems || []).map((i) => ({ ...i, owner: i.owner || "UNASSIGNED" }));
    return "Filled missing owners with UNASSIGNED";
  }
  if (check === "schema") {
    const r = (p.record = p.record || {});
    if (typeof r.amount !== "number") {
      const n = Number(String(r.amount).replace(/[^0-9.\-]/g, ""));
      r.amount = Number.isNaN(n) ? 0 : n;
    }
    if (!r.name || typeof r.name !== "string") r.name = "UNKNOWN";
    if (!r.email || !String(r.email).trim()) r.email = "unknown@example.com";
    return "Coerced amount and filled missing fields with safe defaults";
  }
  return "No repair available for this check";
}
