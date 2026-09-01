// Turns a list of [label, bool] checks into a graded result. Each puzzle
// supplies its own checks against the reliability report.
export function gradeChecks(checks) {
  const norm = checks.filter(Boolean);
  return {
    passed: norm.every((c) => c[1]),
    checks: norm.map(([label, ok]) => ({ label, ok })),
  };
}
