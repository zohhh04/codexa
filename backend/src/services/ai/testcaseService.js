/**
 * Test Case Generation — sample + edge + large cases, deterministic offline.
 * If the prompt mentions arrays/two-sum style input, cases match that shape;
 * otherwise generic small/edge/large stdin strings are produced.
 */
const { tryAI } = require('./offline');

const SYSTEM = `You are Codexa AI, a test designer. Given a problem statement, respond with STRICT JSON: {"cases": [{"name": "<label>", "kind": "sample|edge|large", "stdin": "<input>", "expected": "<expected output or ''>"}]} with 6-9 cases mixing kinds. Keep inputs small except 1-2 large ones.`;

function offlineCases(prompt) {
  const p = prompt.toLowerCase();
  if (/two.?sum|pair.*sum/.test(p)) {
    return [
      { name: 'Sample', kind: 'sample', stdin: '4\n2 7 11 15\n9', expected: '0 1' },
      { name: 'Pair at end', kind: 'sample', stdin: '3\n3 2 4\n6', expected: '1 2' },
      { name: 'No solution', kind: 'edge', stdin: '2\n1 2\n10', expected: '-1 -1' },
      { name: 'Single element', kind: 'edge', stdin: '1\n5\n5', expected: '-1 -1' },
      { name: 'Negatives', kind: 'edge', stdin: '4\n-1 -2 -3 -4\n-6', expected: '1 3' },
      { name: 'Large (1000)', kind: 'large', stdin: `1000\n${Array.from({ length: 1000 }, (_, i) => i + 1).join(' ')}\n1999`, expected: '998 999' },
    ];
  }
  if (/sort/.test(p)) {
    return [
      { name: 'Sample', kind: 'sample', stdin: '5\n5 3 1 4 2', expected: '1 2 3 4 5' },
      { name: 'Already sorted', kind: 'edge', stdin: '4\n1 2 3 4', expected: '1 2 3 4' },
      { name: 'Single', kind: 'edge', stdin: '1\n42', expected: '42' },
      { name: 'Duplicates', kind: 'edge', stdin: '6\n3 1 3 1 2 2', expected: '1 1 2 2 3 3' },
      { name: 'Large (5000 desc)', kind: 'large', stdin: `5000\n${Array.from({ length: 5000 }, (_, i) => 5000 - i).join(' ')}`, expected: '' },
    ];
  }
  if (/palindrome/.test(p)) {
    return [
      { name: 'Sample yes', kind: 'sample', stdin: 'racecar', expected: 'YES' },
      { name: 'Sample no', kind: 'sample', stdin: 'hello', expected: 'NO' },
      { name: 'Empty', kind: 'edge', stdin: '', expected: 'YES' },
      { name: 'Single char', kind: 'edge', stdin: 'a', expected: 'YES' },
      { name: 'Sentence', kind: 'edge', stdin: 'A man a plan a canal Panama', expected: 'YES' },
      { name: 'Large', kind: 'large', stdin: `${'a'.repeat(5000)}b${'a'.repeat(5000)}`, expected: 'NO' },
    ];
  }
  if (/fibonacci/.test(p)) {
    return [
      { name: 'Sample n=7', kind: 'sample', stdin: '7', expected: '0 1 1 2 3 5 8' },
      { name: 'n=1', kind: 'edge', stdin: '1', expected: '0' },
      { name: 'n=0', kind: 'edge', stdin: '0', expected: '' },
      { name: 'n=10', kind: 'sample', stdin: '10', expected: '0 1 1 2 3 5 8 13 21 34' },
      { name: 'Large n=40', kind: 'large', stdin: '40', expected: '' },
    ];
  }
  return [
    { name: 'Sample', kind: 'sample', stdin: '5', expected: '' },
    { name: 'Minimal input', kind: 'edge', stdin: '0', expected: '' },
    { name: 'Empty input', kind: 'edge', stdin: '', expected: '' },
    { name: 'Large input', kind: 'large', stdin: `${Array.from({ length: 1000 }, (_, i) => i + 1).join(' ')}`, expected: '' },
  ];
}

async function generateTestcases({ prompt, count = 6 }) {
  const ai = await tryAI(SYSTEM, `Problem: ${prompt}\nWanted cases: ${count}`, true);
  if (ai && ai.parsed && Array.isArray(ai.parsed.cases) && ai.parsed.cases.length > 0) {
    return { cases: ai.parsed.cases.slice(0, 12), engine: 'ai', model: ai.model };
  }
  return { cases: offlineCases(prompt).slice(0, Math.max(3, Math.min(12, count))), engine: 'offline' };
}

module.exports = { generateTestcases };
