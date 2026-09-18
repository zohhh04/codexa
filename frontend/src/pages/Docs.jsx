import { Link } from 'react-router-dom';
import { Badge, Card } from '../components/ui';

const rows = [
  ['Phase 1', 'Foundation + UI (this build)', 'Vite + Tailwind + Router, landing, IDE shell, Express skeleton, docs.'],
  ['Phase 2', 'Monaco editor', 'C++ highlighting, themes, samples, editor state, reset.'],
  ['Phase 3', 'Lexical analysis', 'Real lexer, token table with positions, lexer tests.'],
  ['Phase 4', 'Syntax + semantics', 'Grammar, AST + visualization, symbol table, diagnostics.'],
  ['Phase 5', 'Intermediate code', 'TAC with temporaries + precedence, tests.'],
  ['Phase 6', 'Clang integration', 'Sandboxed compile/run, parsed diagnostics, limits.'],
  ['Phase 7', 'AI features', 'Explain / fix / tutor with schema validation + rate limits.'],
  ['Phase 8', 'Verification + visualization', 'Diffs, approve/reject, undo/redo, pipeline views.'],
  ['Phase 9', 'Auth + persistence', 'JWT, MongoDB, projects, history, ownership checks.'],
  ['Phase 10', 'Practice + polish', 'Questions, real dashboard stats, E2E tests, a11y.'],
];

export default function Docs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Badge tone="teal">Living document · updated every phase</Badge>
      <h1 className="mt-3 text-2xl font-bold text-ink">Roadmap &amp; supported subset</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Codexa AI runs <strong className="text-ink">two engines</strong>: a hand-built educational
        pipeline for a <strong className="text-ink">documented C++ subset</strong> (tokens, AST,
        symbol table, TAC visualizations), plus sandboxed <strong className="text-ink">Clang</strong> as
        the authority for <strong className="text-ink">arbitrary C++</strong> — classes, templates,
        pointers, STL included. Error detection, execution, and AI explanations work on any code;
        only the visualizations are subset-limited, and the UI says so wherever that applies.
        The formal grammar itself is defined in Phase 4 (<span className="code-font text-xs">compiler/grammar/cpp-subset.md</span>).
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Planned C++ subset (finalized Phase 4)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Types: <span className="code-font text-xs">int, float, char, bool, void</span></li>
          <li>Declarations, assignments, arithmetic / logical expressions with precedence</li>
          <li><span className="code-font text-xs">if / else</span>, <span className="code-font text-xs">while / for</span>, blocks + nested scopes</li>
          <li>Functions, calls, <span className="code-font text-xs">return</span></li>
          <li>Explicitly out of scope for v1: templates, classes, pointers, STL, exceptions, preprocessor beyond <span className="code-font text-xs">#include</span></li>
        </ul>
      </Card>

      <h2 className="mt-8 font-semibold text-ink">Build order</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-edge">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-ink/5 text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-2">Phase</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Scope</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([p, t, s]) => (
              <tr key={p} className="border-t border-edge text-muted">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-mint">{p}</td>
                <td className="px-4 py-2 text-body">{t}</td>
                <td className="px-4 py-2">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted">
        Backend API contract: <Link to="/compiler" className="text-mint hover:underline">workspace</Link> calls{' '}
        <span className="code-font text-xs">GET /api/health</span> today; compiler, AI, history and practice routes
        arrive with their phases. Full contract lives in <span className="code-font text-xs">docs/api.md</span>.
      </p>
    </div>
  );
}
