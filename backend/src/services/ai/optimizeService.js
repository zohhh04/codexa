/**
 * AI Code Optimizer — detect inefficiency, show before/after + complexity delta.
 */
const { tryAI } = require('./offline');

const SYSTEM = `You are Codexa AI, a performance expert. Given code + language, respond with STRICT JSON: {"issues": [{"title": "<short>", "detail": "<why slow>"}], "optimizedCode": "<full improved program>", "before": {"time": "O(..)", "space": "O(..)"}, "after": {"time": "O(..)", "space": "O(..)"}, "summary": "<2-3 sentences>"}. Only flag real inefficiencies visible in the code.`;

const RULES = [
  {
    test: (c) => /for\s*\([^;]*;[^;]*;[^)]*\)\s*\{?\s*for\s*\(/.test(c) || /for.*:\s*\n\s+for/.test(c),
    title: 'Nested loops — possible O(n²)',
    detail: 'Two loops over the same data multiply work. A hash map / set lookup often reduces the inner scan to O(1), giving O(n) overall.',
    before: { time: 'O(n²)', space: 'O(1)' },
    after: { time: 'O(n)', space: 'O(n)' },
  },
  {
    test: (c) => /bubble|for\s*\(\s*(int\s+)?i.*\{\s*for\s*\(\s*(int\s+)?j/.test(c),
    title: 'Bubble-style sorting',
    detail: 'Hand-rolled quadratic sorts lose to the standard library (introsort / Timsort) at O(n log n). Prefer sort() unless teaching the algorithm.',
    before: { time: 'O(n²)', space: 'O(1)' },
    after: { time: 'O(n log n)', space: 'O(log n)' },
  },
  {
    test: (c) => /endl/.test(c),
    title: 'std::endl flushes every line',
    detail: 'endl flushes the output buffer each time — slow for large output. Use "\\n" and let the buffer flush once.',
    before: { time: 'O(n) + flushes', space: 'O(1)' },
    after: { time: 'O(n)', space: 'O(1)' },
  },
  {
    test: (c) => /cin\s*>>/.test(c) && !/sync_with_stdio\(false\)/.test(c),
    title: 'Unbuffered C++ input',
    detail: 'cin without fast-io sync off is much slower on large inputs. Add ios::sync_with_stdio(false); cin.tie(nullptr); or scan with scanf.',
    before: { time: 'O(n) slow IO', space: 'O(1)' },
    after: { time: 'O(n) fast IO', space: 'O(1)' },
  },
  {
    test: (c) => /fib.*recurs|def\s+fib.*:\s*\n.*fib\(.*-1.*fib\(.*-2/s.test(c),
    title: 'Exponential naive recursion',
    detail: 'Naive Fibonacci recursion recomputes the same values — O(2^n). Memoize or iterate for O(n) time and O(1) space.',
    before: { time: 'O(2^n)', space: 'O(n)' },
    after: { time: 'O(n)', space: 'O(1)' },
  },
  {
    test: (c) => /\+=\s*.*\+\s*".*"\s*\+|"\s*\+\s*\w+\s*\+\s*"/.test(c) && /for|while/.test(c),
    title: 'String building in a loop',
    detail: 'Repeated string concatenation copies the whole string each time — O(n²). Use a builder / join / StringBuilder for amortized O(n).',
    before: { time: 'O(n²)', space: 'O(n)' },
    after: { time: 'O(n)', space: 'O(n)' },
  },
];

async function optimizeCode({ sourceCode, language = 'cpp' }) {
  const ai = await tryAI(SYSTEM, `Language: ${language}\nCode:\n${sourceCode}`, true);
  if (ai && ai.parsed && ai.parsed.optimizedCode) {
    return { ...ai.parsed, engine: 'ai', model: ai.model };
  }
  const hits = RULES.filter((r) => r.test(sourceCode));
  if (hits.length === 0) {
    return {
      issues: [],
      optimizedCode: null,
      before: { time: '—', space: '—' },
      after: { time: '—', space: '—' },
      summary: 'No classic inefficiency patterns detected (nested loops, quadratic sorts, endl flushing, slow IO, naive recursion, loop string-concat). The code looks reasonably efficient for its task.',
      engine: 'offline',
    };
  }
  return {
    issues: hits.map((h) => ({ title: h.title, detail: h.detail })),
    optimizedCode: null,
    before: hits[0].before,
    after: hits[0].after,
    summary: `Found ${hits.length} optimization opportunit${hits.length > 1 ? 'ies' : 'y'}. The biggest win: ${hits[0].title}. Apply it, then re-run to confirm identical output. (Tip: configure AI_API_KEY for automatic rewritten code.)`,
    engine: 'offline',
  };
}

module.exports = { optimizeCode };
