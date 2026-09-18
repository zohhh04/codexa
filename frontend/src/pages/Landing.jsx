import {
  ArrowRight,
  BookOpen,
  Boxes,
  BrainCircuit,
  GitBranch,
  GraduationCap,
  Play,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../components/ui';
import { PIPELINE_PHASES } from '../utils/samples';

const features = [
  {
    icon: <ScanSearch size={20} />,
    title: 'Real compiler pipeline',
    desc: 'Hand-built lexer, parser, semantic analyzer and TAC generator for a documented C++ subset — not simulated output.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Authentic Clang diagnostics',
    desc: 'Sandboxed Clang process with parsed line/column/severity. Clear error when Clang is unavailable — never faked.',
  },
  {
    icon: <BrainCircuit size={20} />,
    title: 'AI Error Detective',
    desc: 'Beginner / intermediate / advanced explanations grounded in real diagnostics, with a validated JSON schema.',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'Fix verification',
    desc: 'Side-by-side diffs, explicit user approval, undo/redo, and fresh re-analysis after every accepted fix.',
  },
  {
    icon: <GraduationCap size={20} />,
    title: 'Tutor + practice',
    desc: 'Hints-before-solutions tutoring and stored practice attempts that drive real dashboard statistics.',
  },
  {
    icon: <BookOpen size={20} />,
    title: 'Pipeline visualization',
    desc: 'Source → Lex → Parse → Semantic → TAC, each phase showing its actual inputs, outputs and errors.',
  },
];

export default function Landing() {
  return (
    <div className="fade-in">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(600px 300px at 20% 0%, rgba(45,212,191,0.15), transparent), radial-gradient(700px 320px at 85% 10%, rgba(139,92,246,0.18), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 md:pt-24">
          <Badge tone="teal" className="mb-4">
            <Sparkles size={12} /> Compiler Design · MERN · Clang + AI
          </Badge>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-6xl">
            Understand Your Code, <span className="bg-gradient-to-r from-teal-300 to-violet-400 bg-clip-text text-transparent light:from-teal-600 light:to-violet-600">Not Just Your Errors</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted md:text-lg">
            Codexa AI shows how your C++ is lexed, parsed, type-checked and lowered to
            three-address code — then explains real Clang errors at your level and helps
            you fix them safely.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register">
              <Button size="lg">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/compiler">
              <Button size="lg" variant="secondary">
                <Play size={18} /> Try Compiler
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted">
            <Badge>No fake diagnostics</Badge>
            <Badge>User-approved fixes only</Badge>
            <Badge>Sandboxed execution</Badge>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-ink">Everything a compiler student needs</h2>
        <p className="mt-1 text-sm text-muted">Built incrementally across 10 phases. Phase 1 ships the foundation below.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-colors hover:border-teal-400/40">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-400/10 text-teal-300 light:text-teal-700">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PIPELINE PREVIEW */}
      <section className="border-y border-edge bg-sunken">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-center gap-2">
            <Boxes size={20} className="text-mint" />
            <h2 className="text-2xl font-bold text-ink">Compiler pipeline preview</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Each phase displays its real inputs and outputs. Placeholders below activate in Phases 3–7.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {PIPELINE_PHASES.map((p, i) => (
              <div key={p.id} className="panel relative p-4">
                <p className="text-[11px] uppercase tracking-wider text-mint">Step {i + 1}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{p.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{p.desc}</p>
                <Badge tone="violet" className="mt-3">{p.status}</Badge>
              </div>
            ))}
          </div>
          <div className="code-font mt-6 overflow-x-auto rounded-xl border border-edge bg-code p-4 text-xs leading-relaxed">
            <p className="text-muted">{'//'} a = b + c * d lowers with correct precedence (Phase 5)</p>
            <p className="text-violet-300">t1 = c * d</p>
            <p className="text-violet-300">t2 = b + t1</p>
            <p className="text-teal-300">a = t2</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-ink">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['1', 'Write C++', 'Edit in the Monaco workspace with samples and projects.'],
            ['2', 'Analyze', 'Run the educational pipeline + sandboxed Clang diagnostics.'],
            ['3', 'Understand', 'Ask the AI Detective for level-appropriate explanations.'],
            ['4', 'Fix & verify', 'Approve a diff, re-analyze, and confirm the error is gone.'],
          ].map(([n, t, d]) => (
            <Card key={n}>
              <p className="bg-gradient-to-r from-teal-300 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent light:from-teal-600 light:to-violet-600">{n}</p>
              <h3 className="mt-2 font-semibold text-ink">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-teal-400/20 bg-gradient-to-r from-teal-400/5 to-violet-500/5">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-bold text-ink">For programming students</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                See <em>why</em> an error occurs, which compiler phase caught it, and which
                concept to study next — with practice progress backed by your real attempts.
              </p>
            </div>
            <Link to="/compiler">
              <Button>Open the workspace <ArrowRight size={16} /></Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
