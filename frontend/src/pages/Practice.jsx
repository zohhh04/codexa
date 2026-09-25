import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { generatePracticeQuestion, getPracticeAttempts, getPracticeConcepts, submitPracticeAnswer } from '../services/api';
import { Button, Card, EmptyState } from '../components/ui';

export default function Practice() {
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [concept, setConcept] = useState('random');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAttempts = async () => {
    const res = await getPracticeAttempts();
    if (res.success) setAttempts(res.data || []);
  };

  const loadQuestion = async (concept) => {
    setLoading(true);
    try {
      const res = await generatePracticeQuestion(concept);
      if (res.success) {
        setQuestion(res.data);
        setAnswer('');
        setResult(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
    loadQuestion();
    getPracticeConcepts()
      .then((res) => {
        if (res.success) setConcepts(res.data || []);
      })
      .catch(() => setConcepts([]));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!question || !answer.trim()) return;

    setSubmitting(true);
    try {
      const res = await submitPracticeAnswer({ question, submittedAnswer: answer });
      if (res.success) {
        setResult(res.data.result);
        await loadAttempts();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-mint">Phase 10</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Practice questions</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="practice-concept">Concept</label>
            <select
              id="practice-concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
            >
              <option value="random">Random</option>
              {concepts.map((c) => (
                <option key={c.concept} value={c.concept}>
                  {c.concept} · {c.difficulty}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => loadQuestion(concept === 'random' ? undefined : concept)}
            disabled={loading}
          >
            New question
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          {loading || !question ? (
            <div className="flex min-h-[280px] items-center justify-center text-muted">
              Loading a practice prompt…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-300 light:text-violet-700">
                  {question.concept}
                </span>
                <span className="rounded-full border border-ink/10 bg-ink/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                  {question.difficulty}
                </span>
              </div>

              <div className="rounded-xl border border-edge2 bg-sunken p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                  <BookOpen size={16} className="text-teal-400" />
                  Prompt
                </div>
                <p className="text-base leading-7 text-body">{question.prompt}</p>
              </div>

              <label className="block text-sm font-medium text-ink">
                Your answer
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={8}
                  className="mt-2 w-full rounded-xl border border-edge2 bg-sunken px-3 py-3 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
                  placeholder="Explain the concept in your own words..."
                />
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting || !answer.trim()}>
                  {submitting ? 'Checking answer…' : 'Submit answer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => loadQuestion(question.concept)}>
                  Skip
                </Button>
              </div>

              {result && (
                <div className={`rounded-xl border p-4 ${result.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    {result.correct ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Sparkles size={16} className="text-amber-400" />}
                    {result.correct ? 'Correct' : 'Needs improvement'}
                  </div>
                  <p className="text-sm text-body">{result.feedback}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">Score: {result.score}/100</p>
                </div>
              )}
            </form>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Recent attempts</h2>
          <div className="mt-4 space-y-3">
            {attempts.length === 0 ? (
              <EmptyState title="No attempts yet" hint="Answer a question to start building your practice streak." />
            ) : (
              attempts.map((attempt) => (
                <div key={attempt._id} className="rounded-xl border border-edge2 bg-ink/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{attempt.concept}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${attempt.result.correct ? 'bg-emerald-500/10 text-emerald-300 light:text-emerald-700' : 'bg-amber-500/10 text-amber-300 light:text-amber-700'}`}>
                      {attempt.result.correct ? 'pass' : 'retry'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Score: {attempt.result.score}/100</p>
                  <p className="mt-2 text-xs text-body line-clamp-3">{attempt.questionPrompt}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
