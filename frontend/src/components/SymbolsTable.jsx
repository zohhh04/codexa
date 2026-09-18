import { Badge, EmptyState } from './ui';

/** Renders semantic symbol tables, one card per scope. */
export default function SymbolsTable({ symbols }) {
  if (!symbols || symbols.length === 0) {
    return (
      <EmptyState
        title="No symbol table yet"
        hint="Press Analyze to run semantic analysis. Scopes, declarations and usage appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {symbols.map((scope) => (
        <div key={scope.id} className="overflow-hidden rounded-xl border border-edge">
          <div className="flex items-center gap-2 bg-ink/5 px-3 py-2">
            <span className="code-font text-xs font-semibold text-ink">{scope.name}</span>
            <Badge>{scope.kind}</Badge>
            <span className="ml-auto text-xs text-muted">{scope.symbols.length} symbol(s)</span>
          </div>
          {scope.symbols.length === 0 ? (
            <p className="px-3 py-2 text-xs text-faint">No declarations in this scope.</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-3 py-1.5">Name</th>
                  <th className="px-3 py-1.5">Kind</th>
                  <th className="px-3 py-1.5">Type</th>
                  <th className="whitespace-nowrap px-3 py-1.5">Declared</th>
                  <th className="px-3 py-1.5">Used</th>
                </tr>
              </thead>
              <tbody>
                {scope.symbols.map((s, i) => (
                  <tr key={i} className="border-t border-edge text-body">
                    <td className="code-font px-3 py-1.5 text-ink">{s.name}</td>
                    <td className="px-3 py-1.5">{s.kind}</td>
                    <td className="code-font px-3 py-1.5" title={s.signature ?? s.type}>
                      {s.signature ?? s.type}
                    </td>
                    <td className="code-font whitespace-nowrap px-3 py-1.5 text-muted">
                      L{s.line}:{s.column}
                    </td>
                    <td className="px-3 py-1.5">
                      {s.kind === 'function' || s.used
                        ? <Badge tone="teal">yes</Badge>
                        : <Badge tone="amber">no</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
