/**
 * Code Explanation — summary + line-by-line walkthrough + complexity.
 * Offline heuristic describes each line shape; LLM gives the nuanced version.
 */
const { tryAI } = require('./offline');

const SYSTEM = `You are Codexa AI, a patient coding tutor. Explain the given program with STRICT JSON: {"summary": "<2-3 sentences>", "lines": [{"line": <number>, "code": "<code>", "meaning": "<simple explanation>"}], "timeComplexity": "O(..)", "spaceComplexity": "O(..)", "complexityReason": "<why>"}. Keep meanings beginner-friendly, one sentence each. Max 40 lines.`;

function heuristicLineMeaning(code, language) {
  const t = code.trim();
  if (!t) return 'Blank line — just spacing for readability.';
  if (/^(#include|import |from |package |using )/.test(t)) return 'Brings in a library so we can use its ready-made tools.';
  if (/class\s+Main/.test(t)) return 'Declares the Main class — Java starts the program here.';
  if (/public\s+static\s+void\s+main/.test(t)) return 'The entry point: the program starts running from this line.';
  if (/def\s+\w+\s*\(/.test(t)) return 'Defines a reusable function we can call later.';
  if (/if\s+__name__\s*==/.test(t)) return 'Runs the code below only when this file is executed directly.';
  if (/^\s*(for|while)\b/.test(t)) return 'A loop — repeats the indented block for each item/condition.';
  if (/^\s*if\b/.test(t)) return 'A condition — the block runs only when the test is true.';
  if (/^\s*elif\b|^\s*else\b/.test(t)) return 'The fallback branch when the earlier condition was false.';
  if (/return\b/.test(t)) return 'Sends a value back to the caller and exits the function.';
  if (/print|console\.log|cout|printf|System\.out/.test(t)) return 'Prints output so the user (or judge) can see the result.';
  if (/input\(|cin\s*>>|scanf|Scanner|readFileSync/.test(t)) return 'Reads input data provided to the program.';
  if (/sort|sorted/.test(t)) return 'Sorts the data into ascending order.';
  if (/^(int|long|double|float|char|bool|string|auto|var|let|const)\b/.test(t)) return 'Declares a variable — a named box holding a value.';
  if (/[+\-*/%]=|=\s*.+/.test(t) && /=/.test(t)) return 'Computes a value and stores it in a variable.';
  if (/^\s*[{}]\s*$/.test(t)) return 'A brace marking the start/end of a code block.';
  return 'Executes one step of the program logic.';
}

function heuristicExplain(sourceCode, language) {
  const rawLines = String(sourceCode).split('\n').slice(0, 40);
  const lines = rawLines.map((code, i) => ({
    line: i + 1,
    code: code.slice(0, 200),
    meaning: heuristicLineMeaning(code, language),
  }));
  const text = String(sourceCode);
  const hasNestedLoop = /for[^{]*\{[^}]*for|for.*:\s*\n\s+for/.test(text);
  const hasLoop = /\b(for|while)\b/.test(text);
  const hasSort = /sort/.test(text);
  const timeComplexity = hasNestedLoop ? 'O(n²)' : hasLoop ? 'O(n)' : 'O(1)';
  return {
    summary: `This ${language} program has ${rawLines.length} lines. It reads input, processes it step by step${hasLoop ? ' using loop(s)' : ''}${hasSort ? ' including sorting' : ''}, then prints the result.`,
    lines,
    timeComplexity,
    spaceComplexity: /\[\]|new\s+\w+\[|list|dict|map|vector/.test(text) ? 'O(n)' : 'O(1)',
    complexityReason: hasNestedLoop
      ? 'A loop inside another loop means work grows with n × n.'
      : hasLoop
        ? 'A single pass over n items means work grows linearly with n.'
        : 'No loops over the input — only a fixed amount of work.',
    engine: 'offline',
  };
}

async function explainCode({ sourceCode, language = 'cpp', level = 'beginner' }) {
  const ai = await tryAI(SYSTEM, `Language: ${language}\nLevel: ${level}\nProgram:\n${sourceCode}`, true);
  if (ai && ai.parsed && ai.parsed.summary) {
    return { ...ai.parsed, engine: 'ai', model: ai.model };
  }
  return heuristicExplain(sourceCode, language);
}

module.exports = { explainCode };
