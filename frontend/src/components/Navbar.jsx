import { Boxes, ChevronDown, LayoutDashboard, LogOut, Menu, Moon, Settings as SettingsIcon, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui';

const links = [
  { to: '/compiler', label: 'Compiler' },
  { to: '/ai', label: 'AI Studio' },
  { to: '/problems', label: 'Problems' },
  { to: '/learn', label: 'Learn' },
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

function initials(name, email) {
  const src = (name || email || '?').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (src.includes('@')) return src.slice(0, 2).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const label = useMemo(() => {
    if (!user) return '';
    return user.name || user.email;
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex max-w-64 items-center gap-2.5 rounded-xl border py-1.5 pl-1.5 pr-2.5 text-left transition-colors ${
          open ? 'border-teal-400/50 bg-ink/10' : 'border-edge2 bg-ink/5 hover:border-teal-400/40 hover:bg-ink/10'
        }`}
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-xs font-bold text-black"
        >
          {initials(user.name, user.email)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block max-w-36 truncate text-sm font-semibold text-ink">{label}</span>
          <span className="block max-w-36 truncate text-[11px] text-muted">{user.email}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-edge2 bg-panel shadow-xl"
        >
          <div className="border-b border-edge px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.name || 'Codexa user'}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            {user.createdAt && (
              <p className="mt-1 text-[11px] text-faint">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="p-1.5">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/dashboard'); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <LayoutDashboard size={15} className="text-muted" /> Dashboard
            </button>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <SettingsIcon size={15} className="text-muted" /> Account settings
            </button>
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 light:text-red-700"
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
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
            C · C++ · Java · Python
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
            <UserMenu />
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
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <div className="mt-1 flex items-center gap-2.5 rounded-lg border border-edge2 bg-ink/5 px-3 py-2">
                  <span
                    aria-hidden
                    className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-xs font-bold text-black"
                  >
                    {initials(user.name, user.email)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{user.name || user.email}</span>
                    <span className="block truncate text-[11px] text-muted">{user.email}</span>
                  </span>
                </div>
                <NavLink
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
                >
                  Account settings
                </NavLink>
                <button
                  onClick={() => { setOpen(false); logout(); navigate('/'); }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 light:text-red-700"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
                >
                  Get Started
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
