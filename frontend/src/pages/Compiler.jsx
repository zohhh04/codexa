import { Eraser, FolderOpen, Play, Redo2, Save, ScanSearch, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AiDetective from '../components/AiDetective';
import AstViewer from '../components/AstViewer';
import CodeEditor from '../components/CodeEditor';
import OutputViewer from '../components/OutputViewer';
import PipelineViewer from '../components/PipelineViewer';
import SymbolsTable from '../components/SymbolsTable';
import TacViewer from '../components/TacViewer';
import TokenTable from '../components/TokenTable';
import { Badge, Button, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import useCodeHistory from '../hooks/useCodeHistory';
import { analyzeFull, createProject, deleteProject, generateTAC, getProjects, getTokens, runCode, saveHistory, updateProject } from '../services/api';
import { LANGUAGE_META, SAMPLES_BY_LANG } from '../utils/samples';
import { loadEditorPrefs } from '../utils/editorPrefs';

const TABS = ['Output', 'Diagnostics', 'Tokens', 'AST', 'Symbols', 'Intermediate Code', 'Pipeline'];
const LANGUAGES = [
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];

export default function Compiler() {
  const { user } = useAuth();
  const { code, setCode, undo, redo, canUndo, canRedo } = useCodeHistory(SAMPLES_BY_LANG.cpp.hello.code);
  const [sampleKey, setSampleKey] = useState('hello');
  const [tab, setTab] = useState('Output');
  const [language, setLanguage] = useState('cpp');
  const [status, setStatus] = useState('Ready — press Analyze for tokens, AST, symbols and diagnostics.');
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [editorPrefs] = useState(loadEditorPrefs);
  const [lexResult, setLexResult] = useState(null);
  const [lexLoading, setLexLoading] = useState(false);
  const [lexError, setLexError] = useState(null);
  const [lexedCode, setLexedCode] = useState(null);
  const lexStale = lexResult !== null && lexedCode !== code;
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [tacResult, setTacResult] = useState(null);
  const [tacLoading, setTacLoading] = useState(false);
  const [tacError, setTacError] = useState(null);
  const [tacedCode, setTacedCode] = useState(null);
  const tacStale = tacResult !== null && tacedCode !== code;
  const [runResult, setRunResult] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState(null);
  const [runCode_state, setRunCode] = useState(null);
  const runStale = runResult !== null && runCode_state !== code;
  const [stdin, setStdin] = useState('');
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  // Project state
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('');

  const samples = SAMPLES_BY_LANG[language] ?? SAMPLES_BY_LANG.cpp;
  const meta = LANGUAGE_META[language] ?? LANGUAGE_META.cpp;
  const lineCount = code.split('\n').length;
  const isDirty = sampleKey && samples[sampleKey] ? code !== samples[sampleKey].code : code.length > 0;

  const clearResults = () => {
    setLexResult(null);
    setLexedCode(null);
    setAnalysis(null);
    setTacResult(null);
    setTacedCode(null);
    setRunResult(null);
    setRunCode(null);
    setSelectedDiagnostic(null);
    setSelectedRange(null);
  };

  const handleLanguageChange = (next) => {
    if (next === language) return;
    setLanguage(next);
    const nextSamples = SAMPLES_BY_LANG[next] ?? SAMPLES_BY_LANG.cpp;
    setSampleKey('hello');
    setCode(nextSamples.hello.code);
    setCurrentProjectId(null);
    setCurrentProjectTitle('');
    clearResults();
    setStatus(`Switched to ${LANGUAGE_META[next]?.label ?? next} — sample loaded. Press Analyze or Run.`);
  };

  const loadSample = (key) => {
    if (!samples[key]) return;
    setSampleKey(key);
    setCode(samples[key].code);
    setCurrentProjectId(null);
    setCurrentProjectTitle('');
    setStatus(`Loaded sample: ${samples[key].label} (${meta.label})`);
  };

  const reset = () => {
    if (sampleKey && samples[sampleKey]) {
      setCode(samples[sampleKey].code);
      setStatus('Editor reset to the active sample.');
    } else {
      setCode(samples.hello.code);
      setSampleKey('hello');
      setStatus('Editor reset to the default sample.');
    }
  };

  // Pick up code handed off from AI Studio / Problems ("Open in Compiler").
  useEffect(() => {
    try {
      const raw = localStorage.getItem('codexa_handoff');
      if (!raw) return;
      const h = JSON.parse(raw);
      if (Date.now() - (h.at || 0) > 5 * 60 * 1000) return;
      if (h.language && SAMPLES_BY_LANG[h.language]) setLanguage(h.language);
      if (typeof h.code === 'string' && h.code.length > 0) {
        setCode(h.code);
        setSampleKey(null);
        setCurrentProjectId(null);
        setCurrentProjectTitle('');
        clearResults();
        setStatus('Loaded code from AI Studio — press Analyze or Run.');
      }
      localStorage.removeItem('codexa_handoff');
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load projects from API
  const loadProjects = async () => {
    if (!user) return;
    try {
      const body = await getProjects();
      if (body.success) setProjects(body.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadProjects(); }, [user]);

  // Load a project into the editor
  const loadProject = async (id) => {
    try {
      const { data } = await import('../services/api').then((m) => m.default.get(`/projects/${id}`));
      if (data.success) {
        const lang = SAMPLES_BY_LANG[data.data.language] ? data.data.language : 'cpp';
        setLanguage(lang);
        setCode(data.data.sourceCode);
        setCurrentProjectId(data.data._id);
        setCurrentProjectTitle(data.data.title);
        setSampleKey(null);
        clearResults();
        setStatus(`Loaded project: ${data.data.title}`);
      }
    } catch (err) {
      setStatus(`Failed to load project: ${err.message}`);
    }
  };

  // Save current code as a project
  const handleSave = async () => {
    if (!user) {
      setStatus('Sign in to save projects.');
      return;
    }
    try {
      if (currentProjectId) {
        await updateProject(currentProjectId, { sourceCode: code, language });
        setStatus(`Saved project: ${currentProjectTitle}`);
      } else {
        const title = currentProjectTitle || prompt('Project name:', 'Untitled');
        if (!title) return;
        const body = await createProject({ title, language, sourceCode: code });
        if (body.success) {
          setCurrentProjectId(body.data._id);
          setCurrentProjectTitle(title);
          setStatus(`Created project: ${title}`);
          loadProjects();
        }
      }
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    }
  };

  // Delete a project
  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setCurrentProjectTitle('');
      }
      loadProjects();
      setStatus('Project deleted.');
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`);
    }
  };

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

  // Ctrl/Cmd+Z/Y for undo/redo, Ctrl+S intercepted, Ctrl+Enter for analyze.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        analyzeRef.current?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (document.activeElement?.closest?.('.monaco-editor')) return;
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        if (document.activeElement?.closest?.('.monaco-editor')) return;
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const runAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const body = await analyzeFull(code, language);
      setAnalysis(body.data);
      setTacResult(body.data);
      setTacedCode(code);
      const { nodes, errors, warnings, semanticSkipped, instructions: instrCount } = body.data.stats;
      setStatus(
        `Analysis: ${nodes} AST nodes, ${instrCount} TAC instructions, ${errors} errors, ${warnings} warnings` +
        (semanticSkipped ? ' (semantic skipped: fix syntax first)' : '') +
        '.',
      );
      if (errors > 0) setTab('Diagnostics');
      // Phase 9: persist a light history entry (fire-and-forget, signed in only).
      if (user) {
        saveHistory({
          projectId: currentProjectId,
          sourceCode: code,
          language,
          diagnostics: body.data.diagnostics ?? [],
          stats: { ...(body.data.stats ?? {}), kind: 'analyze' },
        }).catch(() => { /* history is best-effort */ });
      }
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

  const runTac = async () => {
    setTacLoading(true);
    setTacError(null);
    try {
      const body = await generateTAC(code, language);
      setTacResult(body.data);
      setTacedCode(code);
      const { instructions, errors, warnings } = body.data.stats;
      setStatus(`TAC: ${instructions} instructions, ${errors} errors, ${warnings} warnings.`);
      setTab('Intermediate Code');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setTacError(msg);
      setStatus(`TAC generation failed: ${msg}`);
    } finally {
      setTacLoading(false);
    }
  };

  const handleRun = async () => {
    setRunLoading(true);
    setRunError(null);
    try {
      const body = await runCode(code, language, stdin);
      setRunResult(body.data);
      setRunCode(code);
      const { compile, run } = body.data;
      if (!compile.success) {
        setStatus(`Compile failed: ${compile.diagnostics.length} diagnostic(s).`);
        setTab('Output');
      } else if (run.exitCode === 0) {
        setStatus(`Program ran successfully in ${run.elapsedMs} ms (exit 0).`);
        setTab('Output');
      } else {
        setStatus(`Program exited with code ${run.exitCode}${run.timedOut ? ' (timed out)' : ''}.`);
        setTab('Output');
      }
      // Phase 9: persist a light history entry (fire-and-forget, signed in only).
      if (user) {
        saveHistory({
          projectId: currentProjectId,
          sourceCode: code,
          language,
          diagnostics: compile.diagnostics ?? [],
          stats: { kind: 'run', compileSuccess: compile.success, exitCode: run.exitCode, timedOut: run.timedOut },
        }).catch(() => { /* history is best-effort */ });
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'unknown error';
      setRunError(msg);
      setStatus(`Run failed: ${msg}`);
    } finally {
      setRunLoading(false);
    }
  };

  // Called when user approves an AI fix
  const handleApplyFix = (verifiedCode) => {
    setCode(verifiedCode);
    setStatus('Applied AI fix. Code updated — press Analyze to re-check.');
    setSelectedDiagnostic(null);
  };

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
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
          aria-label="Language selector"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        {meta.fullPipeline ? (
          <Badge tone="teal">Full pipeline: tokens · AST · TAC · run</Badge>
        ) : (
          <Badge tone="amber">Tokens + Run supported · AST/TAC are C/C++-only</Badge>
        )}
        <div className="mx-1 hidden h-6 w-px bg-edge2 sm:block" />
        <Button size="sm" onClick={runAnalyze} disabled={analyzing}>
          <ScanSearch size={15} /> {analyzing ? 'Analyzing…' : 'Analyze'}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRun} disabled={runLoading}>
          <Play size={15} /> {runLoading ? 'Running…' : 'Run'}
        </Button>
        <Button size="sm" variant="secondary" onClick={reset}>
          <Eraser size={15} /> Reset
        </Button>
        <Button size="sm" variant="secondary" onClick={handleSave}>
          <Save size={15} /> {currentProjectId ? 'Save' : 'Save as…'}
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-edge2 sm:block" />
        <Button size="sm" variant="secondary" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </Button>
        <Button size="sm" variant="secondary" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
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
            <p className="px-2 pt-2 text-[11px] uppercase tracking-wider text-faint">Sample programs · {meta.label}</p>
            {Object.entries(samples).map(([key, s]) => (
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
            {user ? (
              projects.length > 0 ? (
                projects.map((p) => (
                  <div key={p._id} className="group flex items-center gap-1">
                    <button
                      onClick={() => loadProject(p._id)}
                      className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        currentProjectId === p._id
                          ? 'bg-teal-400/10 text-teal-300 light:text-teal-700'
                          : 'text-muted hover:bg-ink/5 hover:text-ink'
                      }`}
                    >
                      <FolderOpen size={14} /> {p.title}
                    </button>
                    <button
                      onClick={() => handleDeleteProject(p._id)}
                      className="hidden p-1 text-muted hover:text-red-400 group-hover:block"
                      title="Delete project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-2 text-xs text-faint">No saved projects yet</p>
              )
            ) : (
              <p className="px-2 text-xs text-faint">Sign in to save projects</p>
            )}
          </div>
        </aside>

        {/* Center: Monaco editor */}
        <section className="panel flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-2">
            <p className="code-font truncate text-xs text-muted">
              {meta.file} · {lineCount} lines
            </p>
            <div className="flex items-center gap-2">
              {isDirty && <Badge tone="amber">Modified</Badge>}
              <Badge tone="teal">Monaco · {meta.label}</Badge>
            </div>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={meta.monaco}
            markers={markers}
            highlight={selectedRange}
            onCursorChange={setCursor}
            height="420px"
            fontSize={editorPrefs.fontSize}
            tabSize={editorPrefs.tabSize}
            wordWrap={editorPrefs.wordWrap}
          />
          {/* VS Code-style status bar */}
          <div className="code-font flex items-center gap-4 border-t border-edge bg-sunken px-4 py-1.5 text-[11px] text-muted">
            <span>Ln {cursor.line}, Col {cursor.column}</span>
            <span className="hidden sm:inline">Spaces: {editorPrefs.tabSize}</span>
            <span className="hidden sm:inline">UTF-8</span>
            <span className="ml-auto">Ctrl+Enter: analyze · Ctrl+S: save · Ctrl+Z/Y: undo/redo</span>
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
                <>
                  <label className="mb-2 block text-xs font-medium text-muted" htmlFor="compiler-stdin">
                    Program input (stdin) — fed to your program on Run
                  </label>
                  <textarea
                    id="compiler-stdin"
                    rows={2}
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="e.g. 10&#10;1 2 3 …"
                    className="mb-3 w-full rounded-xl border border-edge2 bg-panel px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
                  />
                  <OutputViewer result={runResult} loading={runLoading} error={runError} stale={runStale} onRun={handleRun} />
                </>
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
                        <li
                          key={i}
                          onClick={() => setSelectedDiagnostic(d)}
                          className={`flex flex-wrap items-center gap-2 rounded-lg border bg-panel px-3 py-2 text-[13px] transition-colors cursor-pointer hover:border-violet-400/50 ${
                            selectedDiagnostic === d
                              ? 'border-violet-400/50 bg-violet-400/10'
                              : 'border-edge'
                          }`}
                        >
                          <Badge tone={d.severity === 'error' ? 'red' : d.severity === 'warning' ? 'amber' : 'teal'}>{d.severity}</Badge>
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
                <TacViewer result={tacResult} loading={tacLoading} error={tacError} stale={tacStale} onRun={runTac} />
              )}
              {tab === 'Pipeline' && (
                <PipelineViewer
                  lexResult={lexResult}
                  analysis={analysis}
                  tacResult={tacResult}
                  runResult={runResult}
                />
              )}
            </div>
          </div>
        </section>

        {/* Right: AI Detective */}
        <aside className="panel flex min-h-[200px] flex-col p-4">
          <AiDetective diagnostic={selectedDiagnostic} sourceCode={code} onApplyFix={handleApplyFix} />
        </aside>
      </div>

      {/* Mobile sample picker */}
      <div className="panel p-3 lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sample programs · {meta.label}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(samples).map(([key, s]) => (
            <Button key={key} size="sm" variant={sampleKey === key ? 'primary' : 'secondary'} onClick={() => loadSample(key)}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
