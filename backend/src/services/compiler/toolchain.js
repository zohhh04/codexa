/**
 * Codexa AI — toolchain detector.
 * Single source of truth for which languages can actually execute here.
 * Used by /api/toolchain/status, the Settings page, and install scripts.
 */
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function bins() {
  return {
    cpp: process.env.CLANG_PATH || 'clang++',
    c: process.env.CLANG_C_PATH || process.env.CLANG_PATH || 'clang',
    javac: process.env.JAVAC_PATH || 'javac',
    java: process.env.JAVA_PATH || 'java',
    python: process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3'),
    node: process.env.NODE_PATH || 'node',
  };
}

async function check(bin, args) {
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, { timeout: 8000, windowsHide: true });
    const raw = `${stdout || ''} ${stderr || ''}`.trim().split('\n')[0] || 'available';
    return { available: true, path: bin, version: raw.slice(0, 160) };
  } catch (err) {
    // javac/java print version to stderr and exit 0 — execFile only throws on failure.
    if (err && (err.stdout || err.stderr)) {
      const raw = `${err.stdout || ''} ${err.stderr || ''}`.trim().split('\n')[0];
      if (/version/i.test(raw)) return { available: true, path: bin, version: raw.slice(0, 160) };
    }
    return { available: false, path: bin, version: null };
  }
}

async function getToolchainStatus() {
  const b = bins();
  const [cpp, c, javac, java, python, node] = await Promise.all([
    check(b.cpp, ['--version']),
    check(b.c, ['--version']),
    check(b.javac, ['-version']),
    check(b.java, ['-version']),
    check(b.python, ['--version']),
    check(b.node, ['--version']),
  ]);
  return {
    cpp: { ...cpp, label: 'C++ (clang++)' },
    c: { ...c, label: 'C (clang)' },
    java: {
      available: javac.available && java.available,
      path: `${javac.path} + ${java.path}`,
      version: javac.version || java.version,
      label: 'Java (JDK javac + java)',
      detail: { javac, java },
    },
    python: { ...python, label: 'Python 3' },
    javascript: { ...node, label: 'JavaScript (Node.js)' },
  };
}

module.exports = { getToolchainStatus, bins };
