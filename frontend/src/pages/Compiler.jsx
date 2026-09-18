import { AlertTriangle, Eraser, FolderOpen, Play, Save, ScanSearch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AstViewer from '../components/AstViewer';
import CodeEditor from '../components/CodeEditor';
import SymbolsTable from '../components/SymbolsTable';
import TokenTable from '../components/TokenTable';
import { Badge, Button, EmptyState } from '../components/ui';
import { analyzeSource, getTokens } from '../services/api';
import { CPP_SAMPLES } from '../utils/samples';

const TABS = ['Output', 'Diagnostics', 'Tokens', 'AST', 'Symbols', 'Intermediate Code'];
const LANGUAGES = [
  { id: 'cpp', label: 'C++', enabled: true },
  { id: 'c', label: 'C (soon)', enabled: false },
  { id: 'java', label: 'Java (soon)', enabled: false },
];

export default function Compiler() {
  const [code, setCode] = useState(CPP_SAMPLES.hello.code);
  const [sampleKey, setSampleKey] = useState('hello');
  const [tab, setTab] = useState('Output');
  const [language, setLanguage] = useState('cpp');
  const [status, setStatus] = useState('Ready — lexer is live in the Tokens tab; parsing arrives in Phase 4.');
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [lexResult, setLexResult] = useState(null);
  const [lexLoading, setLexLoading] = useState(false);
  const [lexError, setLexError] = useState(null);
  const [lexedCode, setLexedCode] = useState(null);
  const lexStale = lexResult !== null && lexedCode !== code;
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  const lineCount = code.split('\n').length;
  const isDirty = code !== CPP_SAMPLES[sampleKey].code;

  const loadSample = (key) => {
    setSampleKey(key);
    setCode(CPP_SAMPLES[key].code);
    setStatus(`Loaded sample: ${CPP_SAMPLES[key].label}`);
  };

  const reset = () => {
    setCode(CPP_SAMPLES[sampleKey].code);
    setStatus('Editor reset to the active sample.');
  };

  const notReady = (name) => setStatus(`${name} is not wired yet — lands in its phase (see Docs). No action was taken.`);

  const runLexer = async () => {
    setLexLoading(true);
    setLexError(null);
    try {
      const body = await getTokens(code, language);
      setLexResult(body.data);
      setLexedCode(code);
      const { errors, warnings, total } = body.data.stats;
      setStatus(`Lexer: ${total} tokens, ${errors} errors, ${warnings} warnings.`);
      if (errors > 0 || warnings > 0) setTab('Diagnostics');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setLexError(msg);
      setStatus(`Lexer request failed: ${msg}`);
    } finally {
      setLexLoading(false);
    }
  };

  // Ctrl/Cmd+S is intercepted so the browser doesn't save the page;
  // real project saving arrives in Phase 9.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        notReady('Save');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        analyzeRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const body = await analyzeSource(code, language);
      setAnalysis(body.data);
      const { nodes, errors, warnings, semanticSkipped } = body.data.stats;
      setStatus(
        `Analysis: ${nodes} AST nodes, ${errors} errors, ${warnings} warnings` +
        (semanticSkipped ? ' (semantic skipped: fix syntax first)' : '') +
        '.',
      );
      if (errors > 0) setTab('Diagnostics');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setAnalysisError(msg);
      setStatus(`Analysis failed: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };
  const analyzeRef = useRef(null);
  analyzeRef.current = runAnalyze;

  // Squiggles in Monaco, straight from real diagnostics.
  const markers = (analysis?.diagnostics ?? []).map((d) => ({
    line: d.line,
    column: d.column,
    endLine: d.endLine,
    endColumn: d.endColumn,
    severity: d.severity === 'warning' ? 'warning' : 'error',
    message: `${d.code} [${d.source}/${d.phase}]: ${d.message}`,
    source: 'codexa',
  }));
  const shownDiagnostics = analysis ? analysis.diagnostics : (lexResult?.diagnostics ?? []);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-4 sm:px-4">
      {/* Toolbar */}
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
          aria-label="Language selector"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id} disabled={!l.enabled}>{l.label}</option>
          ))}
        </select>
        <Badge tone="amber">C++ only in v1 · Java/C later</Badge>
        <div className="mx-1 hidden h-6 w-px bg-edge2 sm:block" />
        <Button size="sm" onClick={runAnalyze} disabled={analyzing}>
          <ScanSearch size={15} /> {analyzing ? 'Analyzing…' : 'Analyze'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => notReady('Run')}>
          <Play size={15} /> Run
        </Button>
        <Button size="sm" variant="secondary" onClick={reset}>
          <Eraser size={15} /> Reset
        </Button>
        <Button size="sm" variant="secondary" onClick={() => notReady('Save')}>
          <Save size={15} /> Save
        </Button>
        <span className="ml-auto hidden items-center gap-2 text-xs text-muted lg:flex" role="status">
          <span className="size-2 rounded-full bg-teal-400" />
          {status}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_1fr_300px]">
        {/* Left: projects/files/samples */}
        <aside className="panel hidden flex-col p-3 lg:flex">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Explorer</p>
          <div className="mt-2 space-y-1">
            <p className="px-2 pt-2 text-[11px] uppercase tracking-wider text-faint">Sample programs</p>
            {Object.entries(CPP_SAMPLES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => loadSample(key)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  sampleKey === key ? 'bg-teal-400/10 text-teal-300 light:text-teal-700' : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <FolderOpen size={14} /> {s.label}
              </button>
            ))}
            <p className="px-2 pt-3 text-[11px] uppercase tracking-wider text-faint">Projects</p>
            <EmptyState
              title="No saved projects yet"
              hint="Project persistence with MongoDB arrives in Phase 9."
            />
          </div>
        </aside>

        {/* Center: Monaco editor */}
        <section className="panel flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-2">
            <p className="code-font truncate text-xs text-muted">
              main.cpp · {lineCount} lines
            </p>
            <div className="flex items-center gap-2">
              {isDirty && <Badge tone="amber">Modified</Badge>}
              <Badge tone="teal">Monaco · C++</Badge>
            </div>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            markers={markers}
            highlight={selectedRange}
            onCursorChange={setCursor}
            height="420px"
          />
          {/* VS Code-style status bar */}
          <div className="code-font flex items-center gap-4 border-t border-edge bg-sunken px-4 py-1.5 text-[11px] text-muted">
            <span>Ln {cursor.line}, Col {cursor.column}</span>
            <span className="hidden sm:inline">Spaces: 4</span>
            <span className="hidden sm:inline">UTF-8</span>
            <span className="ml-auto">Ctrl+Enter: analyze · Ctrl+S: save (Phase 9)</span>
          </div>
          {/* Bottom panel */}
          <div className="border-t border-edge">
            <div className="flex gap-1 overflow-x-auto px-2 pt-2" role="tablist" aria-label="Analysis output tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                    tab === t ? 'bg-ink/10 text-ink' : 'text-muted hover:text-body'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="min-h-[140px] border-t border-edge bg-sunken p-4 text-sm">
              {tab === 'Output' && (
                <p className="flex items-start gap-2 text-muted">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  Execution is disabled in Phase 4. Sandboxed compile + run arrives in Phase 6.
                  Press Analyze (or Ctrl+Enter) for the full educational pipeline: tokens, AST, symbols, diagnostics.
                </p>
              )}
              {tab === 'Diagnostics' && (
                <>
                  {analysisError && (
                    <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 light:text-red-700" role="alert">
                      Analysis failed: {analysisError}
                    </p>
                  )}
                  {shownDiagnostics.length > 0 ? (
                    <ul className="space-y-2">
                      {shownDiagnostics.map((d, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-[13px]">
                          <Badge tone={d.severity === 'error' ? 'red' : 'amber'}>{d.severity}</Badge>
                          <span className="code-font text-xs text-muted">{d.code}</span>
                          <span className="code-font text-xs text-faint">{d.source}/{d.phase}</span>
                          <span className="basis-full text-body sm:basis-auto">{d.message}</span>
                          <span className="code-font ml-auto text-xs text-muted">
                            L{d.line}:{d.column} → L{d.endLine}:{d.endColumn}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      title={analysis || lexResult ? 'No diagnostics — code is clean' : 'No diagnostics yet'}
                      hint={analysis || lexResult ? 'This analysis found nothing to report.' : 'Press Analyze in the toolbar (or Ctrl+Enter) first.'}
                    />
                  )}
                </>
              )}
              {tab === 'Tokens' && (
                <TokenTable result={lexResult} loading={lexLoading} error={lexError} stale={lexStale} onRun={runLexer} />
              )}
              {tab === 'AST' && (
                <AstViewer ast={analysis?.ast ?? null} onSelect={setSelectedRange} />
              )}
              {tab === 'Symbols' && (
                <SymbolsTable symbols={analysis?.symbols ?? []} />
              )}
              {tab === 'Intermediate Code' && (
                <EmptyState title="No TAC yet" hint="Three-address code generation arrives in Phase 5." />
              )}
            </div>
          </div>
        </section>

        {/* Right: AI Detective placeholder */}
        <aside className="panel flex min-h-[200px] flex-col p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">AI Error Detective</p>
          <EmptyState
            title="Select a diagnostic to begin"
            hint="Grounded explanations (beginner / intermediate / advanced) arrive in Phase 7. The AI will never edit code without approval."
          />
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              disabled
              title="Available from Phase 7"
            >
              Explain error (Phase 7)
            </Button>
          </div>
          <div className="mt-4 border-t border-edge pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">AST · Symbols · Pipeline</p>
            <p className="mt-1 text-xs leading-relaxed text-faint">
              Interactive visualizations arrive in Phases 4–5 and 8. See the Docs page for the roadmap.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile sample picker */}
      <div className="panel p-3 lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sample programs</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CPP_SAMPLES).map(([key, s]) => (
            <Button key={key} size="sm" variant={sampleKey === key ? 'primary' : 'secondary'} onClick={() => loadSample(key)}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
