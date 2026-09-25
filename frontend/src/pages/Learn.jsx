import { GraduationCap, Send } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { aiLearn } from '../services/api';

const STARTERS = [
  'Explain recursion like I am a beginner',
  'What is Big-O and why does it matter?',
  'How does a hash map give O(1) lookup?',
  'Explain BFS vs DFS with an example',
];

export default function Learn() {
  const [question, setQuestion] = useState('Explain recursion like I am a beginner');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = async (q) => {
    const query = (q ?? question).trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    try {
      const body = await aiLearn({ question: query });
      if (body.success) setAnswer(body.data);
      else setError('Could not get an answer.');
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <GraduationCap size={24} className="text-mint" /> AI Learning Assistant
      </h1>
      <p className="mt-1 text-sm text-muted">
        Ask any concept — you get a simple explanation, a code example, and a practice question to try.
      </p>

      <Card className="mt-4">
        <label className="text-xs font-medium text-muted" htmlFor="learn-q">Your question</label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="learn-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Explain recursion like I'm a beginner…"
            className="w-full flex-1 rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
          />
          <Button size="sm" onClick={() => ask()} disabled={loading || !question.trim()}>
            <Send size={14} /> {loading ? 'Thinking…' : 'Ask'}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button key={s} onClick={() => { setQuestion(s); ask(s); }} className="rounded-full border border-edge2 bg-ink/5 px-3 py-1 text-xs text-muted transition-colors hover:border-teal-400/50 hover:text-ink">
              {s}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 light:text-red-700">{error}</p>}
      </Card>

      {!answer ? (
        <div className="mt-4"><EmptyState title="No answer yet" hint="Ask a question above — try one of the starters." /></div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink">Explanation</p>
              <Badge tone={answer.engine === 'ai' ? 'teal' : 'amber'}>{answer.engine === 'ai' ? 'AI model' : 'Offline guide'}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-body">{answer.explanation}</p>
          </Card>
          {answer.example && (
            <Card>
              <p className="text-sm font-semibold text-ink">Example</p>
              <pre className="mt-2 overflow-auto rounded-xl border border-edge bg-code p-4 font-mono text-xs leading-relaxed text-body">{answer.example}</pre>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {answer.practice && (
              <Card>
                <p className="text-sm font-semibold text-ink">Try it yourself</p>
                <p className="mt-2 text-sm text-body">{answer.practice}</p>
              </Card>
            )}
            {answer.followUp && (
              <Card>
                <p className="text-sm font-semibold text-ink">Keep going</p>
                <p className="mt-2 text-sm text-body">{answer.followUp}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
