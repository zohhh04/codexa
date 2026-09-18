import { Boxes, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui';

const links = [
  { to: '/compiler', label: 'Compiler' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/docs', label: 'Docs' },
];

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className="grid size-9 place-items-center rounded-lg border border-edge2 bg-ink/5 text-body transition-colors hover:border-teal-400/50 hover:text-ink"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-base/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-black">
            <Boxes size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Codexa <span className="text-mint">AI</span>
          </span>
          <span className="ml-2 hidden rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[11px] text-muted md:inline">
            Phase 1 · Foundation
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-ink/10 text-ink' : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <span className="max-w-40 truncate text-sm text-muted">{user.name || user.email}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="rounded-lg p-2 text-body hover:bg-ink/5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-edge px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {[...links, { to: '/login', label: 'Log in' }, { to: '/register', label: 'Get Started' }].map((l) => (
              <NavLink
                key={l.to + l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
