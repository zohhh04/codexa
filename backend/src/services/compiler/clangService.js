/**
 * Codexa AI — sandboxed compile + run service (C / C++ / Java / Python / JavaScript).
 *
 * Sandboxed child processes (no shell), parsed diagnostics, strict
 * time/output limits. When a toolchain is unavailable the service returns
 * a clear error — never faked output.
 *
 * compileAndRun(sourceCode, language = 'cpp', stdin = '')
 *   -> { compile: { success, diagnostics, elapsedMs }, run: { stdout, stderr, exitCode, timedOut, signal, elapsedMs } }
 */
const { execFile, spawn } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const CLANG_TIMEOUT_MS = 10_000;
const RUN_TIMEOUT_MS = 5_000;
const MAX_STDOUT = 64 * 1024;
const MAX_STDERR = 64 * 1024;

// Parse clang/clang++ stderr diagnostics into structured objects.
// Format: "file:line:col: severity: message"
const DIAG_RE = /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/;
// Also handle "file:line: severity: message" (no column)
const DIAG_RE_NOCOL = /^(.+?):(\d+):\s*(error|warning|note):\s*(.+)$/;

function parseDiagnostics(raw, filename) {
  if (!raw) return [];
  const lines = raw.split('\n').filter(Boolean);
  const diags = [];
  for (const line of lines) {
    let m = DIAG_RE.exec(line);
    if (m) {
      const [, file, ln, col, severity, message] = m;
      if (file === filename || file === `<stdin>` || file.endsWith(filename)) {
        diags.push({
          phase: 'compile', source: 'clang', severity,
          code: 'CLANG',
          message,
          line: parseInt(ln, 10),
          column: parseInt(col, 10),
          endLine: parseInt(ln, 10),
          endColumn: parseInt(col, 10) + 1,
        });
        continue;
      }
    }
    m = DIAG_RE_NOCOL.exec(line);
    if (m) {
      const [, file, ln, severity, message] = m;
      if (file === filename || file === `<stdin>` || file.endsWith(filename)) {
        diags.push({
          phase: 'compile', source: 'clang', severity,
          code: 'CLANG',
          message,
          line: parseInt(ln, 10),
          column: 1,
          endLine: parseInt(ln, 10),
          endColumn: 2,
        });
        continue;
      }
    }
    // Non-standard line — include as a note
    if (line.trim()) {
      diags.push({
        phase: 'compile', source: 'clang', severity: 'note',
        code: 'CLANG',
        message: line.trim(),
        line: 0, column: 0, endLine: 0, endColumn: 0,
      });
    }
  }
  return diags;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '\n… (truncated)' : str;
}

function findClang() {
  return process.env.CLANG_PATH || 'clang++';
}

function findCCompiler() {
  return process.env.CLANG_C_PATH || process.env.CLANG_PATH || 'clang';
}

function findJavac() {
  return process.env.JAVAC_PATH || 'javac';
}

function findJava() {
  return process.env.JAVA_PATH || 'java';
}

function findPython() {
  return process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
}

function findNode() {
  return process.env.NODE_PATH || 'node';
}

async function binaryAvailable(bin, versionArgs = ['--version']) {
  try {
    await execFileAsync(bin, versionArgs, { timeout: 5000, windowsHide: true });
    return { available: true, path: bin };
  } catch (err) {
    const raw = `${err.stdout || ''} ${err.stderr || ''}`;
    if (/version/i.test(raw)) return { available: true, path: bin };
    return { available: false, path: bin };
  }
}

async function clangAvailable() {
  return binaryAvailable(findClang());
}

function missingToolchain(code, message, started) {
  return {
    compile: {
      success: false,
      diagnostics: [{
        phase: 'compile', source: 'toolchain', severity: 'error',
        code,
        message,
        line: 0, column: 0, endLine: 0, endColumn: 0,
      }],
      elapsedMs: Date.now() - started,
    },
    run: { stdout: '', stderr: '', exitCode: 1, timedOut: false, signal: null, elapsedMs: 0 },
  };
}

function emptyRun() {
  return { stdout: '', stderr: '', exitCode: 1, timedOut: false, signal: null, elapsedMs: 0 };
}

