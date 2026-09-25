import { Link } from 'react-router-dom';
import { Badge, Card } from '../components/ui';

const rows = [
  ['Phase 1', 'Foundation + UI (this build)', 'Vite + Tailwind + Router, landing, IDE shell, Express skeleton, docs.', true],
  ['Phase 2', 'Monaco editor', 'C++ highlighting, themes, samples, editor state, reset.', true],
  ['Phase 3', 'Lexical analysis', 'Real lexer, token table with positions, lexer tests.', true],
  ['Phase 4', 'Syntax + semantics', 'Grammar, AST + visualization, symbol table, diagnostics.', true],
  ['Phase 5', 'Intermediate code', 'TAC with temporaries + precedence, tests.', true],
  ['Phase 6', 'Clang integration', 'Sandboxed compile/run, parsed diagnostics, limits.', true],
  ['Phase 7', 'AI features', 'Explain / fix / tutor with schema validation + rate limits.', true],
  ['Phase 8', 'Verification + visualization', 'Diffs, approve/reject, undo/redo, pipeline views.', true],
  ['Phase 9', 'Auth + persistence', 'JWT, MongoDB, projects, auto-recorded history, ownership checks.', true],
  ['Phase 10', 'Practice + polish', '15 concept questions, picker, attempts feed the dashboard.', true],
  ['AI Studio', 'Generate / explain / debug / optimize', 'Offline-first AI services + Mentor-backed LLM when configured.', true],
  ['DSA Judge', 'Problems + verdicts', '15 problems, sample/edge/large tests, Accepted → Compilation Error.', true],
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
        <h2 className="font-semibold text-ink">Supported C++ subset (v1, implemented Phase 4)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Types: <span className="code-font text-xs">int, float, char, bool, void</span> (void: function returns only)</li>
          <li>Declarations with initializers, assignments incl. compound (<span className="code-font text-xs">+= … %=</span>)</li>
          <li>Arithmetic / logical expressions with C precedence, unary and postfix <span className="code-font text-xs">++ --</span></li>
          <li><span className="code-font text-xs">if / else</span>, <span className="code-font text-xs">while</span>, <span className="code-font text-xs">for</span> (incl. declared init), blocks + nested scopes, <span className="code-font text-xs">break / continue</span></li>
          <li>Functions, calls, <span className="code-font text-xs">return</span> (no overloading, no prototypes)</li>
          <li><span className="code-font text-xs">std::cout &lt;&lt; …</span>, <span className="code-font text-xs">std::cin &gt;&gt; …</span>, <span className="code-font text-xs">std::endl</span>, <span className="code-font text-xs">using namespace std;</span></li>
          <li>Out of v1: arrays, structs/classes, pointers, templates, <span className="code-font text-xs">switch</span>, <span className="code-font text-xs">sizeof</span>, exceptions, member access — clear error, never silent</li>
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
            {rows.map(([p, t, s, done]) => (
              <tr key={p} className="border-t border-edge text-muted">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-mint">
                  {done && <span className="mr-1">✓</span>}{p}
                </td>
                <td className="px-4 py-2 text-body">{t}</td>
                <td className="px-4 py-2">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted">
        Backend API contract: the <Link to="/compiler" className="text-mint hover:underline">workspace</Link> calls{' '}
        compiler, run, AI, history, practice, problems and dashboard routes — all live.
        Full contract lives in <span className="code-font text-xs">docs/api.md</span>.
      </p>
    </div>
  );
}
