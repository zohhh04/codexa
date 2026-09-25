import { Activity, CheckCircle2, Flame, Languages, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Stat } from '../components/ui';
import { getDashboardStats } from '../services/api';

const VERDICT_TONE = {
  Accepted: 'green',
  'Wrong Answer': 'red',
  'Time Limit Exceeded': 'amber',
  'Runtime Error': 'red',
  'Compilation Error': 'red',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted">Loading your dashboard…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <EmptyState title="Dashboard unavailable" hint="Start MongoDB and sign in again — stats need the database." />
      </div>
    );
  }

  const langs = Object.entries(stats.languagesUsed ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Problems solved, languages, success rate, streak and recent work.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/problems"><Button size="sm">Solve problems</Button></Link>
          <Link to="/ai"><Button size="sm" variant="secondary">AI Studio</Button></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Problems solved" value={stats.solvedProblems} sub={`${stats.totalSubmissions} submissions`} icon={<Target size={16} className="text-teal-400 light:text-teal-600" />} />
        <Stat label="Success rate" value={`${stats.successRate}%`} sub={`${stats.acceptedSubmissions} accepted`} icon={<CheckCircle2 size={16} className="text-emerald-400 light:text-emerald-600" />} />
        <Stat label="Coding streak" value={`${stats.streakDays}d`} sub="consecutive days" icon={<Flame size={16} className="text-amber-400 light:text-amber-600" />} />
        <Stat label="Analyses run" value={stats.totalAnalyses} sub="compiler pipeline" icon={<Activity size={16} className="text-violet-400 light:text-violet-600" />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Languages size={16} className="text-mint" /> Languages used</h2>
          <div className="mt-3 space-y-2">
            {langs.length === 0 && <p className="text-sm text-muted">No submissions yet — solve a problem to see this.</p>}
            {langs.map(([lang, n]) => (
              <div key={lang} className="flex items-center gap-2 text-sm">
                <Badge tone="teal">{lang}</Badge>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500" style={{ width: `${Math.round((n / stats.totalSubmissions) * 100)}%` }} />
                </div>
                <span className="font-mono text-xs text-muted">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-ink"><TrendingUp size={16} className="text-mint" /> Difficulty progress</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(stats.difficultyProgress ?? {}).map(([diff, v]) => (
              <div key={diff} className="flex items-center gap-2 text-sm">
                <span className="w-16 capitalize text-muted">{diff}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500" style={{ width: v.total ? `${Math.round((v.solved / v.total) * 100)}%` : '0%' }} />
                </div>
                <span className="font-mono text-xs text-muted">{v.solved}/{v.total}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-ink">Recent projects</h2>
          <div className="mt-3 space-y-2">
            {(stats.recentProjects ?? []).length === 0 && <p className="text-sm text-muted">No saved projects yet.</p>}
            {(stats.recentProjects ?? []).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm">
                <span className="truncate text-ink">{p.title}</span>
                <Badge>{p.language}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Activity size={16} className="text-mint" /> Recent coding activity</h2>
          <div className="mt-3 space-y-2">
            {(stats.recentHistory ?? []).length === 0 && (
              <p className="text-sm text-muted">No analyses yet — press Analyze or Run in the Compiler and it will show up here.</p>
            )}
            {(stats.recentHistory ?? []).map((h) => (
              <div key={h._id} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted">{new Date(h.createdAt).toLocaleString()}</span>
                <Badge tone="teal">{h.language}</Badge>
                <Badge tone="neutral">{h.kind}</Badge>
                {h.errors > 0 ? (
                  <Badge tone="red">{h.errors} error{h.errors !== 1 ? 's' : ''}</Badge>
                ) : (
                  <Badge tone="green">clean</Badge>
                )}
                {h.warnings > 0 && <Badge tone="amber">{h.warnings} warning{h.warnings !== 1 ? 's' : ''}</Badge>}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-ink">Concept practice</h2>
          <div className="mt-3 space-y-2">
            {(stats.practiceAttempts ?? []).length === 0 && (
              <p className="text-sm text-muted">No concept answers yet — try the Practice tab.</p>
            )}
            {(stats.practiceAttempts ?? []).map((a) => (
              <div key={a._id} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm">
                <span className="font-medium text-ink">{a.concept}</span>
                <Badge tone="neutral">{a.difficulty}</Badge>
                <Badge tone={a.result?.correct ? 'green' : 'amber'}>{a.result?.correct ? 'pass' : 'retry'}</Badge>
                <span className="ml-auto font-mono text-xs text-muted">{a.result?.score ?? 0}/100</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold text-ink">Recent submissions</h2>
        <div className="mt-3 space-y-2">
          {(stats.recentSubmissions ?? []).length === 0 && (
            <EmptyState title="No submissions yet" hint="Open Problems, pick a challenge and press Submit." />
          )}
          {(stats.recentSubmissions ?? []).map((s) => (
            <div key={s._id} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted">{new Date(s.createdAt).toLocaleString()}</span>
              <span className="font-medium text-ink">{s.problemId}</span>
              <Badge tone="neutral">{s.language}</Badge>
              <Badge tone={VERDICT_TONE[s.verdict] ?? 'neutral'}>{s.verdict}</Badge>
              <span className="ml-auto font-mono text-xs text-muted">{s.passed}/{s.total} · {s.timeMs} ms</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
