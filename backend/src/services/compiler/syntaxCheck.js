/**
 * Generic syntax checker for Java / Python / JavaScript.
 * Real, position-accurate checks over the actual source (not templates):
 * bracket balance, statement terminators, block openers, entry points,
 * and Python indentation. Returns diagnostics in the standard shape:
 * { phase:'syntax', source:'codexa', severity, code, message, line, column, endLine, endColumn }
 */

function checkGenericSyntax(sourceCode, language) {
  const src = String(sourceCode ?? '');
  const lang = language === 'js' ? 'javascript' : language;
  const diags = [];
  const lines = src.split('\n');

  const push = (severity, code, message, line, column, endLine, endColumn) =>
    diags.push({
      phase: 'syntax',
      source: 'codexa',
      severity,
      code,
      message,
      line,
      column,
      endLine: endLine ?? line,
      endColumn: endColumn ?? column + 1,
    });

  // ---- 1. Bracket balance, skipping strings & comments ----
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  let line = 1;
  let col = 1;
  let i = 0;
  let str = null; // ', ", `, or triple
  let lineComment = false;
  let blockComment = false;
  const isPython = lang === 'python';

  while (i < src.length) {
    const ch = src[i];
    const nxt2 = src.slice(i, i + 3);
    const nxt = src[i + 1] || '';

    if (ch === '\n') {
      line += 1;
      col = 1;
      lineComment = false;
      if (str === "'" || str === '"' || str === '`') str = null; // unterminated EOL string ends here
      i += 1;
      continue;
    }
    if (lineComment) {
      i += 1;
      col += 1;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && nxt === '/') {
        blockComment = false;
        i += 2;
        col += 2;
      } else {
        i += 1;
        col += 1;
      }
      continue;
    }
    if (str) {
      if (ch === '\\') {
        i += 2;
        col += 2;
        continue;
      }
      if (str.length === 3) {
        if (nxt2 === str) {
          str = null;
          i += 3;
          col += 3;
        } else {
          i += 1;
          col += 1;
        }
        continue;
      }
      if (ch === str) str = null;
      i += 1;
      col += 1;
      continue;
    }
    // not in string/comment
    if (!isPython && ch === '/' && (nxt === '/' || nxt === '*')) {
      if (nxt === '/') lineComment = true;
      else blockComment = true;
      i += 2;
      col += 2;
      continue;
    }
    if (isPython && ch === '#') {
      lineComment = true;
      i += 1;
      col += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      if (isPython && src[i + 1] === ch && src[i + 2] === ch) {
        str = ch + ch + ch;
        i += 3;
        col += 3;
      } else {
        str = ch;
        i += 1;
        col += 1;
      }
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push({ ch, line, column: col });
    } else if (pairs[ch]) {
      const top = stack.pop();
      if (!top) {
        push('error', 'SYN_BRACKET', `Unmatched closing '${ch}' — no opening bracket for it.`, line, col, line, col + 1);
      } else if (top.ch !== pairs[ch]) {
        push(
          'error',
          'SYN_BRACKET',
          `Mismatched brackets: opened '${top.ch}' on line ${top.line} but closed with '${ch}' on line ${line}.`,
          line,
          col,
          line,
          col + 1,
        );
      }
    }
    i += 1;
    col += 1;
  }
  for (const un of stack.reverse().slice(0, 8)) {
    push('error', 'SYN_UNCLOSED', `Unclosed '${un.ch}' opened on line ${un.line} — missing its closing bracket.`, un.line, un.column, un.line, un.column + 1);
  }

  // ---- 2. Per-language statement checks ----
  if (lang === 'java' || lang === 'javascript') {
    if (!/class\s+[A-Za-z_$][\w$]*/.test(src) && lang === 'java') {
      push('error', 'SYN_NO_CLASS', 'No class found — Java programs need at least one "class X" to compile.', 1, 1, 1, 2);
    }
    if (!/public\s+static\s+void\s+main|static\s+void\s+main|function\s+main|=>|console\.|System\.out|public\s+class/.test(src)) {
      // soft warning, not an error — libraries need no main
      if (src.trim().length > 0 && lang === 'java' && !/void\s+main/.test(src)) {
        push('warning', 'SYN_NO_MAIN', 'No main method found — add "public static void main(String[] args)" to run it.', 1, 1, 1, 2);
      }
    }
    const control = /^\s*(if|for|while|switch|catch|else|do|try|finally|synchronized)\b/;
    const skipEnd = /[;{}:,\s]$/;
    const skipStart = /^\s*(\/\/|\/\*|\*|@|import\s|package\s|#|$)/;
    lines.forEach((raw, idx) => {
      const ln = idx + 1;
      const t = raw.trim();
      if (!t || skipStart.test(raw)) return;
      if (control.test(raw) || t.endsWith('{') || t.endsWith('}') || t.endsWith(';') || t.endsWith(':') || t.endsWith(',')) return;
      if (/[)\]"']$/.test(t) && !skipEnd.test(t)) {
        // Likely a statement missing its semicolon, e.g. `System.out.println(x)`
        if (/^(int|float|double|long|short|char|boolean|String|var|let|const|return|new|System|console|public|private|protected)/.test(t) || /=/.test(t) || /\(.*\)/.test(t)) {
          push('error', 'SYN_SEMI', `Missing semicolon at end of line ${ln} — statements must end with ';'.`, ln, raw.length, ln, raw.length + 1);
        }
      }
    });
  }

  if (lang === 'python') {
    let prevIndent = 0;
    let seenIndentChar = null;
    lines.forEach((raw, idx) => {
      const ln = idx + 1;
      if (!raw.trim() || /^\s*#/.test(raw)) return;
      const m = /^(\s*)/.exec(raw);
      const indentStr = m ? m[1] : '';
      const hasTab = indentStr.includes('\t');
      const hasSpace = indentStr.includes(' ');
      if (hasTab && hasSpace) {
        push('warning', 'SYN_INDENT', `Line ${ln} mixes tabs and spaces — use one or the other (PEP 8 prefers 4 spaces).`, ln, 1, ln, 2);
      }
      const ch = hasTab ? 'tab' : hasSpace ? 'space' : null;
      if (ch && seenIndentChar && ch !== seenIndentChar) {
        push('warning', 'SYN_INDENT', `Line ${ln} uses ${ch}s but earlier lines use ${seenIndentChar}s — keep indentation consistent.`, ln, 1, ln, 2);
      }
      if (ch) seenIndentChar = seenIndentChar || ch;
      const indent = indentStr.replace(/\t/g, '    ').length;
      if (indent - prevIndent > 4 && raw.trim()) {
        push('warning', 'SYN_INDENT', `Line ${ln} is indented ${indent - prevIndent} spaces deeper than the line above — is a block missing?`, ln, 1, ln, 2);
      }
      prevIndent = raw.trim() ? indent : prevIndent;
      const t = raw.trim();
      if (/^(def\s+\w+|class\s+\w+|if\b|elif\b|else\s*:|else\b|for\b|while\b|try\s*:|try\b|except\b|finally\b|with\b|match\b|case\b)/.test(t)) {
        const isHeader = /^(def\b|class\b|if\b|elif\b|else\b|for\b|while\b|try\b|except\b|finally\b|with\b|match\b|case\b)/.test(t);
        if (isHeader && !t.endsWith(':')) {
          push('error', 'SYN_COLON', `Line ${ln} starts a block ("${t.split(/[\s(:]/)[0]}") but is missing the trailing ':' — e.g. "def f():".`, ln, raw.length, ln, raw.length + 1);
        }
      }
      if (/^\s*print\s+[^(]/.test(raw) && !/print\s*\(/.test(raw)) {
        push('error', 'SYN_PRINT', `Line ${ln} uses Python-2 style "print x" — Python 3 needs "print(x)".`, ln, raw.indexOf('print') + 1, ln, raw.indexOf('print') + 6);
      }
    });
  }

  diags.sort((a, b) => a.line - b.line || a.column - b.column);
  return diags;
}

/**
 * The educational grammar has no header model: `#include` lines are skipped
 * before parsing, so the semantic pass would flag real stdlib calls such as
 * printf/scanf as undeclared. Like a real compiler, honor the includes —
 * drop those false positives when the matching header is present.
 */
const STDIO_FUNCS = new Set([
  'printf', 'scanf', 'fprintf', 'fscanf', 'sprintf', 'sscanf',
  'puts', 'gets', 'fgets', 'fputs', 'getchar', 'putchar',
  'fopen', 'fclose', 'fread', 'fwrite', 'perror', 'remove', 'rename',
]);
const STDLIB_FUNCS = new Set(['malloc', 'calloc', 'realloc', 'free', 'exit', 'atoi', 'rand']);
const STRING_FUNCS = new Set(['strlen', 'strcpy', 'strcmp', 'strcat', 'memcpy', 'memset']);

function applyStdlibKnowledge(sourceCode, diagnostics) {
  const src = String(sourceCode ?? '');
  const has = (h) => new RegExp(`#include\\s*<${h}>`).test(src);
  const allowed = new Set();
  if (has('stdio.h')) for (const f of STDIO_FUNCS) allowed.add(f);
  if (has('stdlib.h')) for (const f of STDLIB_FUNCS) allowed.add(f);
  if (has('string.h')) for (const f of STRING_FUNCS) allowed.add(f);
  if (allowed.size === 0) return diagnostics;
  return diagnostics.filter((d) => {
    if (d.code !== 'E202') return true;
    const m = /call to undeclared function '(\w+)'/.exec(d.message || '');
    return !(m && allowed.has(m[1]));
  });
}

/**
 * Remove repeated diagnostics so the Syntax tab shows each problem once.
 * Two entries are duplicates when they share phase + code + line + column
 * and near-identical messages. Keeps the first occurrence, preserves order.
 */
function dedupDiagnostics(list) {
  const seen = new Set();
  const out = [];
  for (const d of list) {
    const msg = String(d.message || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
    const key = `${d.phase}|${d.code}|${d.line}|${d.column}|${msg}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

module.exports = { checkGenericSyntax, dedupDiagnostics, applyStdlibKnowledge };