async function runBinary(bin, args, cwd, stdin = '', timeoutMs = RUN_TIMEOUT_MS) {
  // NOTE: spawn (not execFile+input) is used for stdin: execFile's `input`
  // option hangs with console apps on Windows, while piped spawn works.
  const runStarted = Date.now();
  const input = typeof stdin === 'string' ? stdin : '';
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let done = false;
    const finish = (exitCode, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      let code = typeof exitCode === 'number' ? exitCode : 1;
      if (Number.isNaN(code)) code = 1;
      resolve({
        stdout: truncate(stdout, MAX_STDOUT),
        stderr: truncate(stderr, MAX_STDERR),
        exitCode: code,
        timedOut,
        signal: signal || null,
        elapsedMs: Date.now() - runStarted,
      });
    };
    let child;
    try {
      child = spawn(bin, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({
        stdout: '', stderr: String(err.message || err).slice(0, MAX_STDERR),
        exitCode: 1, timedOut: false, signal: null, elapsedMs: Date.now() - runStarted,
      });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 500).unref?.();
    }, timeoutMs);
    timer.unref?.();
    child.stdout.on('data', (d) => {
      if (stdout.length < MAX_STDOUT + 1024) stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      if (stderr.length < MAX_STDERR + 1024) stderr += d.toString();
    });
    child.on('error', (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        stdout: truncate(stdout, MAX_STDOUT),
        stderr: (stderr + (stderr ? '\n' : '') + String(err.message || err)).slice(0, MAX_STDERR),
        exitCode: 1, timedOut: false, signal: null, elapsedMs: Date.now() - runStarted,
      });
    });
    child.on('close', (code, signal) => finish(code, signal));
    try {
      if (input) child.stdin.write(input);
      child.stdin.end();
    } catch {
      /* stdin already closed — continue */
    }
  });
}

async function compileAndRunCpp(sourceCode, started, tmpDir, stdin) {
  const clang = findClang();
  const filename = 'input.cpp';
  const { available } = await binaryAvailable(clang);
  if (!available) {
    return missingToolchain(
      'CLANG_MISSING',
      `Clang++ not found at '${clang}'. Install LLVM/Clang and add it to PATH, or set CLANG_PATH in backend/.env. See GET /api/toolchain/status and backend/scripts/setup-toolchains.js.`,
      started,
    );
  }
  const srcPath = join(tmpDir, filename);
  const binPath = join(tmpDir, 'a.out');
  await writeFile(srcPath, sourceCode, 'utf8');

  const compileStarted = Date.now();
  let compileOk = false;
  let compileStderr = '';
  try {
    const { stderr } = await execFileAsync(
      clang,
      ['-std=c++17', '-O2', '-o', binPath, srcPath],
      { timeout: CLANG_TIMEOUT_MS, windowsHide: true, cwd: tmpDir },
    );
    compileOk = true;
    compileStderr = stderr || '';
  } catch (err) {
    compileStderr = err.stderr || err.message || '';
    compileOk = false;
  }
  const compileDiags = parseDiagnostics(compileStderr, filename);
  const compileMs = Date.now() - compileStarted;
  if (!compileOk) {
    return {
      compile: { success: false, diagnostics: compileDiags, elapsedMs: compileMs },
      run: emptyRun(),
    };
  }
  const fs = require('node:fs');
  let binToRun = process.platform === 'win32' ? `${binPath}.exe` : binPath;
  if (process.platform === 'win32' && !fs.existsSync(binToRun) && fs.existsSync(binPath)) {
    binToRun = binPath;
  }
  const run = await runBinary(binToRun, [], tmpDir, stdin);
  return { compile: { success: true, diagnostics: compileDiags, elapsedMs: compileMs }, run };
}

