import { CheckCircle, ChevronDown, ChevronRight, AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge, EmptyState } from './ui';

const PHASES = [
  {
    id: 'lex',
    name: 'Lexical Analysis',
    desc: 'Characters → tokens',
    phase: 'Phase 3',
  },
  {
    id: 'parse',
    name: 'Syntax Analysis',
    desc: 'Tokens → AST',
    phase: 'Phase 4',
  },
  {
    id: 'semantic',
    name: 'Semantic Analysis',
    desc: 'AST → symbols + diagnostics',
    phase: 'Phase 4',
  },
  {
    id: 'tac',
    name: 'Intermediate Code',
    desc: 'AST → three-address code',
    phase: 'Phase 5',
  },
  {
    id: 'compile',
    name: 'Clang Compile',
    desc: 'Source → binary',
    phase: 'Phase 6',
  },
];

function StepCard({ step, data, expanded, onToggle }) {
  const hasData = !!data;
  const errors = data?.diagnostics?.filter((d) => d.severity === 'error') ?? [];
  const warnings = data?.diagnostics?.filter((d) => d.severity === 'warning') ?? [];
  const hasErrors = errors.length > 0;

  return (
    <div className={`rounded-xl border transition-colors ${
      hasErrors ? 'border-red-500/30 bg-red-500/5' :
      hasData ? 'border-teal-400/20 bg-teal-400/5' :
      'border-edge bg-panel'
    }`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {hasErrors ? (
          <XCircle size={16} className="shrink-0 text-red-400" />
        ) : hasData ? (
          <CheckCircle size={16} className="shrink-0 text-teal-400" />
        ) : (
          <AlertTriangle size={16} className="shrink-0 text-muted" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-body">{step.name}</p>
            <Badge tone="violet">{step.phase}</Badge>
            {hasErrors && <Badge tone="red">{errors.length} error{errors.length !== 1 ? 's' : ''}</Badge>}
            {warnings.length > 0 && <Badge tone="amber">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</Badge>}
          </div>
          <p className="text-xs text-muted">{step.desc}</p>
        </div>
        {expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
      </button>

      {expanded && hasData && (
        <div className="border-t border-edge px-4 py-3 space-y-2">
          {/* Stats */}
          {data.stats && (
            <div className="flex flex-wrap gap-1.5">
              {data.stats.tokens != null && <Badge>{data.stats.tokens} tokens</Badge>}
              {data.stats.nodes != null && <Badge>{data.stats.nodes} AST nodes</Badge>}
              {data.stats.instructions != null && <Badge>{data.stats.instructions} TAC instructions</Badge>}
              {data.stats.elapsedMs != null && <Badge>{data.stats.elapsedMs} ms</Badge>}
            </div>
          )}

          {/* Diagnostics */}
          {data.diagnostics?.length > 0 && (
            <div className="space-y-1">
              {data.diagnostics.slice(0, 10).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <Badge tone={d.severity === 'error' ? 'red' : 'amber'}>{d.severity}</Badge>
                  <span className="code-font text-muted">{d.code}</span>
                  <span className="truncate text-body">{d.message}</span>
                  {d.line > 0 && <span className="code-font ml-auto text-faint">L{d.line}</span>}
                </div>
              ))}
              {data.diagnostics.length > 10 && (
                <p className="text-[11px] text-faint">+{data.diagnostics.length - 10} more</p>
              )}
            </div>
          )}

          {/* Token count (for lex step) */}
          {data.tokens && (
            <p className="text-xs text-muted">{data.tokens.length} tokens produced</p>
          )}

          {/* AST node count */}
          {data.ast?.body && (
            <p className="text-xs text-muted">AST root: {data.ast.kind} ({data.ast.body.length} top-level nodes)</p>
          )}

          {/* TAC instruction count */}
          {data.instructions && (
            <p className="text-xs text-muted">{data.instructions.length} instructions generated</p>
          )}
        </div>
      )}

      {expanded && !hasData && (
        <div className="border-t border-edge px-4 py-3">
          <p className="text-xs text-muted">No data — run analysis first.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Full pipeline visualization showing all stages.
 * Props: { lexResult, analysis, tacResult, runResult }
 */
export default function PipelineViewer({ lexResult, analysis, tacResult, runResult }) {
  const [expanded, setExpanded] = useState(new Set(['lex']));

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasAnyData = lexResult || analysis || tacResult || runResult;

  if (!hasAnyData) {
    return (
      <EmptyState
        title="Pipeline visualization"
        hint="Press Analyze to see the full compiler pipeline with real data at each stage."
      />
    );
  }

  const getData = (id) => {
    switch (id) {
      case 'lex': return lexResult ? { diagnostics: lexResult.diagnostics, stats: lexResult.stats, tokens: lexResult.tokens } : null;
      case 'parse': return analysis ? { diagnostics: analysis.diagnostics.filter((d) => d.phase === 'syntax'), stats: analysis.stats, ast: analysis.ast } : null;
      case 'semantic': return analysis ? { diagnostics: analysis.diagnostics.filter((d) => d.phase === 'semantic'), stats: analysis.stats } : null;
      case 'tac': return tacResult ? { diagnostics: tacResult.diagnostics, stats: tacResult.stats, instructions: tacResult.instructions } : null;
      case 'compile': return runResult ? { diagnostics: runResult.compile?.diagnostics ?? [], stats: { elapsedMs: runResult.compile?.elapsedMs } } : null;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Compiler Pipeline</p>
        <button
          onClick={() => {
            const allIds = PHASES.map((p) => p.id);
            if (expanded.size === allIds.length) setExpanded(new Set());
            else setExpanded(new Set(allIds));
          }}
          className="text-[11px] text-muted hover:text-body"
        >
          {expanded.size === PHASES.length ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {PHASES.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          data={getData(step.id)}
          expanded={expanded.has(step.id)}
          onToggle={() => toggle(step.id)}
        />
      ))}
    </div>
  );
}
