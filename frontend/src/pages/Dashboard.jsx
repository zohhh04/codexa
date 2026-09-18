import { Activity, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Card, EmptyState, Stat } from '../components/ui';

export default function Dashboard() {
  // Phase 1: intentionally NO mock numbers. Real stats connect in Phase 10.
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        Statistics will be backed by MongoDB in Phase 9–10. Nothing here is mocked — connect data to light it up.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total analyses" value="—" sub="Phase 9 · Analysis collection" icon={<Activity size={16} className="text-teal-400 light:text-teal-600" />} />
        <Stat label="Successful compilations" value="—" sub="Phase 6 · Clang results" icon={<CheckCircle2 size={16} className="text-emerald-400 light:text-emerald-600" />} />
        <Stat label="Error categories" value="—" sub="Phase 4+ · Diagnostics" icon={<AlertCircle size={16} className="text-amber-400 light:text-amber-600" />} />
        <Stat label="Practice progress" value="—" sub="Phase 10 · Attempts" icon={<Database size={16} className="text-violet-400 light:text-violet-600" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-ink">Recent coding activity</h2>
          <div className="mt-3">
            <EmptyState title="No activity yet" hint="History read/write APIs (/api/history) arrive in Phase 9." />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-ink">Saved projects</h2>
          <div className="mt-3">
            <EmptyState title="No saved projects" hint="Create, rename, reopen and delete projects in Phase 9." />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-ink">Frequently encountered mistakes</h2>
          <div className="mt-3">
            <EmptyState title="No data yet" hint="Aggregated from your real diagnostics once analysis lands." />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-ink">Practice progress</h2>
          <div className="mt-3">
            <EmptyState title="No attempts yet" hint="Question generation + submission arrive in Phase 10." />
          </div>
        </Card>
      </div>
    </div>
  );
}
