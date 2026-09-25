/**
 * Codexa AI — toolchain setup helper.
 *
 * Usage:
 *   node backend/scripts/setup-toolchains.js --check        (report only)
 *   node backend/scripts/setup-toolchains.js --install     (attempt Windows install via winget)
 *
 * Installs (Windows, via winget):
 *   - LLVM/Clang  -> C / C++
 *   - Eclipse Temurin JDK 21 -> Java
 *   - Python 3.12 -> Python
 *   - Node.js 22 LTS -> JavaScript (usually already present)
 */
const { getToolchainStatus } = require('../src/services/compiler/toolchain');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const mode = process.argv.includes('--install') ? 'install' : 'check';

const WINGET_IDS = {
  clang: 'LLVM.LLVM',
  java: 'EclipseAdoptium.Temurin.21.JDK',
  python: 'Python.Python.3.12',
  node: 'OpenJS.NodeJS.LTS',
};

async function wingetInstall(id, label) {
  console.log(`\nInstalling ${label} (${id}) via winget...`);
  try {
    const { stdout, stderr } = await execFileAsync(
      'winget',
      ['install', '--id', id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements'],
      { timeout: 600000, windowsHide: true },
    );
    console.log(stdout || stderr || 'done');
    return true;
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    console.error((err.stderr || err.stdout || '').slice(0, 500));
    return false;
  }
}

async function main() {
  console.log('Codexa toolchain check (C / C++ / Java / Python / JavaScript)\n');
  const status = await getToolchainStatus();
  for (const [key, info] of Object.entries(status)) {
    const mark = info.available ? 'OK ' : 'MISS';
    console.log(`[${mark}] ${info.label}: ${info.available ? (info.version || info.path) : `not found at '${info.path}'`}`);
  }

  const missing = Object.entries(status).filter(([, i]) => !i.available);
  if (missing.length === 0) {
    console.log('\nAll toolchains available. You can run every language.');
    return;
  }

  console.log('\nSetup hints:');
  console.log('- C/C++ : install LLVM/Clang and add clang/clang++ to PATH (or set CLANG_PATH / CLANG_C_PATH in backend/.env).');
  console.log('- Java  : install a JDK 17+ (Temurin 21 recommended), add javac/java to PATH (or set JAVAC_PATH / JAVA_PATH).');
  console.log('- Python: install Python 3.10+ from python.org, enable "Add to PATH" (or set PYTHON_PATH).');
  console.log('- Node  : install Node.js 20+ LTS (or set NODE_PATH).');

  if (mode === 'install') {
    if (process.platform !== 'win32') {
      console.log('\n--install is implemented for Windows (winget) only. On macOS use brew, on Linux use apt/dnf.');
      return;
    }
    const need = new Set(missing.map(([k]) => k));
    if (need.has('cpp') || need.has('c')) await wingetInstall(WINGET_IDS.clang, 'LLVM/Clang');
    if (need.has('java')) await wingetInstall(WINGET_IDS.java, 'Temurin JDK 21');
    if (need.has('python')) await wingetInstall(WINGET_IDS.python, 'Python 3.12');
    if (need.has('javascript')) await wingetInstall(WINGET_IDS.node, 'Node.js LTS');
    console.log('\nRe-run with --check after restarting your terminal (PATH refresh).');
  } else {
    console.log('\nRun with --install to attempt automatic Windows installs via winget.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
