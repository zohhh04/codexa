/**
 * AI Code Debugger — real toolchain diagnostics + explanation + corrected code.
 * 1) Runs the code to capture REAL compile/runtime errors (never invented).
 * 2) LLM (or offline rules) explains WHY and proposes corrected code.
 * 3) The corrected code is executed to verify the fix when possible.
 */
const { compileAndRun } = require('../compiler/clangService');
const { tryAI } = require('./offline');

const SYSTEM = `You are Codexa AI, a debugging expert. Given faulty code, its language, and REAL toolchain output, respond with STRICT JSON: {"errors": [{"title": "<short>", "why": "<1-2 sentence cause>", "location": "<line hint>"}], "explanation": "<overall 2-3 sentence summary>", "correctedCode": "<full fixed program>"}. Fix ONLY what the diagnostics prove. Never invent errors.`;

function offlineCorrections(sourceCode, language, compile, run) {
  const fixes = [];
  let fixed = sourceCode;

  if (language === 'java' && compile.diagnostics.some((d) => d.code === 'JAVA_MAIN_CLASS')) {
    fixes.push({ title: 'Missing Main class', why: 'The Java runner compiles Main.java, so the public class must be named Main with a main method.', location: 'line 1' });
  }
  if (/(cout|cin|std::)/.test(sourceCode) && !/#include\s*<.*>/.test(sourceCode)) {
    fixed = `#include <bits/stdc++.h>\nusing namespace std;\n\n${fixed}`;
    fixes.push({ title: 'Missing header', why: 'cout/cin need an #include (e.g. <iostream>); without it the compiler cannot find them.', location: 'top of file' });
  }
  if (/printf|scanf/.test(sourceCode) && !/#include\s*<stdio.h>/.test(sourceCode) && language === 'c') {
    fixed = `#include <stdio.h>\n\n${fixed}`;
    fixes.push({ title: 'Missing stdio.h', why: 'printf/scanf are declared in <stdio.h>; C requires the header.', location: 'top of file' });
  }
  const printX = compile.diagnostics.find((d) => /['"]?x['"]?\s*(was not declared|undeclared|not defined|cannot find symbol)/i.test(d.message));
  if (printX) {
    fixes.push({ title: 'Undeclared variable', why: `'x' is used but never declared. Declare it (e.g. int x = 0;) before use — compilers need every variable declared with a type.`, location: `line ${printX.line}` });
  }
  if (/IndentationError|unexpected indent/i.test(`${compile.diagnostics.map((d) => d.message).join(' ')} ${run.stderr}`)) {
    fixes.push({ title: 'Indentation error', why: 'Python uses indentation instead of braces — mixed tabs/spaces or a missing indent after ":" breaks the block.', location: 'see diagnostic line' });
  }
  if (compile.success && run.exitCode !== 0 && /NameError: name '(\w+)'/i.test(run.stderr)) {
    const m = /NameError: name '(\w+)'/.exec(run.stderr);
    fixes.push({ title: `Undefined name '${m[1]}'`, why: `'${m[1]}' was never assigned. Python needs every name defined before use — check spelling and initialization.`, location: 'see traceback line' });
  }
  if (fixes.length === 0 && !compile.success) {
    fixes.push({
      title: 'Compilation failed',
      why: compile.diagnostics[0]
        ? `The toolchain reports: ${compile.diagnostics[0].message}. Read it top-down — the first error is usually the real one.`
        : 'The toolchain rejected the program. Read the first diagnostic carefully.',
      location: compile.diagnostics[0] && compile.diagnostics[0].line ? `line ${compile.diagnostics[0].line}` : 'unknown',
    });
  }
  if (fixes.length === 0 && run.exitCode !== 0) {
    fixes.push({
      title: 'Runtime error',
      why: run.stderr ? `The program crashed at runtime: ${run.stderr.split('\n')[0].slice(0, 200)}` : `It exited with code ${run.exitCode}. Check edge cases like empty input or division by zero.`,
      location: 'runtime',
    });
  }
  if (fixes.length === 0) {
    fixes.push({ title: 'No errors found', why: 'The program compiled and ran cleanly — the bug may be a wrong answer (logic) rather than a crash.', location: '—' });
  }
  return { fixes, correctedCode: fixes.length && fixed !== sourceCode ? fixed : null };
}

async function debugCode({ sourceCode, language = 'cpp', stdin = '' }) {
  const lang = language === 'js' ? 'javascript' : language;
  const result = await compileAndRun(sourceCode, lang, stdin);
  const { compile, run } = result;

  const diagText = compile.diagnostics.map((d) => `L${d.line}: [${d.code}] ${d.message}`).join('\n') || '(compiled OK)';
  const ai = await tryAI(
    SYSTEM,
    `Language: ${lang}\nCode:\n${sourceCode}\n\nCompile success: ${compile.success}\nDiagnostics:\n${diagText}\nRuntime exit: ${run.exitCode}\nStderr:\n${run.stderr || '(empty)'}\nStdout:\n${run.stdout || '(empty)'}`,
    true,
  );
  let errors, explanation, correctedCode, engine;
  if (ai && ai.parsed && ai.parsed.correctedCode) {
    ({ errors, explanation, correctedCode } = ai.parsed);
    engine = 'ai';
  } else {
    const off = offlineCorrections(sourceCode, lang, compile, run);
    errors = off.fixes;
    explanation = compile.success && run.exitCode === 0
      ? 'The program runs without crashing. If the output is still wrong, it is a logic error — compare expected vs actual output on a small test.'
      : `Found ${off.fixes.length} issue(s) from real toolchain output. ${off.fixes[0]?.why ?? ''}`;
    correctedCode = off.correctedCode;
    engine = 'offline';
  }

  // Verify the proposed fix actually runs (only when we changed the code offline, or AI gave code)
  let verification = null;
  if (correctedCode && correctedCode !== sourceCode) {
    try {
      const v = await compileAndRun(correctedCode, lang, stdin);
      verification = { compileSuccess: v.compile.success, exitCode: v.run.exitCode, stdout: v.run.stdout.slice(0, 500), stderr: v.run.stderr.slice(0, 500) };
    } catch {
      verification = null;
    }
  }

  return { compile, run, errors, explanation, correctedCode, verification, engine, model: ai?.model };
}

module.exports = { debugCode };
