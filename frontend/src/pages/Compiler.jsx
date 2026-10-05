import { AlertTriangle, Eraser, Play, ScanSearch, Sparkles, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import AiTutor from '../components/AiTutor';
import AstViewer from '../components/AstViewer';
import CodeEditor from '../components/CodeEditor';
import OutputViewer from '../components/OutputViewer';
import TokenTable from '../components/TokenTable';
import { Badge, Button, EmptyState } from '../components/ui';
import {
  aiGenerate,
  analyzeFull,
  getTokens,
  getToolchainStatus,
  optimizeCode,
  runCode,
} from '../services/api';
import { LANGUAGE_META, SAMPLES_BY_LANG } from '../utils/samples';

const LANGUAGES = [
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
];

const TOOLS = [
  { id: 'tokens', label: 'Lexical' },
  { id: 'syntax', label: 'Syntax' },
  { id: 'ast', label: 'AST' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'output', label: 'Run' },
];

function explainDiagnostic(d) {
  if (d.phase === 'syntax' || d.phase === 'lex') {
    return `The code breaks a grammar rule near line ${d.line}. Expected syntax differs from what was written — check brackets, semicolons and statement structure.`;
  }
  if (d.phase === 'semantic') {
    return `The code parses but its meaning is invalid — e.g. undeclared names, type mismatches or scope problems near line ${d.line}.`;
  }
  return d.message;
}

export default function Compiler() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(SAMPLES_BY_LANG.cpp.hello.code);
  const [tool, setTool] = useState('tokens');
  const [status, setStatus] = useState('Write code, then press Analyze.');
  const [selectedRange, setSelectedRange] = useState(null);

  const [lexResult, setLexResult] = useState(null);
  const [lexLoading, setLexLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [stdin, setStdin] = useState('');

  const [prompt, setPrompt] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genInfo, setGenInfo] = useState(null);
  const [toolchain, setToolchain] = useState(null);

  useEffect(() => {
    getToolchainStatus()
      .then((body) => setToolchain(body.data))
      .catch(() => setToolchain(null));
  }, []);

  const toolchainFor = (lang) => {
    if (!toolchain) return null;
    if (lang === 'cpp') return toolchain.cpp;
    if (lang === 'c') return toolchain.c;
    if (lang === 'java') return toolchain.java;
    if (lang === 'python') return toolchain.python;
    return null;
  };
  const currentTool = toolchainFor(language);

  const meta = LANGUAGE_META[language] ?? LANGUAGE_META.cpp;
  const samples = SAMPLES_BY_LANG[language] ?? SAMPLES_BY_LANG.cpp;

  const diagnostics = analysis?.diagnostics ?? lexResult?.diagnostics ?? [];
  const dedup = (list) => {
    const seen = new Set();
    return list.filter((d) => {
      const key = `${d.phase}|${d.code}|${d.line}|${d.column}|${String(d.message || '').trim().toLowerCase().slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const syntaxIssues = dedup(diagnostics.filter((d) => d.phase === 'syntax' || d.phase === 'lex' || d.phase === 'lexical'));
  const semanticIssues = dedup(diagnostics.filter((d) => d.phase === 'semantic'));

  const markers = diagnostics.map((d) => ({
    line: d.line,
    column: d.column,
    endLine: d.endLine,
    endColumn: d.endColumn,
    severity: d.severity === 'warning' ? 'warning' : d.severity === 'info' ? 'info' : 'error',
    message: `${d.code}: ${d.message}`,
    source: 'codexa',
  }));

  const switchLanguage = (next) => {
    if (next === language) return;
    setLanguage(next);
    setCode((SAMPLES_BY_LANG[next] ?? SAMPLES_BY_LANG.cpp).hello.code);
    setLexResult(null);
    setAnalysis(null);
    setOptResult(null);
    setRunResult(null);
    setStatus(`Switched to ${LANGUAGE_META[next]?.label} — sample loaded. Press Analyze.`);
  };

  const analyze = async () => {
    setAnalyzing(true);
    setLexLoading(true);
    try {
      const [lexBody, fullBody] = await Promise.all([
        getTokens(code, language),
        analyzeFull(code, language),
      ]);
      setLexResult(lexBody.data);
      setAnalysis(fullBody.data);
      const errs = fullBody.data.stats.errors;
      setStatus(
        errs === 0
          ? `Clean — ${lexBody.data.stats.total} tokens, ${fullBody.data.stats.nodes} AST nodes.`
          : `Found ${errs} problem(s) — see Syntax / Semantic tabs.`,
      );
    } catch (e) {
      setStatus(`Analysis failed: ${e?.response?.data?.error?.message || e.message}`);
    } finally {
      setAnalyzing(false);
      setLexLoading(false);
    }
  };

  const optimize = async () => {
    setOptLoading(true);
    try {
      const body = await optimizeCode(code, language);
      setOptResult(body.data);
      setTool('optimize');
      setStatus(
        body.data.optimizations.length === 0
          ? 'No applicable optimizations found in this code.'
          : `${body.data.optimizations.length} optimization(s) found.`,
      );
    } catch (e) {
      setStatus(`Optimize failed: ${e?.response?.data?.error?.message || e.message}`);
    } finally {
      setOptLoading(false);
    }
  };

  const run = async () => {
    setRunLoading(true);
    try {
      const body = await runCode(code, language, stdin);
      setRunResult(body.data);
      setTool('output');
      if (body.data.compile.success && body.data.run.exitCode === 0) {
        setStatus('Program finished — see Run tab.');
      } else if (!body.data.compile.success) {
        const first = body.data.compile.diagnostics?.[0]?.message || 'compile error';
        setStatus(`Compile failed: ${first} — see Run tab.`);
      } else if (body.data.run.timedOut) {
        setStatus('Program timed out after 5s — infinite loop? See Run tab.');
      } else {
        setStatus(`Exited with code ${body.data.run.exitCode} — see Run tab.`);
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e.message;
      setRunResult({
        compile: {
          success: false,
          diagnostics: [
            {
              phase: 'compile',
              source: 'network',
              severity: 'error',
              code: 'RUN_REQUEST_FAILED',
              message: `Could not reach the run service: ${msg}. Is the backend running (cd backend; npm run dev)?`,
              line: 0,
              column: 0,
              endLine: 0,
              endColumn: 0,
            },
          ],
          elapsedMs: 0,
        },
        run: { stdout: '', stderr: '', exitCode: 1, timedOut: false, signal: null, elapsedMs: 0 },
      });
      setTool('output');
      setStatus(`Run failed: ${msg}`);
    } finally {
      setRunLoading(false);
    }
  };

  const generate = async () => {
    const p = prompt.trim();
    if (!p || genLoading) return;
    setGenLoading(true);
    setGenInfo(null);
    try {
      const body = await aiGenerate({ prompt: p, language });
      if (body.data?.code) {
        setCode(body.data.code);
        setLexResult(null);
        setAnalysis(null);
        setOptResult(null);
        setRunResult(null);
        setGenInfo({
          engine: body.data.engine,
          explanation: body.data.explanation,
          time: body.data.timeComplexity,
          space: body.data.spaceComplexity,
        });
        setStatus(
          body.data.engine === 'ai'
            ? 'AI-generated code placed in the editor — press Analyze, then Run.'
            : 'Offline-generated runnable code placed in the editor — press Analyze, then Run.',
        );
      } else {
        setStatus('Generation returned no code.');
      }
    } catch (e) {
      setStatus(`Generate failed: ${e?.response?.data?.error?.message || e.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  const renderIssues = (list, emptyTitle, emptyHint) =>
    list.length === 0 ? (
      <EmptyState title={emptyTitle} hint={emptyHint} />
    ) : (
      <ul className="space-y-2">
        {list.map((d, i) => (
          <li key={i} className="rounded-lg border border-edge bg-panel px-3 py-2 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={d.severity === 'error' ? 'red' : d.severity === 'warning' ? 'amber' : 'teal'}>
                {d.severity}
              </Badge>
              <span className="code-font text-xs text-muted">
                Line {d.line} · {d.code}
              </span>
            </div>
            <p className="mt-1 font-medium text-body">{d.message}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{explainDiagnostic(d)}</p>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-4 sm:px-4">
      {currentTool && currentTool.available === false && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-body" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300 light:text-amber-700" />
          <p>
            <strong>{meta.label}</strong> toolchain not detected ({currentTool.path || 'missing'}). Run will
            explain how to install it — or switch to Python, which usually works everywhere.
          </p>
        </div>
      )}
      {/* Toolbar */}
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        <select
          value={language}
          onChange={(e) => switchLanguage(e.target.value)}
          className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
          aria-label="Language selector"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={analyze} disabled={analyzing}>
          <ScanSearch size={15} /> {analyzing ? 'Analyzing…' : 'Analyze'}
        </Button>
        <Button size="sm" variant="secondary" onClick={optimize} disabled={optLoading}>
          <Zap size={15} /> {optLoading ? 'Optimizing…' : 'Optimize'}
        </Button>
        <Button size="sm" variant="secondary" onClick={run} disabled={runLoading}>
          <Play size={15} /> {runLoading ? 'Running…' : 'Run'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setCode(samples.hello.code);
            setLexResult(null);
            setAnalysis(null);
            setOptResult(null);
            setRunResult(null);
            setStatus('Editor reset.');
          }}
        >
          <Eraser size={15} /> Reset
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setCode('');
            setLexResult(null);
            setAnalysis(null);
            setOptResult(null);
            setRunResult(null);
            setStatus('Editor cleared — blank canvas.');
          }}
        >
          <Trash2 size={15} /> Clear
        </Button>
        <span className="ml-auto hidden items-center gap-2 text-xs text-muted lg:flex" role="status">
          <span className="size-2 rounded-full bg-teal-400" />
          {status}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[180px_1fr_320px]">
        {/* Left: tools */}
        <aside className="panel flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col">
          <p className="hidden px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted lg:block">
            Tools
          </p>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                tool === t.id
                  ? 'bg-teal-400/10 text-teal-300 light:text-teal-700'
                  : 'text-muted hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="hidden px-2 pt-2 lg:block">
            <p className="text-[11px] uppercase tracking-wider text-faint">Samples</p>
            {Object.entries(samples).map(([key, s]) => (
              <button
                key={key}
                onClick={() => {
                  setCode(s.code);
                  setLexResult(null);
                  setAnalysis(null);
                  setOptResult(null);
                  setRunResult(null);
                }}
                className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted hover:bg-ink/5 hover:text-ink"
              >
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Center: editor + results */}
        <section className="panel flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-2">
            <p className="code-font truncate text-xs text-muted">
              {meta.file} · {code.split('\n').length} lines · {meta.label}
            </p>
            <Badge tone="teal">Monaco</Badge>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={meta.monaco}
            markers={markers}
            highlight={selectedRange}
            height="360px"
          />
          <div className="min-h-[180px] border-t border-edge bg-sunken p-4 text-sm">
            {tool === 'tokens' && (
              <TokenTable
                result={lexResult}
                loading={lexLoading}
                error={null}
                stale={false}
                onRun={analyze}
              />
            )}
            {tool === 'syntax' &&
              renderIssues(
                syntaxIssues,
                analysis ? 'No syntax errors' : 'No syntax check yet',
                analysis ? 'Your code follows the grammar rules.' : 'Press Analyze to check syntax.',
              )}
            {tool === 'ast' && <AstViewer ast={analysis?.ast ?? null} onSelect={setSelectedRange} />}
            {tool === 'semantic' &&
              renderIssues(
                semanticIssues,
                analysis ? 'No semantic errors' : 'No semantic check yet',
                analysis
                  ? 'No undeclared variables, type mismatches or scope problems found.'
                  : 'Press Analyze to check meaning and types.',
              )}
            {tool === 'optimize' &&
              (!optResult ? (
                <EmptyState
                  title="No optimization yet"
                  hint="Press Optimize to find constant folding, propagation, dead code and repeated expressions in your code."
                  action={
                    <Button size="sm" onClick={optimize} disabled={optLoading}>
                      <Zap size={14} /> {optLoading ? 'Optimizing…' : 'Optimize my code'}
                    </Button>
                  }
                />
              ) : optResult.optimizations.length === 0 ? (
                <EmptyState
                  title="Already optimal"
                  hint="None of the four techniques apply to this code. Try code with constant math (10 * 5), a reused variable, or an unused assignment."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {optResult.optimizations.map((o, i) => (
                    <div key={i} className="rounded-lg border border-edge bg-panel px-3 py-2 text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="teal">{o.type}</Badge>
                        <span className="code-font text-xs text-muted">Line {o.line}</span>
                      </div>
                      <p className="code-font mt-2 text-xs text-muted">Before</p>
                      <pre className="code-font overflow-auto rounded-lg bg-code p-2 text-xs text-body">{o.before}</pre>
                      <p className="code-font mt-1 text-xs text-muted">After</p>
                      <pre className="code-font overflow-auto rounded-lg bg-code p-2 text-xs text-teal-300 light:text-teal-700">{o.after}</pre>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{o.explanation}</p>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => setCode(optResult.optimizedCode)}
                  >
                    Apply optimized code
                  </Button>
                </div>
              ))}
            {tool === 'output' && (
              <>
                <label className="mb-2 block text-xs font-medium text-muted" htmlFor="studio-stdin">
                  Program input (stdin)
                </label>
                <textarea
                  id="studio-stdin"
                  rows={2}
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Input for your program…"
                  className="mb-3 w-full rounded-xl border border-edge2 bg-panel px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
                />
                <OutputViewer result={runResult} loading={runLoading} error={null} stale={false} onRun={run} />
              </>
            )}
          </div>
        </section>

        {/* Right: AI tutor + generator */}
        <aside className="flex flex-col gap-3">
          <div className="panel flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Generate code</p>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a Java program to find the largest of three numbers"
              className="mt-2 w-full rounded-xl border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
            />
            <Button size="sm" className="mt-2" onClick={generate} disabled={genLoading || prompt.trim().length < 4}>
              <Sparkles size={14} /> {genLoading ? 'Generating…' : 'Generate into editor'}
            </Button>
            {genInfo && (
              <div className="mt-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
                <p>
                  <span className={`font-semibold ${genInfo.engine === 'ai' ? 'text-teal-600 dark:text-teal-300' : 'text-amber-600 dark:text-amber-300'}`}>
                    {genInfo.engine === 'ai' ? 'AI model' : 'Offline builder'}
                  </span>
                  {genInfo.time && <> · {genInfo.time} time · {genInfo.space} space</>}
                </p>
                {genInfo.explanation && <p className="mt-1">{genInfo.explanation}</p>}
              </div>
            )}
          </div>

          <AiTutor code={code} language={language} diagnostics={diagnostics} />
        </aside>
      </div>

      <p className="px-1 text-xs text-faint lg:hidden" role="status">
        {status}
      </p>
    </div>
  );
}