async function compileAndRunC(sourceCode, started, tmpDir, stdin) {
  let cc = findCCompiler();
  const filename = 'input.c';
  let { available } = await binaryAvailable(cc);
  if (!available && cc !== findClang()) {
    cc = findClang();
    available = (await binaryAvailable(cc)).available;
  }
  if (!available) {
    return missingToolchain(
      'CLANG_MISSING',
      `C compiler not found at '${cc}'. Install LLVM/Clang and add it to PATH, or set CLANG_C_PATH in backend/.env. See GET /api/toolchain/status.`,
      started,
    );
  }
  const srcPath = join(tmpDir, filename);
  const binPath = join(tmpDir, 'a.out');
  await writeFile(srcPath, sourceCode, 'utf8');

  const compileStarted = Date.now();
  let compileOk = false;
  let compileStderr = '';
  try {
    const { stderr } = await execFileAsync(
      cc,
      ['-std=c17', '-O2', '-o', binPath, srcPath],
      { timeout: CLANG_TIMEOUT_MS, windowsHide: true, cwd: tmpDir },
    );
    compileOk = true;
    compileStderr = stderr || '';
  } catch (err) {
    compileStderr = err.stderr || err.message || '';
    compileOk = false;
  }
  const compileDiags = parseDiagnostics(compileStderr, filename);
  const compileMs = Date.now() - compileStarted;
  if (!compileOk) {
    return {
      compile: { success: false, diagnostics: compileDiags, elapsedMs: compileMs },
      run: emptyRun(),
    };
  }
  const fs = require('node:fs');
  let binToRun = process.platform === 'win32' ? `${binPath}.exe` : binPath;
  if (process.platform === 'win32' && !fs.existsSync(binToRun) && fs.existsSync(binPath)) {
    binToRun = binPath;
  }
  const run = await runBinary(binToRun, [], tmpDir, stdin);
  return { compile: { success: true, diagnostics: compileDiags, elapsedMs: compileMs }, run };
}

async function compileAndRunJava(sourceCode, started, tmpDir, stdin) {
  const javac = findJavac();
  const java = findJava();
  const javacOk = await binaryAvailable(javac, ['-version']);
  if (!javacOk.available) {
    return missingToolchain(
      'JAVA_MISSING',
      `javac not found at '${javac}'. Install a JDK 17+ (e.g. Temurin/Eclipse or Oracle JDK), add it to PATH, or set JAVAC_PATH/JAVA_PATH in backend/.env. Run: node backend/scripts/setup-toolchains.js --check.`,
      started,
    );
  }
  const javaOk = await binaryAvailable(java, ['-version']);
  if (!javaOk.available) {
    return missingToolchain(
      'JAVA_MISSING',
      `java runtime not found at '${java}'. Install a JDK 17+ and add it to PATH, or set JAVA_PATH in backend/.env.`,
      started,
    );
  }
  if (!/class\s+Main\b/.test(sourceCode)) {
    return {
      compile: {
        success: false,
        diagnostics: [{
          phase: 'compile', source: 'javac', severity: 'error',
          code: 'JAVA_MAIN_CLASS',
          message: 'Java programs must declare "class Main" with "public static void main(String[] args)". Rename your public class to Main.',
          line: 1, column: 1, endLine: 1, endColumn: 2,
        }],
        elapsedMs: Date.now() - started,
      },
      run: emptyRun(),
    };
  }
  const srcPath = join(tmpDir, 'Main.java');
  await writeFile(srcPath, sourceCode, 'utf8');
  const compileStarted = Date.now();
  try {
    await execFileAsync(javac, ['Main.java'], { timeout: CLANG_TIMEOUT_MS, windowsHide: true, cwd: tmpDir });
  } catch (err) {
    const raw = err.stderr || err.stdout || err.message || '';
    const diags = raw
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const m = /^Main\.java:(\d+):\s*(error|warning)?:?\s*(.*)$/.exec(line.trim());
        if (m) {
          return {
            phase: 'compile', source: 'javac',
            severity: m[2] === 'warning' ? 'warning' : 'error',
            code: 'JAVAC',
            message: m[3] || line.trim(),
            line: parseInt(m[1], 10), column: 1,
            endLine: parseInt(m[1], 10), endColumn: 2,
          };
        }
        return {
          phase: 'compile', source: 'javac', severity: 'note',
          code: 'JAVAC', message: line.trim(),
          line: 0, column: 0, endLine: 0, endColumn: 0,
        };
      });
    return {
      compile: { success: false, diagnostics: diags, elapsedMs: Date.now() - compileStarted },
      run: emptyRun(),
    };
  }
  const compileMs = Date.now() - compileStarted;
  const run = await runBinary(java, ['Main'], tmpDir, stdin);
  return { compile: { success: true, diagnostics: [], elapsedMs: compileMs }, run };
}

