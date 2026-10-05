/**
 * Codexa AI — tutor service. Offline-first: always replies, with or
 * without AI_API_KEY. Precise: reads the exact editor code plus the
 * latest analysis diagnostics, so "how does my code work" and
 * "what are my errors" get line-specific answers.
 */
const { tryAI, engineOf } = require('./offline');

const TUTOR_SYSTEM = `You are Codexa AI, a patient programming tutor. Your job is to help students understand compiler concepts through their own code.
RULES:
1. Be encouraging and supportive.
2. Answer precisely about the given code and diagnostics — cite line numbers.
3. Keep responses focused — one concept at a time.
4. Suggest next steps for learning.
RESPONSE FORMAT (strict JSON):
{ "hint": "your hint or explanation (may use short lines)", "concept": "the core concept being taught", "nextSteps": ["suggestion1", "suggestion2"], "speakable": "plain-text version with no markdown, suitable for text-to-speech" }`;

function codeLines(sourceCode = '') {
  return String(sourceCode || '').split('\n');
}

function summarizeCode(sourceCode = '') {
  const code = String(sourceCode || '');
  const lines = code.split('\n');
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const hasMain = /main\s*\(/.test(code);
  const NOISE = new Set(['println', 'print', 'printf', 'ln', 'log', 'scanf', 'cout', 'cin']);
  const funcs = [...code.matchAll(/(?:int|float|double|char|void|long|short|auto|string|def\s+|public\s+static[^\n]*?|function\s+)([A-Za-z_]\w*)\s*\(/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i && !NOISE.has(v))
    .slice(0, 8);
  const loops = (code.match(/\b(for|while)\b/g) || []).length;
  const conds = (code.match(/\b(if|else|switch|case)\b/g) || []).length;
  const io = /cin|cout|scanf|printf|Scanner|System\.out|input\(|print\(|console\.log/.test(code);
  return { lines: lines.length, nonEmpty, hasMain, funcs, loops, conds, io };
}

function describeLine(raw, language = 'cpp') {
  const t = raw.trim();
  if (!t) return null;
  if (/^(\/\/|#|保卫)/.test(t) || (/^#/.test(t) && language === 'python')) return `comment — ignored by the compiler (${t.slice(0, 60)})`;
  if (/^\/\//.test(t) || /^\/\*/.test(t)) return 'comment — ignored by the compiler';
  if (/^#include/.test(t)) return 'brings in a library so you can use its functions';
  if (/^import\s+/.test(t)) return 'imports a library module';
  if (/^using\s+/.test(t)) return 'lets you use library names without a prefix';
  if (/^package\s+/.test(t)) return 'declares which package this file belongs to';
  if (/public\s+class\s+(\w+)/.test(t)) return `defines the class ${(t.match(/class\s+(\w+)/) || [])[1] || ''} — the container for your program`;
  if (/class\s+(\w+)/.test(t)) return 'defines a class — a blueprint holding code and data';
  if (/def\s+(\w+)\s*\(([^)]*)\)/.test(t)) {
    const m = t.match(/def\s+(\w+)\s*\(([^)]*)\)/);
    return `defines the function ${m[1]}(${m[2].trim() || 'no args'}) — runs only when called`;
  }
  if (/public\s+static\s+void\s+main/.test(t)) return 'the main method — where your Java program starts running';
  if (/int\s+main\s*\(/.test(t)) return 'the main function — where your program starts running';
  if (/\b(for|while)\b.*[:{(]/.test(t) || /^\s*for\b/.test(t) || /^\s*while\b/.test(t)) return `loop — repeats the block below it (${t.slice(0, 70)})`;
  if (/^\s*(if|elif|else if|else)\b/.test(t)) return `branch — runs the block only when its condition holds (${t.slice(0, 70)})`;
  if (/return\b/.test(t)) return `returns ${t.replace(/.*return\s*/, '').replace(/;.*$/, '').slice(0, 50) || 'from this function'} to the caller`;
  if (/cin\s*>>/.test(t)) return 'reads input from the keyboard into variable(s)';
  if (/scanf\s*\(/.test(t)) return 'reads input values from the keyboard';
  if (/input\s*\(/.test(t)) return 'reads a line of input from the user';
  if (/Scanner/.test(t) && /System\.in/.test(t)) return 'sets up keyboard input (Scanner)';
  if (/\.next(Int|Double|Line)?\s*\(\)/.test(t)) return 'reads the next input value';
  if (/cout\s*<</.test(t)) return 'prints output to the screen';
  if (/printf\s*\(/.test(t)) return 'prints formatted output to the screen';
  if (/System\.out\.println/.test(t)) return 'prints a line of output';
  if (/console\.log/.test(t)) return 'prints output to the console';
  if (/print\s*\(/.test(t)) return `prints ${t.replace(/.*print\s*\(/, '').replace(/\).*$/, '').slice(0, 60) || 'output'}`;
  if (/^[A-Za-z_][\w<>[\]]*\s+[A-Za-z_]\w*\s*=[^;]+;?/.test(t)) return `declares a variable and stores ${t.split('=').slice(1).join('=').trim().slice(0, 50)} in it`;
  if (/^[A-Za-z_]\w*\s*=[^=].*/.test(t)) return `assigns ${t.split('=').slice(1).join('=').trim().slice(0, 50)} to ${t.split('=')[0].trim()}`;
  if (/^\s*[{}]\s*$/.test(t)) return t.includes('{') ? 'opens a block { … }' : 'closes a block';
  if (/if\s*\(\s*(false|0)\s*\)/.test(t)) return 'a branch that never runs (condition is always false)';
  return `runs: ${t.slice(0, 80)}`;
}

function fixHint(d) {
  const msg = `${d.code || ''} ${d.message || ''}`.toLowerCase();
  if (/semicolon|semi/.test(msg)) return 'Fix: add a semicolon (;) at the end of that line.';
  if (/unclosed|unmatched|mismatch|bracket|brace|paren/.test(msg)) return 'Fix: count ( ) [ ] { } on that line — every opener needs its closer.';
  if (/colon/.test(msg)) return 'Fix: end the header line with a colon (:) and indent the block below.';
  if (/print/.test(msg) && /python/.test(msg)) return 'Fix: use print(...) with parentheses in Python 3.';
  if (/no main/.test(msg)) return 'Fix: add public static void main(String[] args) (Java) or int main() (C/C++).';
  if (/no class/.test(msg)) return 'Fix: wrap your code in "public class Main { … }".';
  if (/undeclared|not declared|unknown/.test(msg)) return 'Fix: declare the variable (e.g. int x = 0;) before using it, check spelling.';
  if (/type|mismatch|convert/.test(msg)) return 'Fix: make both sides the same type, or convert explicitly.';
  if (/indent|tab|space/.test(msg)) return 'Fix: use 4 spaces per level, consistently.';
  if (/unterminated|string/.test(msg)) return 'Fix: close the string with its matching quote on the same line.';
  if (/invalid|unexpected/.test(msg)) return 'Fix: remove or replace the highlighted character.';
  return 'Fix: read the message above, look at the exact line/column, correct it, then press Analyze again.';
}

function walkthrough(sourceCode, language, maxLines = 30) {
  const lines = codeLines(sourceCode);
  const out = [];
  const shown = [];
  lines.forEach((raw, idx) => {
    if (shown.length >= maxLines) return;
    if (!raw.trim()) return;
    const desc = describeLine(raw, language);
    if (!desc) return;
    shown.push(`Line ${idx + 1} \`${raw.trim().slice(0, 90)}\` — ${desc}.`);
  });
  return shown;
}

function offlineTutor({ question, sourceCode, language = 'cpp', diagnostics = [], context }) {
  const q = String(question || '');
  const ql = q.toLowerCase();
  const s = summarizeCode(sourceCode);
  const lines = codeLines(sourceCode);
  const real = (Array.isArray(diagnostics) ? diagnostics : []).filter(
    (d) => d && d.code !== 'LANG_LIMIT',
  );
  const errors = real.filter((d) => d.severity === 'error');
  const warnings = real.filter((d) => d.severity === 'warning');
  const pick = (concept, hint, nextSteps) => ({
    hint,
    concept,
    nextSteps,
    speakable: hint.replace(/[`*_#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 900),
  });

  // Specific line query: "what does line 5 do?"
  const lineAsk = ql.match(/line\s+(\d+)/);
  if (lineAsk) {
    const n = parseInt(lineAsk[1], 10);
    const raw = lines[n - 1];
    if (!raw || !raw.trim()) {
      return pick('Line lookup', `Line ${n} is empty or past the end — your code has ${s.lines} line(s). Tell me another line number.`, ['Ask about a non-empty line', 'Press Analyze to see all lines']);
    }
    const desc = describeLine(raw, language);
    const onLine = real.filter((d) => d.line === n).slice(0, 3);
    let hint = `Line ${n} \`${raw.trim().slice(0, 120)}\` — ${desc}.`;
    if (onLine.length) {
      hint += ` This line has ${onLine.length} issue(s): ` + onLine.map((d) => `${d.code}: ${d.message} ${fixHint(d)}`).join(' ');
    } else {
      hint += ' No errors are reported on this line.';
    }
    return pick('Line explanation', hint, ['Ask about another line', 'Ask "how does my code work?" for the full tour']);
  }

  // "How does my code work" → full precise walkthrough
  if (/how.*(work|run)|explain.*(code|program|line)|what.*(do|mean)|walkthrough|full.*(work|explain)|step.*by.*step|trace/.test(ql)) {
    if (!s.nonEmpty) {
      return pick('Reading code', 'Your editor is empty — write or generate some code first, then ask me again and I will walk through every line.', ['Generate a program', 'Type a Hello World']);
    }
    const steps = walkthrough(sourceCode, language);
    const head = [
      `Your ${language.toUpperCase()} program has ${s.nonEmpty} code line(s).`,
      s.funcs.length ? `It defines: ${s.funcs.join(', ')}.` : '',
      s.loops ? `It loops ${s.loops} time(s).` : 'It has no loops.',
      s.conds ? `It branches ${s.conds} time(s).` : 'It has no branches.',
      s.io ? 'It reads input and/or prints output.' : 'It does no input-output I can see.',
    ].filter(Boolean).join(' ');
    const hint = `${head}\n\n${steps.join('\n')}\n\nIn short: read top to bottom — setup first, then ${s.loops ? 'loops repeat work, ' : ''}${s.conds ? 'branches choose paths, ' : ''}and output appears at the end. Press Run with sample input to watch it happen.`;
    return pick('Code walkthrough', hint, ['Press Run with sample input', 'Ask "what are my errors?"']);
  }

  // "What are my errors" → precise diagnostics
  if (/error|wrong|fail|bug|fix|problem|issue|why.*(not|doesn)|red|diagnostic|warning/.test(ql)) {
    if (!s.nonEmpty) {
      return pick('Debugging', 'There is no code to check yet — write or generate a program, press Analyze, then ask me again.', ['Generate a program first']);
    }
    if (!errors.length && !warnings.length) {
      return pick('Debugging', `Good news — Analyze reports no errors in your ${s.nonEmpty}-line ${language.toUpperCase()} program. It should compile. If Run still fails, check: (1) did you type stdin for input-reading code? (2) is the right language selected? Press Run and read the compile diagnostics there.`, ['Press Run with sample input', 'Ask "how does my code work?"']);
    }
    const top = [...errors, ...warnings].slice(0, 6);
    const parts = top.map((d, i) => {
      const raw = (lines[(d.line || 1) - 1] || '').trim().slice(0, 100);
      return `${i + 1}. Line ${d.line} [${d.severity} ${d.code}] ${d.message}${raw ? ` — your code: \`${raw}\`` : ''} ${fixHint(d)}`;
    });
    const hint = `I read your editor (${s.nonEmpty} code lines, ${language.toUpperCase()}) and Analyze found ${errors.length} error(s), ${warnings.length} warning(s). ${parts.join('\n')}${errors.length > 6 ? `\n…and ${errors.length + warnings.length - 6} more — fix the first one first, later ones are often cascades.` : ''}\n\nStart with error #1, fix it, press Analyze again.`;
    return pick('Debugging your errors', hint, ['Fix error #1 then re-analyze', 'Ask "what does line N do?" for any line above']);
  }

  if (/token|lexical|lexer|lexing/.test(ql)) {
    const sample = lines.find((l) => l.trim()) || '';
    return pick('Lexical analysis', `Lexing turns your characters into tokens. Your code has ${s.nonEmpty} non-empty line(s) — press Analyze → Lexical to see every token. Example from your code, line 1: \`${sample.trim().slice(0, 100)}\` → keywords, identifiers, operators, literals and separators, each with line + column.`, ['Open the Lexical tab', 'Ask "what does line 1 do?"']);
  }
  if (/syntax|grammar|parse tree|ast|parser|parsing/.test(ql)) {
    const synCount = real.filter((d) => d.phase === 'syntax' || d.phase === 'lex' || d.phase === 'lexical').length;
    return pick('Syntax analysis & AST', `Syntax checks grammar: brackets, semicolons, block shape. Your code currently has ${synCount} syntax issue(s)${synCount ? ' — open the Syntax tab, each is listed once with line + fix.' : ' — the Syntax tab is clean.'} The AST tab then shows the tree structure; click a node to highlight its source lines.`, ['Open the Syntax tab', 'Open the AST tab']);
  }
  if (/semantic|type|undeclared|scope|meaning/.test(ql)) {
    const sem = real.filter((d) => d.phase === 'semantic').slice(0, 4);
    return pick('Semantic analysis', sem.length ? `Meaning check found ${sem.length} issue(s): ${sem.map((d) => `line ${d.line}: ${d.message}`).join('; ')}. These parse fine but are wrong in meaning (undeclared names, type clashes).` : `Semantic check is clean for your ${s.nonEmpty}-line program — no undeclared names or type clashes found.`, ['Open the Semantic tab', 'Try an undeclared variable to see one appear']);
  }
  if (/optim|fold|propagat|dead code|faster|subexpression/.test(ql)) {
    return pick('Code optimization', 'Press Optimize: it scans YOUR code for constant folding (10 * 5 → 50), propagation, dead code (unused assignments, code after return, if(false)) and repeated expressions. If it says "already optimal", try adding "int x = 10 * 5;" and re-run.', ['Press Optimize', 'Try "int x = 10 * 5;"']);
  }
  if (/run|compile|execute|output|stdin|input/.test(ql)) {
    return pick('Compiling & running', `Run compiles your exact ${language.toUpperCase()} code in a sandbox and runs it with your stdin.${s.io ? ' Your code reads input, so type values in the Run → stdin box first.' : ' Your code shows no input reading — it should run with empty stdin.'} A failing build lists compiler errors with line numbers in the Run tab.`, ['Type stdin and press Run', 'Ask "what are my errors?"']);
  }
  if (/voice|speak|aloud|read.*(out|aloud)|mic|talk|listen/.test(ql)) {
    return pick('Voice tutor', 'Voice mode is ready in the tutor panel: choose Voice or Both, press "Explain aloud" to hear your code walked through line by line, or tap the mic and ask out loud — I answer in chat and, in voice modes, speak the answer too.', ['Press "Explain aloud"', 'Tap the mic and ask "how does my code work?"']);
  }
  if (/compiler|phase|pass|intermediate|tac|three address/.test(ql)) {
    return pick('Compiler pipeline', `Source → tokens → syntax/AST → meaning → TAC → optimization → run. Your program: ${s.nonEmpty} code lines, ${errors.length} error(s). Walk the Studio tabs left to right on YOUR code to see each phase.`, ['Analyze then walk tabs left to right']);
  }
  const hint = s.nonEmpty
    ? `You asked: "${q.slice(0, 160)}". Your ${language.toUpperCase()} code has ${s.nonEmpty} line(s)${errors.length ? ` with ${errors.length} error(s)` : ' and Analyze is clean'}. Ask me "how does my code work?" for a line-by-line tour, or "what are my errors?" for each issue with its fix.`
    : `You asked: "${q.slice(0, 160)}". Your editor is empty — generate or type code first.`;
  return pick('General help', hint, ['Ask "how does my code work?"', 'Ask "what are my errors?"']);
}

async function getTutorHint({ question, sourceCode, language = 'cpp', diagnostics = [], context = 'general' }) {
  const diagText = (Array.isArray(diagnostics) ? diagnostics : []).slice(0, 12).map((d) => `${d.severity} ${d.code} L${d.line}: ${d.message}`).join('\n');
  const ai = await tryAI(
    TUTOR_SYSTEM,
    `Language: ${language}\nContext: ${context}\nStudent question: ${question}\nDiagnostics from Analyze:\n${diagText || '(none)'}\nCurrent code:\n\`\`\`\n${sourceCode}\n\`\`\`\nBe precise: cite line numbers and the actual code.`,
    true,
  );
  if (ai && (ai.parsed?.hint || ai.raw)) {
    const plain = ai.parsed?.speakable || ai.parsed?.hint || ai.raw;
    return {
      hint: ai.parsed?.hint || ai.raw,
      concept: ai.parsed?.concept || null,
      nextSteps: ai.parsed?.nextSteps || [],
      speakable: String(plain).replace(/[`*_#]/g, '').slice(0, 1200),
      model: ai.model,
      aiAvailable: true,
      engine: 'ai',
    };
  }
  const off = offlineTutor({ question, sourceCode, language, diagnostics, context });
  return { ...off, aiAvailable: false, engine: engineOf(ai) };
}

module.exports = { getTutorHint };
