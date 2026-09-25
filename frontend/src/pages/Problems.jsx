import { FlaskConical, Lightbulb, Play, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { aiHint, aiTestcases, getProblem, getProblems, judgeCode, runCode, submitProblem } from '../services/api';
import { loadEditorPrefs } from '../utils/editorPrefs';

const LANGS = [
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];
const MONACO = { cpp: 'cpp', c: 'c', java: 'java', python: 'python', javascript: 'javascript' };
const CATS = ['All', 'Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'DP', 'Sorting & Searching'];
const DIFFS = ['All', 'easy', 'medium', 'hard'];

const VERDICT_TONE = {
  Accepted: 'green',
  'Wrong Answer': 'red',
  'Time Limit Exceeded': 'amber',
  'Runtime Error': 'red',
  'Compilation Error': 'red',
};

function Verdict({ value }) {
  const icon = value === 'Accepted' ? '✅' : value === 'Wrong Answer' ? '❌' : value === 'Time Limit Exceeded' ? '⏱' : value === 'Runtime Error' ? '💥' : '🛠';
  return <Badge tone={VERDICT_TONE[value] ?? 'neutral'}>{icon} {value}</Badge>;
}

export default function Problems() {
  const [prefs] = useState(loadEditorPrefs);
  const [filters, setFilters] = useState({ category: 'All', difficulty: 'All', search: '' });
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [judging, setJudging] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState(null);
  const [hintStage, setHintStage] = useState(0);
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [genCases, setGenCases] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const body = await getProblems({
        ...(filters.category !== 'All' ? { category: filters.category } : {}),
        ...(filters.difficulty !== 'All' ? { difficulty: filters.difficulty } : {}),
        ...(filters.search ? { search: filters.search } : {}),
      });
      if (body.success) {
        setList(body.data);
        if (!selectedId && body.data.length > 0) selectProblem(body.data[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.difficulty]);

  const searchNow = async () => {
    const body = await getProblems({
      ...(filters.category !== 'All' ? { category: filters.category } : {}),
      ...(filters.difficulty !== 'All' ? { difficulty: filters.difficulty } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
    if (body.success) setList(body.data);
  };

  const selectProblem = async (id) => {
    setSelectedId(id);
    setVerdict(null);
    setRunOut(null);
    setHintStage(0);
    setHint(null);
    setGenCases(null);
    const body = await getProblem(id);
    if (body.success) {
      setProblem(body.data);
      setCode(body.data.templates?.[language] ?? body.data.templates?.cpp ?? '');
    }
  };

  const switchLanguage = (lang) => {
    setLanguage(lang);
    if (problem?.templates?.[lang]) setCode(problem.templates[lang]);
  };

  const doRunSample = async () => {
    if (!problem) return;
    setRunning(true);
    try {
      const sample = problem.samples?.[0];
      const body = await runCode(code, language, sample?.stdin ?? '');
      setRunOut({ result: body.data, expected: sample?.expected ?? '' });
    } finally {
      setRunning(false);
    }
  };

  const doSubmit = async () => {
    if (!problem) return;
    setJudging(true);
    try {
      const body = await submitProblem(problem.id, { sourceCode: code, language });
      if (body.success) setVerdict(body.data.verdict);
    } finally {
      setJudging(false);
    }
  };

  const doCustomJudge = async () => {
    if (!problem || !genCases?.cases?.length) return;
    setJudging(true);
    try {
      const body = await judgeCode({ sourceCode: code, language, testcases: genCases.cases });
      if (body.success) setVerdict(body.data);
    } finally {
      setJudging(false);
    }
  };

  const doGenCases = async () => {
    if (!problem) return;
    setGenLoading(true);
    try {
      const body = await aiTestcases({ prompt: `${problem.title}: ${problem.description}`, count: 6 });
      if (body.success) setGenCases(body.data);
    } finally {
      setGenLoading(false);
    }
  };

  const doHint = async () => {
    if (!problem || hintStage >= 4) return;
    setHintLoading(true);
    try {
      const body = await aiHint({ problem: `${problem.title}: ${problem.description}`, stage: hintStage + 1 });
      if (body.success) {
        setHint(body.data);
        setHintStage(body.data.stage);
      }
    } finally {
      setHintLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-4">
      <h1 className="text-2xl font-bold text-ink">DSA Problem Solver</h1>
      <p className="mt-1 text-sm text-muted">
        Arrays · Strings · Linked Lists · Stacks & Queues · Trees · Graphs · DP · Sorting & Searching — Easy / Medium / Hard, with a real judge.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted" htmlFor="pb-cat">Category</label>
              <select id="pb-cat" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="mt-1 w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body">
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted" htmlFor="pb-diff">Difficulty</label>
              <select id="pb-diff" value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className="mt-1 w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body">
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted" htmlFor="pb-search">Search</label>
              <div className="mt-1 flex gap-2">
                <input id="pb-search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && searchNow()} placeholder="two sum…" className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60" />
                <Button size="sm" variant="secondary" onClick={searchNow}>Go</Button>
              </div>
            </div>
          </div>
          <div className="mt-4 max-h-[52vh] space-y-1.5 overflow-auto">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProblem(p.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${selectedId === p.id ? 'border-teal-400/50 bg-teal-400/10' : 'border-edge hover:border-teal-400/40'}`}
              >
                <p className="text-sm font-medium text-ink">{p.title}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="violet">{p.category}</Badge>
                  <Badge tone={p.difficulty === 'easy' ? 'green' : p.difficulty === 'medium' ? 'amber' : 'red'}>{p.difficulty}</Badge>
                </p>
              </button>
            ))}
            {list.length === 0 && <EmptyState title="No problems" hint="Try a different filter or search." />}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {!problem ? (
            <Card><EmptyState title="Select a problem" hint="Pick one from the list to start solving." /></Card>
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-ink">{problem.title}</h2>
                  <Badge tone="violet">{problem.category}</Badge>
                  <Badge tone={problem.difficulty === 'easy' ? 'green' : problem.difficulty === 'medium' ? 'amber' : 'red'}>{problem.difficulty}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">{problem.description}</p>
                <p className="mt-1 font-mono text-xs text-muted">Input: {problem.inputFormat}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(problem.samples ?? []).map((s, i) => (
                    <div key={i} className="rounded-xl border border-edge bg-sunken p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted">Sample {i + 1}</p>
                      <p className="mt-1 font-mono text-xs text-body">in: {JSON.stringify(s.stdin)}</p>
                      <p className="font-mono text-xs text-body">out: {JSON.stringify(s.expected)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-edge bg-sunken p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Lightbulb size={15} className="text-amber-300" />
                    <p className="text-sm font-semibold text-ink">Stuck? Take a hint, not the answer ({hintStage}/4)</p>
                    <Button size="sm" variant="secondary" onClick={doHint} disabled={hintLoading || hintStage >= 4}>
                      {hintLoading ? 'Thinking…' : hintStage === 0 ? 'Hint 1 · concept' : hintStage === 1 ? 'Hint 2 · approach' : hintStage === 2 ? 'Hint 3 · pseudocode' : 'Hint 4 · solution'}
                    </Button>
                  </div>
                  {hint && <p className="mt-2 whitespace-pre-wrap text-sm text-body">{hint.hint}</p>}
                  {(problem.hints ?? []).length > 0 && !hint && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">
                      {problem.hints.slice(0, 1).map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={language} onChange={(e) => switchLanguage(e.target.value)} className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body" aria-label="Language">
                    {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" onClick={doRunSample} disabled={running}>
                    <Play size={14} /> {running ? 'Running…' : 'Run sample'}
                  </Button>
                  <Button size="sm" onClick={doSubmit} disabled={judging}>
                    <Send size={14} /> {judging ? 'Judging…' : 'Submit'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={doGenCases} disabled={genLoading}>
                    <FlaskConical size={14} /> {genLoading ? 'Generating…' : 'Generate test cases'}
                  </Button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-edge">
                  <CodeEditor value={code} onChange={setCode} language={MONACO[language] ?? 'cpp'} height="360px" fontSize={prefs.fontSize} tabSize={prefs.tabSize} wordWrap={prefs.wordWrap} />
                </div>
                {runOut && (
                  <div className="mt-3 rounded-xl border border-edge bg-sunken p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sample run</p>
                    <p className="mt-1 font-mono text-xs text-body">stdout: {JSON.stringify(runOut.result.run.stdout)}</p>
                    {runOut.result.run.stderr && <p className="font-mono text-xs text-red-300">stderr: {runOut.result.run.stderr.slice(0, 300)}</p>}
                    <p className="mt-1 font-mono text-xs text-muted">expected: {JSON.stringify(runOut.expected)}</p>
                  </div>
                )}
              </Card>

              {genCases && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">Generated test cases ({genCases.cases.length})</p>
                    <Badge tone={genCases.engine === 'ai' ? 'teal' : 'amber'}>{genCases.engine}</Badge>
                    <Button size="sm" variant="secondary" onClick={doCustomJudge} disabled={judging}>
                      Run my code on these
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {genCases.cases.map((c, i) => (
                      <div key={i} className="rounded-xl border border-edge bg-sunken p-3">
                        <p className="text-xs font-semibold text-ink">{c.name} <span className="ml-1 font-normal text-muted">({c.kind})</span></p>
                        <p className="mt-1 font-mono text-[11px] text-body">in: {JSON.stringify((c.stdin ?? '').slice(0, 120))}</p>
                        {c.expected && <p className="font-mono text-[11px] text-body">out: {JSON.stringify(c.expected.slice(0, 120))}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {verdict && (
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">Judge result</p>
                    <Verdict value={verdict.overall} />
                    <Badge>{verdict.passed}/{verdict.total} passed</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {verdict.results.map((r, i) => (
                      <div key={i} className="rounded-xl border border-edge bg-sunken p-3">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-ink">{r.name}</span>
                          <Badge tone="neutral">{r.kind}</Badge>
                          <Verdict value={r.verdict} />
                          <span className="ml-auto font-mono text-[11px] text-muted">{r.timeMs} ms</span>
                        </p>
                        {r.verdict === 'Wrong Answer' && (
                          <>
                            <p className="mt-1 font-mono text-[11px] text-body">expected: {JSON.stringify((r.expected ?? '').slice(0, 200))}</p>
                            <p className="font-mono text-[11px] text-body">actual: {JSON.stringify((r.actual ?? '').slice(0, 200))}</p>
                          </>
                        )}
                        {(r.verdict === 'Runtime Error' || r.verdict === 'Compilation Error') && r.stderr && (
                          <p className="mt-1 font-mono text-[11px] text-red-300">{r.stderr.slice(0, 400)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
