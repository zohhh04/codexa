/**
 * Codexa — dynamic code optimization (educational).
 * Works on the user's ACTUAL source code (C, C++, Java, Python).
 * Detects only optimizations that really apply — never hardcoded examples.
 *
 * Techniques:
 *  - Constant Folding      (e.g. x = 10 * 5  →  x = 50)
 *  - Constant Propagation  (e.g. a = 10 … b = a + 5  →  b = 10 + 5)
 *  - Dead Code Elimination (unused assignments, code after return, if(false)/if(0))
 *  - Common Subexpression Elimination (same a+b computed twice)
 */

function safeEvalConst(expr) {
  // Only pure numeric expressions: digits, whitespace, + - * / % ( ) .
  if (!/^[\d\s+\-*/%().]+$/.test(expr)) return null;
  if (/\/\s*0(?!\d)/.test(expr)) return null; // avoid div-by-zero
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const v = fn();
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return Math.round(v * 1e6) / 1e6;
  } catch {
    return null;
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function optimizeSource(sourceCode) {
  const started = Date.now();
  const optimizations = [];
  let optimizedCode = sourceCode;

  // ---- 1. Constant folding: assignments with pure-constant RHS ----
  // Matches both `x = 2 + 3;` and `int x = 2 + 3;` / `x = 2 + 3` (python, no ;)
  const assignRe = /(?:^|(?<=[;{}\n]))\s*(?:(?:int|float|double|long|short|char|var|let|const|final)\s+)?([A-Za-z_]\w*)\s*=\s*([^;\n]+?)\s*(?=;|$)/g;
  const folds = [];
  let m;
  while ((m = assignRe.exec(sourceCode)) !== null) {
    const varName = m[1];
    const rhs = m[2].trim();
    if (!rhs || /["']/.test(rhs)) continue; // skip strings
    if (!/[+\-*/%]/.test(rhs)) continue; // needs an operator to fold
    if (!/^[\d\s+\-*/%().A-Za-z_]+$/.test(rhs)) continue;
    // RHS must be constants only (no identifiers left)
    if (/[A-Za-z_]/.test(rhs)) continue;
    const value = safeEvalConst(rhs);
    if (value === null) continue;
    const before = `${varName} = ${rhs};`;
    const after = `${varName} = ${value};`;
    folds.push({ varName, rhs, value, before, after, index: m.index });
  }
  for (const f of folds) {
    optimizations.push({
      type: 'Constant Folding',
      line: lineOf(sourceCode, f.index),
      before: f.before,
      after: f.after,
      explanation: `The expression ${f.rhs} was evaluated at compile time because all operands are constants.`,
    });
    optimizedCode = optimizedCode.split(f.rhs).join(String(f.value));
  }

  // ---- 2. Constant propagation: var = const … later use of var ----
  const constDecl = /(?:^|(?<=[;{}\n]))\s*(?:(?:int|float|double|long|short|char|var|let|const|final)\s+)?([A-Za-z_]\w*)\s*=\s*(\d+(?:\.\d+)?)\s*;?/g;
  const constMap = new Map();
  let d;
  while ((d = constDecl.exec(sourceCode)) !== null) {
    if (!constMap.has(d[1])) constMap.set(d[1], { value: d[2], index: d.index });
  }
  const propagatedLines = new Set();
  for (const [name, info] of constMap) {
    const useRe = new RegExp(`([A-Za-z_]\\w*)\\s*=\\s*([^;\\n]*\\b${name}\\b[^;\\n]*)`, 'g');
    let u;
    while ((u = useRe.exec(sourceCode)) !== null) {
      if (u.index <= info.index) continue; // only later uses
      const fullRhs = u[2].trim();
      if (/["']/.test(fullRhs)) continue;
      // Skip the declaration itself
      if (u[1] === name && fullRhs === info.value) continue;
      const before = `${u[1]} = ${fullRhs};`;
      if (propagatedLines.has(before)) continue; // one report per statement
      propagatedLines.add(before);
      const propagated = fullRhs.replace(new RegExp(`\\b${name}\\b`, 'g'), info.value);
      optimizations.push({
        type: 'Constant Propagation',
        line: lineOf(sourceCode, u.index),
        before,
        after: `${u[1]} = ${propagated};`,
        explanation: `Variable '${name}' is known to be ${info.value}, so its value was substituted directly into this expression.`,
      });
      break; // one example per constant keeps output clean
    }
  }

  // ---- 3. Dead code elimination ----
  // 3a. Assignments never read afterwards
  const assigned = [];
  const assignAll = /(?:^|(?<=[;{}\n]))\s*((?:(?:int|float|double|long|short|char|var|let|const|final)\s+)?([A-Za-z_]\w*)\s*=\s*[^;\n]+?)\s*(?=;|$)/g;
  let a;
  while ((a = assignAll.exec(sourceCode)) !== null) {
    assigned.push({ name: a[2], index: a.index, text: (a[1] || a[0]).trim() });
  }
  const readCounts = new Map();
  for (const item of assigned) {
    const after = sourceCode.slice(item.index + item.text.length);
    const reads = (after.match(new RegExp(`\\b${item.name}\\b`, 'g')) || []).length;
    readCounts.set(item, reads);
  }
  for (const [item, reads] of readCounts) {
    if (reads === 0 && assigned.filter((x) => x.name === item.name).length === 1) {
      // Skip the final assignment — it is likely the program's result/output.
      const isLast = assigned[assigned.length - 1] === item;
      if (isLast) continue;
      optimizations.push({
        type: 'Dead Code Elimination',
        line: lineOf(sourceCode, item.index),
        before: item.text.replace(/^[;{}\n\s]+/, ''),
        after: '// removed — value is never used',
        explanation: `Variable '${item.name}' is assigned but never read later, so the assignment can be removed.`,
      });
      break; // report first only — keeps results focused
    }
  }
  // 3b. Unreachable code after return
  const returnRe = /\breturn\b[^;\n]*;[ \t]*\n((?:[ \t]*[^\n]+\n?)+)/g;
  let r;
  while ((r = returnRe.exec(sourceCode)) !== null) {
    const next = r[1].split('\n').map((s) => s.trim()).filter((s) => s && s !== '}' && !s.startsWith('//'));
    if (next.length > 0 && !/^\}/.test(next[0])) {
      optimizations.push({
        type: 'Dead Code Elimination',
        line: lineOf(sourceCode, r.index),
        before: next[0],
        after: '// removed — unreachable after return',
        explanation: 'Statements after a return in the same block never execute and can be removed.',
      });
      break;
    }
  }
  // 3c. if (false) / if (0) blocks
  const falseIf = /\bif\s*\(\s*(false|0)\s*\)/g;
  let f;
  while ((f = falseIf.exec(sourceCode)) !== null) {
    optimizations.push({
      type: 'Dead Code Elimination',
      line: lineOf(sourceCode, f.index),
      before: f[0],
      after: '// removed — condition is always false',
      explanation: 'The if-condition is always false, so the whole branch can be removed.',
    });
    break;
  }

  // ---- 4. Common subexpression elimination ----
  const rhsCounts = new Map();
  const rhsFirst = new Map();
  const rhsRe = /(?:^|(?<=[;{}\n]))\s*(?:(?:int|float|double|long|short|char|var|let|const|final)\s+)?[A-Za-z_]\w*\s*=\s*([^;\n]+?)\s*;?/g;
  let c;
  while ((c = rhsRe.exec(sourceCode)) !== null) {
    const rhs = c[1].trim();
    if (rhs.length < 4 || !/[+\-*/%]/.test(rhs)) continue;
    if (/^\d+(\.\d+)?$/.test(rhs)) continue;
    if (/["']/.test(rhs)) continue;
    const key = rhs.replace(/\s+/g, ' ');
    rhsCounts.set(key, (rhsCounts.get(key) || 0) + 1);
    if (!rhsFirst.has(key)) rhsFirst.set(key, c.index);
  }
  for (const [expr, count] of rhsCounts) {
    if (count >= 2) {
      optimizations.push({
        type: 'Common Subexpression Elimination',
        line: lineOf(sourceCode, rhsFirst.get(expr)),
        before: `${expr}  (computed ${count} times)`,
        after: 't = ' + expr + '; … reuse t',
        explanation: `The expression '${expr}' appears ${count} times. Compute it once into a temporary and reuse it.`,
      });
      break; // one CSE report keeps output readable
    }
  }

  return {
    optimizations,
    optimizedCode: optimizations.length > 0 ? optimizedCode : sourceCode,
    stats: {
      total: optimizations.length,
      elapsedMs: Date.now() - started,
    },
  };
}

module.exports = { optimizeSource };