async function compileAndRunPython(sourceCode, started, tmpDir, stdin) {
  const python = findPython();
  const { available } = await binaryAvailable(python, ['--version']);
  if (!available) {
    return missingToolchain(
      'PYTHON_MISSING',
      `Python not found at '${python}'. Install Python 3.10+ (python.org or Microsoft Store), add it to PATH, or set PYTHON_PATH in backend/.env. Run: node backend/scripts/setup-toolchains.js --check.`,
      started,
    );
  }
  const srcPath = join(tmpDir, 'script.py');
  await writeFile(srcPath, sourceCode, 'utf8');
  const compileStarted = Date.now();
  try {
    await execFileAsync(python, ['-m', 'py_compile', 'script.py'], {
      timeout: CLANG_TIMEOUT_MS, windowsHide: true, cwd: tmpDir,
    });
  } catch (err) {
    const raw = err.stderr || err.stdout || err.message || '';
    const diags = raw
      .split('\n')
      .filter((l) => l.trim())
      .slice(-8)
      .map((line) => {
        const m = /script\.py.", line (\d+)/.exec(line) || /line (\d+)/.exec(line);
        return {
          phase: 'compile', source: 'python', severity: 'error',
          code: 'PY_SYNTAX',
          message: line.trim(),
          line: m ? parseInt(m[1], 10) : 0, column: m ? 1 : 0,
          endLine: m ? parseInt(m[1], 10) : 0, endColumn: m ? 2 : 0,
        };
      });
    return {
      compile: { success: false, diagnostics: diags, elapsedMs: Date.now() - compileStarted },
      run: emptyRun(),
    };
  }
  const compileMs = Date.now() - compileStarted;
  const run = await runBinary(python, ['script.py'], tmpDir, stdin);
  return { compile: { success: true, diagnostics: [], elapsedMs: compileMs }, run };
}

async function compileAndRunJavaScript(sourceCode, started, tmpDir, stdin) {
  const node = findNode();
  const { available } = await binaryAvailable(node, ['--version']);
  if (!available) {
    return missingToolchain(
      'NODE_MISSING',
      `Node.js not found at '${node}'. Install Node.js 20+ (nodejs.org), add it to PATH, or set NODE_PATH in backend/.env.`,
      started,
    );
  }
  const srcPath = join(tmpDir, 'script.js');
  await writeFile(srcPath, sourceCode, 'utf8');
  const compileStarted = Date.now();
  try {
    await execFileAsync(node, ['--check', 'script.js'], {
      timeout: CLANG_TIMEOUT_MS, windowsHide: true, cwd: tmpDir,
    });
  } catch (err) {
    const raw = err.stderr || err.stdout || err.message || '';
    const diags = raw
      .split('\n')
      .filter((l) => l.trim())
      .slice(-8)
      .map((line) => ({
        phase: 'compile', source: 'node', severity: 'error',
        code: 'JS_SYNTAX',
        message: line.trim(),
        line: 0, column: 0, endLine: 0, endColumn: 0,
      }));
    return {
      compile: { success: false, diagnostics: diags, elapsedMs: Date.now() - compileStarted },
      run: emptyRun(),
    };
  }
  const compileMs = Date.now() - compileStarted;
  const run = await runBinary(node, ['script.js'], tmpDir, stdin);
  return { compile: { success: true, diagnostics: [], elapsedMs: compileMs }, run };
}

/**
 * Compile source with the toolchain for `language`, then run it with `stdin`.
 * Returns { compile: {...}, run: {...} }.
 */
async function compileAndRun(sourceCode, language = 'cpp', stdin = '') {
  const started = Date.now();
  const input = typeof stdin === 'string' ? stdin.slice(0, 64 * 1024) : '';
  let tmpDir;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'codexa-'));
    switch (language) {
      case 'c':
        return await compileAndRunC(sourceCode, started, tmpDir, input);
      case 'java':
        return await compileAndRunJava(sourceCode, started, tmpDir, input);
      case 'python':
        return await compileAndRunPython(sourceCode, started, tmpDir, input);
      case 'javascript':
      case 'js':
        return await compileAndRunJavaScript(sourceCode, started, tmpDir, input);
      case 'cpp':
      default:
        return await compileAndRunCpp(sourceCode, started, tmpDir, input);
    }
  } finally {
    if (tmpDir) {
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
}

module.exports = { compileAndRun, clangAvailable, parseDiagnostics, runBinary };
