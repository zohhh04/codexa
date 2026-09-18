import { Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState } from './ui';

const TYPE_TONES = {
  KEYWORD: 'violet',
  IDENTIFIER: 'teal',
  INT_LITERAL: 'green',
  FLOAT_LITERAL: 'green',
  CHAR_LITERAL: 'green',
  STRING_LITERAL: 'green',
  BOOLEAN_LITERAL: 'green',
  NULLPTR_LITERAL: 'green',
  OPERATOR: 'neutral',
  DELIMITER: 'neutral',
  PREPROCESSOR: 'amber',
  COMMENT: 'neutral',
  INVALID: 'red',
};

function loc(t) {
  return `L${t.line}:${t.column} → L${t.endLine}:${t.endColumn}`;
}

/**
 * Searchable, filterable table of real lexer output.
 * Pure presentational: fetching lives in the Compiler page.
 */
export default function TokenTable({ result, loading, error, stale, onRun }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const tokens = result?.tokens ?? [];
  const stats = result?.stats;

  const typeOptions = useMemo(() => {
    const seen = new Map();
    for (const t of tokens) seen.set(t.type, (seen.get(t.type) || 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [tokens]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokens.filter(
      (t) =>
        (typeFilter === 'ALL' || t.type === typeFilter) &&
        (q === '' || t.value.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)),
    );
  }, [tokens, query, typeFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onRun} disabled={loading}>
          <Play size={15} /> {loading ? 'Lexing…' : result ? 'Re-run lexer' : 'Run lexer'}
        </Button>
        {stale && !loading && <Badge tone="amber">Stale — code changed</Badge>}
        {tokens.length > 0 && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search value or type…"
              aria-label="Search tokens"
              className="min-w-40 flex-1 rounded-lg border border-edge2 bg-sunken px-3 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60 sm:max-w-64 sm:flex-none"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by token type"
              className="rounded-lg border border-edge2 bg-sunken px-3 py-1.5 text-sm text-body"
            >
              <option value="ALL">All types ({tokens.length})</option>
              {typeOptions.map(([type, n]) => (
                <option key={type} value={type}>{type} ({n})</option>
              ))}
            </select>
          </>
        )}
        {stats && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            <Badge tone="teal">{stats.total} tokens</Badge>
            {stats.errors > 0 && <Badge tone="red">{stats.errors} errors</Badge>}
            {stats.warnings > 0 && <Badge tone="amber">{stats.warnings} warnings</Badge>}
            <Badge>{stats.elapsedMs} ms</Badge>
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 light:text-red-700" role="alert">
          Lexer request failed: {error}
        </p>
      )}

      {!result && !loading && !error && (
        <EmptyState
          title="Lexer ready — no tokens yet"
          hint="Press Run lexer to tokenize the current editor code with the real Phase-3 scanner (positions included)."
        />
      )}

      {result && filtered.length === 0 && (
        <EmptyState
          title={tokens.length === 0 ? 'No tokens produced' : 'No tokens match'}
          hint={tokens.length === 0 ? 'The source contained only whitespace.' : 'Clear the search or choose a different type filter.'}
        />
      )}

      {filtered.length > 0 && (
        <div className="overflow-auto rounded-xl border border-edge" style={{ maxHeight: 320 }}>
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Value</th>
                <th className="whitespace-nowrap px-3 py-2">Range</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i} className="border-t border-edge text-body hover:bg-ink/5">
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <Badge tone={TYPE_TONES[t.type] ?? 'neutral'}>{t.type}</Badge>
                  </td>
                  <td className="code-font max-w-72 truncate px-3 py-1.5 text-ink" title={t.value}>
                    {t.value === '' ? '∅' : t.value}
                  </td>
                  <td className="code-font whitespace-nowrap px-3 py-1.5 text-muted">{loc(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
