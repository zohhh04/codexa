import { AlertTriangle, CheckCircle, Play, Terminal, Timer, XCircle } from 'lucide-react';
import { Badge, Button, EmptyState } from './ui';

function formatTime(ms) {
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Displays sandboxed compile + run output from the Clang engine.
 * Pure presentational: fetching lives in the Compiler page.
 */
export default function OutputViewer({ result, loading, error, stale, onRun }) {
  const compile = result?.compile;
  const run = result?.run;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onRun} disabled={loading}>
          <Play size={15} /> {loading ? 'Compiling…' : result ? 'Re-run' : 'Run'}
        </Button>
        {stale && !loading && <Badge tone="amber">Stale — code changed</Badge>}
        {result && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {compile && (
              <Badge tone={compile.success ? 'green' : 'red'}>
                {compile.success ? 'Compiled' : 'Compile failed'}
              </Badge>
            )}
            {compile && compile.diagnostics.length > 0 && (
              <Badge tone="amber">{compile.diagnostics.length} diagnostic{compile.diagnostics.length !== 1 ? 's' : ''}</Badge>
            )}
            {compile && <Badge>{formatTime(compile.elapsedMs)}</Badge>}
            {run && run.exitCode === 0 && !run.timedOut && (
              <Badge tone="green">
                <CheckCircle size={12} className="mr-1" /> Exit 0
              </Badge>
            )}
            {run && (run.exitCode !== 0 || run.timedOut) && (
              <Badge tone="red">
                <XCircle size={12} className="mr-1" />
                {run.timedOut ? 'Timed out' : `Exit ${run.exitCode}`}
              </Badge>
            )}
            {run && run.elapsedMs > 0 && (
              <Badge>
                <Timer size={12} className="mr-1" /> {formatTime(run.elapsedMs)}
              </Badge>
            )}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 light:text-red-700" role="alert">
          Run request failed: {error}
        </p>
      )}

      {!result && !loading && !error && (
        <EmptyState
          title="Ready to compile and run"
          hint="Press Run to compile and execute your actual code in a sandbox (C/C++ via Clang, Java via JDK, Python 3, Node.js) with your stdin."
        />
      )}

      {/* Compile diagnostics */}
      {compile && compile.diagnostics.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Compile diagnostics</p>
          <ul className="space-y-1">
            {compile.diagnostics.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-[13px]">
                <Badge tone={d.severity === 'error' ? 'red' : d.severity === 'warning' ? 'amber' : 'neutral'}>
                  {d.severity}
                </Badge>
                <span className="code-font text-xs text-muted">{d.code}</span>
                <span className="basis-full text-body sm:basis-auto">{d.message}</span>
                {d.line > 0 && (
                  <span className="code-font ml-auto text-xs text-muted">
                    L{d.line}:{d.column}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stdout */}
      {run && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            <Terminal size={12} className="mr-1 inline" />
            stdout
          </p>
          <pre className="overflow-auto rounded-xl border border-edge bg-code p-4 font-mono text-xs leading-relaxed text-body" style={{ maxHeight: 200 }}>
            {run.stdout || <span className="text-faint">(empty)</span>}
          </pre>
        </div>
      )}

      {/* Stderr */}
      {run && run.stderr && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            <AlertTriangle size={12} className="mr-1 inline" />
            stderr
          </p>
          <pre className="overflow-auto rounded-xl border border-red-500/20 bg-red-500/5 p-4 font-mono text-xs leading-relaxed text-red-300 light:text-red-700" style={{ maxHeight: 200 }}>
            {run.stderr}
          </pre>
        </div>
      )}

      {/* Success state */}
      {compile && compile.success && run && run.exitCode === 0 && !run.stdout && !run.stderr && (
        <p className="text-sm text-muted">Program executed successfully with no output.</p>
      )}
    </div>
  );
}
