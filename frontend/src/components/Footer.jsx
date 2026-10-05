import { Boxes, FlaskConical, MessagesSquare, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

const cols = [
  {
    title: 'Studio',
    links: [
      { to: '/studio', label: 'My Studio' },
      { to: '/register', label: 'Create account' },
      { to: '/login', label: 'Log in' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { to: '/studio', label: 'Lexical analysis' },
      { to: '/studio', label: 'Parse tree / AST' },
      { to: '/studio', label: 'Optimization' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-edge bg-sunken">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-black">
              <Boxes size={18} strokeWidth={2.5} />
            </span>
            <p className="font-bold text-ink">Codexa</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A hands-on compiler playground. Type a program, watch tokens, trees
            and checks appear, then run it — with a tutor that speaks your language.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['C', 'C++', 'Java', 'Python'].map((l) => (
              <span key={l} className="rounded-full border border-edge2 bg-ink/5 px-2.5 py-0.5 text-[11px] text-body">
                {l}
              </span>
            ))}
          </div>
        </div>

        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-body hover:text-ink hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="rounded-2xl border border-edge bg-panel p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessagesSquare size={15} className="text-teal-400" /> Try the voice tutor
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Open the Studio, press <span className="font-medium text-body">Explain aloud</span>, and
            hear your code walked through line by line — or tap the mic and ask.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="flex items-center gap-1"><ScanSearch size={12} /> Analyze</span>
            <span className="flex items-center gap-1"><FlaskConical size={12} /> Run</span>
            <span className="flex items-center gap-1"><MessagesSquare size={12} /> Ask</span>
          </div>
        </div>
      </div>
      <div className="border-t border-edge">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-3 text-xs text-faint sm:flex-row sm:px-6">
          <p>Codexa · built for Compiler Design labs · {new Date().getFullYear()}</p>
          <p>Tokens → AST → checks → run, all from your code.</p>
        </div>
      </div>
    </footer>
  );
}
