import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-edge bg-sunken">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-bold text-ink">
            Codexa <span className="text-mint">AI</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Intelligent compiler analysis &amp; AI-powered coding tutor. MERN + real Clang diagnostics.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-body">Product</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li><Link className="hover:text-mint" to="/compiler">Compiler workspace</Link></li>
            <li><Link className="hover:text-mint" to="/dashboard">Dashboard</Link></li>
            <li><Link className="hover:text-mint" to="/docs">Grammar &amp; docs</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-body">Stack</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>React + Vite + Tailwind</li>
            <li>Node + Express + MongoDB</li>
            <li>Clang · Monaco · Recharts</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-body">Status</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>Phase 1: Foundation &amp; UI — <span className="text-mint">complete</span></li>
            <li>Lexer → Phase 3 · Parser → Phase 4</li>
            <li>No fabricated compiler output, ever.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-edge py-4 text-center text-xs text-faint">
        Codexa AI · Compiler Design academic project · {new Date().getFullYear()}
      </div>
    </footer>
  );
}
