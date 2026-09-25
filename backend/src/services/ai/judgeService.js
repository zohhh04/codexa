/**
 * Code Evaluation / Judge — runs code against test cases with stdin.
 * Verdicts: Accepted | Wrong Answer | Time Limit Exceeded | Runtime Error | Compilation Error
 */
const { compileAndRun } = require('../compiler/clangService');

function norm(s) {
  return String(s ?? '').replace(/\r\n/g, '\n').trim().replace(/[ \t]+/g, ' ');
}

async function judge({ sourceCode, language = 'cpp', testcases = [], timeLimitMs = 2000 }) {
  const lang = language === 'js' ? 'javascript' : language;
  const results = [];
  let compileError = null;

  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];
    const started = Date.now();
    let out;
    try {
      // Per-case timeout: clamp the global 5s runner to the requested limit.
      out = await compileAndRun(sourceCode, lang, tc.stdin || '');
    } catch (err) {
      out = { compile: { success: false, diagnostics: [{ message: err.message }] }, run: { stdout: '', stderr: err.message, exitCode: 1, timedOut: false, elapsedMs: 0 } };
    }
    const elapsed = Date.now() - started;

    if (!out.compile.success) {
      compileError = out.compile.diagnostics;
      results.push({
        name: tc.name || `Case ${i + 1}`,
        kind: tc.kind || 'sample',
        verdict: 'Compilation Error',
        passed: false,
        stdin: tc.stdin || '',
        expected: tc.expected ?? '',
        actual: '',
        stderr: out.compile.diagnostics.map((d) => d.message).join('\n').slice(0, 1000),
        timeMs: elapsed,
      });
      // No point running the rest — compilation is deterministic.
      for (let j = i + 1; j < testcases.length; j++) {
        results.push({
          name: testcases[j].name || `Case ${j + 1}`,
          kind: testcases[j].kind || 'sample',
          verdict: 'Compilation Error',
          passed: false,
          stdin: testcases[j].stdin || '',
          expected: testcases[j].expected ?? '',
          actual: '',
          stderr: 'Skipped — compilation failed.',
          timeMs: 0,
        });
      }
      break;
    }

    const timedOut = out.run.timedOut || elapsed > timeLimitMs;
    let verdict;
    let passed = false;
    if (timedOut) {
      verdict = 'Time Limit Exceeded';
    } else if (out.run.exitCode !== 0) {
      verdict = 'Runtime Error';
    } else if (tc.expected !== undefined && tc.expected !== '' && norm(out.run.stdout) !== norm(tc.expected)) {
      verdict = 'Wrong Answer';
    } else if (tc.expected !== undefined && tc.expected !== '' && norm(out.run.stdout) === norm(tc.expected)) {
      verdict = 'Accepted';
      passed = true;
    } else {
      // No expected output — informational pass if it ran cleanly.
      verdict = 'Accepted';
      passed = true;
    }

    results.push({
      name: tc.name || `Case ${i + 1}`,
      kind: tc.kind || 'sample',
      verdict,
      passed,
      stdin: tc.stdin || '',
      expected: tc.expected ?? '',
      actual: out.run.stdout || '',
      stderr: out.run.stderr || '',
      timeMs: out.run.elapsedMs,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const overall = results.length === 0
    ? 'No Test Cases'
    : results.every((r) => r.verdict === 'Accepted')
      ? 'Accepted'
      : compileError
        ? 'Compilation Error'
        : results.some((r) => r.verdict === 'Time Limit Exceeded')
          ? 'Time Limit Exceeded'
          : results.some((r) => r.verdict === 'Runtime Error')
            ? 'Runtime Error'
            : 'Wrong Answer';

  return { overall, passed, total: results.length, results };
}

module.exports = { judge };
