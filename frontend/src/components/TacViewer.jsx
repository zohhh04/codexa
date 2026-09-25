import { Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState } from './ui';

const OP_TONES = {
  label: 'violet',
  goto: 'amber',
  if_goto: 'amber',
  assign: 'teal',
  binop: 'green',
  unary: 'green',
  param: 'neutral',
  call: 'neutral',
  return: 'red',
  nop: 'neutral',
};

function formatInstr(i) {
  if (i.op === 'label') return `${i.label}:`;
  if (i.op === 'goto') return `goto ${i.label}`;
  if (i.op === 'if_goto') return `if_false ${i.arg1} goto ${i.label}`;
  if (i.op === 'assign') return `${i.result} = ${i.arg1}`;
  if (i.op === 'binop') return `${i.result} = ${i.arg1}`;
  if (i.op === 'unary') return `${i.result} = ${i.arg1}`;
  if (i.op === 'param') return `param ${i.arg1}`;
  if (i.op === 'call') return i.result ? `${i.result} = call ${i.arg1}` : `call ${i.arg1}`;
  if (i.op === 'return') return i.arg1 ? `return ${i.arg1}` : 'return';
  if (i.op === 'nop') return 'nop';
  return `${i.op} ${i.arg1 ?? ''} ${i.arg2 ?? ''} ${i.result ?? ''}`;
}

function loc(i) {
  if (!i.loc) return '';
  return `L${i.loc.line}:${i.loc.column}`;
}

/**
 * Searchable table of real TAC output.
 * Pure presentational: fetching lives in the Compiler page.
 */
export default function TacViewer({ result, loading, error, stale, onRun }) {
  const [query, setQuery] = useState('');

  const instructions = result?.instructions ?? [];
  const stats = result?.stats;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return instructions;
    return instructions.filter(
      (i) =>
        i.op.toLowerCase().includes(q) ||
        (i.label && i.label.toLowerCase().includes(q)) ||
        (i.arg1 && i.arg1.toLowerCase().includes(q)) ||
        (i.arg2 && i.arg2.toLowerCase().includes(q)) ||
        (i.result && i.result.toLowerCase().includes(q)),
    );
  }, [instructions, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onRun} disabled={loading}>
          <Play size={15} /> {loading ? 'Generating…' : result ? 'Re-generate TAC' : 'Generate TAC'}
        </Button>
        {stale && !loading && <Badge tone="amber">Stale — code changed</Badge>}
        {instructions.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search instructions…"
            aria-label="Search TAC instructions"
            className="min-w-40 flex-1 rounded-lg border border-edge2 bg-sunken px-3 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60 sm:max-w-64 sm:flex-none"
          />
        )}
        {stats && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            <Badge tone="teal">{stats.instructions} instructions</Badge>
            {stats.errors > 0 && <Badge tone="red">{stats.errors} errors</Badge>}
            {stats.warnings > 0 && <Badge tone="amber">{stats.warnings} warnings</Badge>}
            {stats.tacSkipped && <Badge tone="amber">TAC skipped — fix errors first</Badge>}
            <Badge>{stats.elapsedMs} ms</Badge>
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 light:text-red-700" role="alert">
          TAC request failed: {error}
        </p>
      )}

      {!result && !loading && !error && (
        <EmptyState
          title="TAC ready — no instructions yet"
          hint="Press Generate TAC to lower the current editor code to three-address code with temporaries."
        />
      )}

      {result && filtered.length === 0 && (
        <EmptyState
          title={instructions.length === 0 ? 'No instructions produced' : 'No instructions match'}
          hint={instructions.length === 0 ? 'The source was empty or had errors.' : 'Clear the search to see all instructions.'}
        />
      )}

      {filtered.length > 0 && (
        <div className="overflow-auto rounded-xl border border-edge" style={{ maxHeight: 320 }}>
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Op</th>
                <th className="px-3 py-2">Instruction</th>
                <th className="whitespace-nowrap px-3 py-2">Loc</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx) => (
                <tr key={idx} className="border-t border-edge text-body hover:bg-ink/5">
                  <td className="code-font whitespace-nowrap px-3 py-1.5 text-muted">{idx + 1}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <Badge tone={OP_TONES[i.op] ?? 'neutral'}>{i.op}</Badge>
                  </td>
                  <td className="code-font max-w-96 truncate px-3 py-1.5 text-ink" title={formatInstr(i)}>
                    {formatInstr(i)}
                  </td>
                  <td className="code-font whitespace-nowrap px-3 py-1.5 text-muted">{loc(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
