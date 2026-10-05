import {
  ArrowRight,
  Bot,
  FileCode2,
  GitBranch,
  ListTree,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '../components/ui';

const features = [
  {
    icon: <FileCode2 size={20} />,
    title: 'Code Editor',
    desc: 'Write C, C++, Java or Python with syntax highlighting and line numbers. Everything analyzes your actual code.',
  },
  {
    icon: <ScanSearch size={20} />,
    title: 'Lexical Analysis',
    desc: 'Tokenize your code into keywords, identifiers, operators, literals and separators — shown in a clear table.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Syntax Analysis',
    desc: 'Check grammar rules, find the exact line of each error, and see what was expected.',
  },
  {
    icon: <ListTree size={20} />,
    title: 'Parse Tree / AST',
    desc: 'Visualize how your program parses — expand nodes for expressions, loops, conditions and functions.',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'Semantic Analysis',
    desc: 'Catch undeclared variables, type mismatches and scope problems with plain explanations.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Code Optimization',
    desc: 'See constant folding, propagation, dead-code removal and common-subexpression fixes on your code.',
  },
  {
    icon: <Bot size={20} />,
    title: 'AI Coding Tutor',
    desc: 'Ask about your code, errors or compiler concepts — get simple hints, not just answers.',
  },
  {
    icon: <Sparkles size={20} />,
    title: 'AI Code Generation',
    desc: 'Describe a program in words, get starter code in your language, dropped straight into the editor.',
  },
];

const steps = [
  ['1', 'Write or generate code', 'Type in the editor or describe what you want and let AI draft it.'],
  ['2', 'Analyze', 'One click runs lexical, syntax, AST, semantic and optimization passes.'],
  ['3', 'Learn', 'Ask the tutor why something works — or why it failed.'],
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
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-16 text-center sm:px-6 md:pt-24">
          <Badge tone="teal" className="mb-4">
            <Sparkles size={12} /> Compiler Design · Interactive Lab
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-6xl">
            See how a compiler{' '}
            <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-violet-600 bg-clip-text text-transparent dark:from-teal-300 dark:via-teal-200 dark:to-violet-400">
              reads your code
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted md:text-lg">
            <strong className="font-semibold text-ink">Codexa</strong> is your Compiler
            Design lab — write code, analyze each phase, ask the AI tutor.
            Every result comes from the exact program in your editor.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/studio">
              <Button size="lg">
                Open Studio <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary">
                Create free account
              </Button>
            </Link>
          </div>
          <div className="code-strip code-font mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl text-left">
            <div className="flex items-center gap-1.5 border-b border-edge px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[11px] font-medium tracking-wide text-muted">
                live analysis — your code, every phase
              </span>
            </div>
            <div className="space-y-2 p-4 text-xs leading-relaxed">
              <p className="text-muted">{'// your code → live analysis'}</p>
              <p>
                <span className="text-teal-600 dark:text-teal-300">int sum = a + b;</span>{' '}
                <span className="text-muted">→ tokens → AST → checks → faster code</span>
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['tokens: 6', 'AST: 9 nodes', 'errors: 0', 'fold: none'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-edge2 bg-ink/5 px-2 py-0.5 text-[11px] text-body"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-ink">Eight tools, one simple studio</h2>
        <p className="mt-1 text-center text-sm text-muted">
          Nothing hardcoded — every result comes from the code in your editor.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="transition-colors hover:border-teal-400/40">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-400/10 text-teal-300 light:text-teal-700">
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-edge bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-ink">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(([n, t, d]) => (
              <Card key={n}>
                <p className="bg-gradient-to-r from-teal-300 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent light:from-teal-600 light:to-violet-600">
                  {n}
                </p>
                <h3 className="mt-2 font-semibold text-ink">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/studio">
              <Button>
                Start analyzing <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
