import { Bug, FileText, Gauge, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import OutputViewer from '../components/OutputViewer';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { aiDebug, aiExplainCode, aiGenerate, aiOptimize, runCode } from '../services/api';
import { loadEditorPrefs } from '../utils/editorPrefs';

const LANGS = [
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];

const MONACO = { cpp: 'cpp', c: 'c', java: 'java', python: 'python', javascript: 'javascript', js: 'javascript' };

const TABS = [
  { id: 'generate', label: 'Code Generator', icon: <Sparkles size={15} /> },
  { id: 'explain', label: 'Code Explanation', icon: <FileText size={15} /> },
  { id: 'debug', label: 'AI Debugger', icon: <Bug size={15} /> },
  { id: 'optimize', label: 'Code Optimizer', icon: <Gauge size={15} /> },
];

function EngineBadge({ engine }) {
  if (!engine) return null;
  return engine === 'ai'
    ? <Badge tone="teal">AI model</Badge>
    : <Badge tone="amber">Offline template · add AI_API_KEY for LLM</Badge>;
}

export function handOff(code, language, navigate) {
  try {
    localStorage.setItem('codexa_handoff', JSON.stringify({ code, language, at: Date.now() }));
  } catch { /* ignore */ }
  navigate('/compiler');
}

export default function AIStudio() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('generate');
  const [language, setLanguage] = useState('cpp');
  const [prefs] = useState(loadEditorPrefs);

  // Generate
  const [prompt, setPrompt] = useState('Fibonacci: read n, print the first n numbers');
  const [gen, setGen] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState(null);

  // Explain
  const [expCode, setExpCode] = useState('def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a)\n        a, b = b, a + b\n');
  const [expLang, setExpLang] = useState('python');
  const [exp, setExp] = useState(null);
  const [expLoading, setExpLoading] = useState(false);

  // Debug
  const [dbgCode, setDbgCode] = useState('#include <iostream>\n\nint main() {\n    std::cout << x << std::endl;\n    return 0;\n}\n');
  const [dbgLang, setDbgLang] = useState('cpp');
  const [dbgStdin, setDbgStdin] = useState('');
  const [dbg, setDbg] = useState(null);
  const [dbgLoading, setDbgLoading] = useState(false);

  // Optimize
  const [optCode, setOptCode] = useState('for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        // ...\n    }\n}\n');
  const [optLang, setOptLang] = useState('cpp');
  const [opt, setOpt] = useState(null);
  const [optLoading, setOptLoading] = useState(false);

  // Inline run for generated code
  const [runStdin, setRunStdin] = useState('10');
  const [runRes, setRunRes] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runErr, setRunErr] = useState(null);

  const doGenerate = async () => {
    setGenLoading(true);
    setGenErr(null);
    try {
      const body = await aiGenerate({ prompt, language });
      if (body.success) setGen(body.data);
      else setGenErr('Generation failed.');
    } catch (e) {
      setGenErr(e?.response?.data?.error?.message || e.message);
    } finally {
      setGenLoading(false);
    }
  };

  const doExplain = async () => {
    setExpLoading(true);
    try {
      const body = await aiExplainCode({ sourceCode: expCode, language: expLang });
      if (body.success) setExp(body.data);
    } finally {
      setExpLoading(false);
    }
  };

  const doDebug = async () => {
    setDbgLoading(true);
    try {
      const body = await aiDebug({ sourceCode: dbgCode, language: dbgLang, stdin: dbgStdin });
      if (body.success) setDbg(body.data);
    } finally {
      setDbgLoading(false);
    }
  };

  const doOptimize = async () => {
    setOptLoading(true);
    try {
      const body = await aiOptimize({ sourceCode: optCode, language: optLang });
      if (body.success) setOpt(body.data);
    } finally {
      setOptLoading(false);
    }
  };

  const doRunGen = async () => {
    if (!gen?.code) return;
    setRunLoading(true);
    setRunErr(null);
    try {
      const body = await runCode(gen.code, language, runStdin);
      setRunRes(body.data);
    } catch (e) {
      setRunErr(e?.response?.data?.error?.message || e.message);
    } finally {
      setRunLoading(false);
    }
  };

  const langSel = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body" aria-label="Language">
      {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">AI Studio</h1>
      <p className="mt-1 text-sm text-muted">
        Generate code from a prompt, explain any program line by line, debug real errors, and optimize hot spots — in C, C++, Java, Python and JavaScript.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? 'primary' : 'secondary'} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </Button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              {langSel(language, setLanguage)}
              <EngineBadge engine={gen?.engine} />
            </div>
            <label className="mt-3 block text-xs font-medium text-muted" htmlFor="ai-prompt">
              Describe the problem — then Generate. Example: "Two sum: read n, array, target; print indices".
            </label>
            <textarea
              id="ai-prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-teal-400/60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={doGenerate} disabled={genLoading || prompt.trim().length < 4}>
                <Sparkles size={14} /> {genLoading ? 'Generating…' : 'Generate code'}
              </Button>
            </div>
            {genErr && <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 light:text-red-700">{genErr}</p>}
            {gen?.explanation && (
              <div className="mt-3 rounded-xl border border-edge bg-sunken p-3 text-sm text-body">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Approach</p>
                <p className="mt-1">{gen.explanation}</p>
                {(gen.timeComplexity || gen.spaceComplexity) && (
                  <p className="mt-2 flex flex-wrap gap-2">
                    {gen.timeComplexity && <Badge tone="violet">Time {gen.timeComplexity}</Badge>}
                    {gen.spaceComplexity && <Badge tone="teal">Space {gen.spaceComplexity}</Badge>}
                  </p>
                )}
              </div>
            )}
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Generated code</p>
              {gen?.code && <Button size="sm" variant="secondary" onClick={() => handOff(gen.code, language, navigate)}>Open in Compiler</Button>}
            </div>
            {!gen?.code ? (
              <EmptyState title="No code yet" hint="Write a prompt on the left and press Generate code." />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-edge">
                  <CodeEditor value={gen.code} onChange={() => {}} language={MONACO[language] ?? 'cpp'} height="300px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-muted" htmlFor="ai-run-stdin">Test input (stdin)</label>
                  <textarea id="ai-run-stdin" rows={2} value={runStdin} onChange={(e) => setRunStdin(e.target.value)} className="mt-1 w-full rounded-xl border border-edge2 bg-sunken px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal-400/60" />
                  <Button size="sm" variant="secondary" className="mt-2" onClick={doRunGen} disabled={runLoading}>
                    {runLoading ? 'Running…' : 'Run generated code'}
                  </Button>
                </div>
                <div className="mt-3">
                  <OutputViewer result={runRes} loading={runLoading} error={runErr} stale={false} onRun={doRunGen} />
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'explain' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2">
              {langSel(expLang, setExpLang)}
              <Button size="sm" onClick={doExplain} disabled={expLoading || !expCode.trim()}>
                {expLoading ? 'Explaining…' : 'Explain code'}
              </Button>
              <EngineBadge engine={exp?.engine} />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-edge">
              <CodeEditor value={expCode} onChange={setExpCode} language={MONACO[expLang] ?? 'cpp'} height="380px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-ink">Explanation</p>
            {!exp ? (
              <div className="mt-2"><EmptyState title="Nothing explained yet" hint="Paste code on the left and press Explain code." /></div>
            ) : (
              <div className="mt-2 space-y-3">
                <p className="text-sm leading-relaxed text-body">{exp.summary}</p>
                {(exp.timeComplexity || exp.spaceComplexity) && (
                  <p className="flex flex-wrap gap-2">
                    {exp.timeComplexity && <Badge tone="violet">Time {exp.timeComplexity}</Badge>}
                    {exp.spaceComplexity && <Badge tone="teal">Space {exp.spaceComplexity}</Badge>}
                    {exp.complexityReason && <span className="text-xs text-muted">{exp.complexityReason}</span>}
                  </p>
                )}
                <div className="max-h-96 space-y-1.5 overflow-auto">
                  {(exp.lines ?? []).map((l) => (
                    <div key={l.line} className="rounded-lg border border-edge bg-sunken px-3 py-2">
                      <p className="font-mono text-[11px] text-muted">L{l.line} · <span className="text-ink">{l.code || '∅'}</span></p>
                      <p className="mt-0.5 text-[13px] text-body">{l.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'debug' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              {langSel(dbgLang, setDbgLang)}
              <Button size="sm" onClick={doDebug} disabled={dbgLoading || !dbgCode.trim()}>
                <Bug size={14} /> {dbgLoading ? 'Debugging…' : 'Debug code'}
              </Button>
              <EngineBadge engine={dbg?.engine} />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-edge">
              <CodeEditor value={dbgCode} onChange={setDbgCode} language={MONACO[dbgLang] ?? 'cpp'} height="340px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
            </div>
            <label className="mt-3 block text-xs font-medium text-muted" htmlFor="dbg-stdin">Program input (stdin, optional)</label>
            <textarea id="dbg-stdin" rows={2} value={dbgStdin} onChange={(e) => setDbgStdin(e.target.value)} className="mt-1 w-full rounded-xl border border-edge2 bg-sunken px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal-400/60" />
          </Card>
          <Card>
            <p className="text-sm font-semibold text-ink">Diagnosis</p>
            {!dbg ? (
              <div className="mt-2"><EmptyState title="No diagnosis yet" hint="Paste faulty code and press Debug code — real toolchain errors are detected first." /></div>
            ) : (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-body">{dbg.explanation}</p>
                <ul className="space-y-2">
                  {(dbg.errors ?? []).map((e, i) => (
                    <li key={i} className="rounded-lg border border-edge bg-sunken px-3 py-2">
                      <p className="text-sm font-medium text-ink">{e.title} <span className="ml-2 font-mono text-[11px] text-muted">{e.location}</span></p>
                      <p className="mt-0.5 text-[13px] text-body">{e.why}</p>
                    </li>
                  ))}
                </ul>
                {dbg.correctedCode && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Corrected code</p>
                      <Button size="sm" variant="secondary" onClick={() => handOff(dbg.correctedCode, dbgLang, navigate)}>Open in Compiler</Button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-edge">
                      <CodeEditor value={dbg.correctedCode} onChange={() => {}} language={MONACO[dbgLang] ?? 'cpp'} height="260px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
                    </div>
                    {dbg.verification && (
                      <p className="flex flex-wrap gap-2">
                        <Badge tone={dbg.verification.compileSuccess && dbg.verification.exitCode === 0 ? 'green' : 'red'}>
                          Fix verification: {dbg.verification.compileSuccess ? `exit ${dbg.verification.exitCode}` : 'still fails'}
                        </Badge>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'optimize' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              {langSel(optLang, setOptLang)}
              <Button size="sm" onClick={doOptimize} disabled={optLoading || !optCode.trim()}>
                <Gauge size={14} /> {optLoading ? 'Analyzing…' : 'Optimize'}
              </Button>
              <EngineBadge engine={opt?.engine} />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-edge">
              <CodeEditor value={optCode} onChange={setOptCode} language={MONACO[optLang] ?? 'cpp'} height="340px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-ink">Optimization report</p>
            {!opt ? (
              <div className="mt-2"><EmptyState title="Nothing analyzed yet" hint="Paste code and press Optimize to detect inefficient patterns." /></div>
            ) : (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-body">{opt.summary}</p>
                <p className="flex flex-wrap gap-2 text-xs">
                  <Badge tone="amber">Before: {opt.before?.time} / {opt.before?.space}</Badge>
                  <Badge tone="green">After: {opt.after?.time} / {opt.after?.space}</Badge>
                </p>
                {(opt.issues ?? []).map((issue, i) => (
                  <div key={i} className="rounded-lg border border-edge bg-sunken px-3 py-2">
                    <p className="text-sm font-medium text-ink">{issue.title}</p>
                    <p className="mt-0.5 text-[13px] text-body">{issue.detail}</p>
                  </div>
                ))}
                {opt.optimizedCode && (
                  <div className="overflow-hidden rounded-xl border border-edge">
                    <CodeEditor value={opt.optimizedCode} onChange={() => {}} language={MONACO[optLang] ?? 'cpp'} height="260px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
