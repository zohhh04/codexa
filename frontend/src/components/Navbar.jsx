import { Boxes, ChevronDown, FlaskConical, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui';

const links = [
  { to: '/', label: 'Home' },
  { to: '/studio', label: 'Studio' },
  { to: '/fun', label: 'Fun' },
];

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className="grid size-9 place-items-center rounded-lg border border-edge2 bg-ink/5 text-body transition-colors hover:border-teal-400/50 hover:text-ink"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

function initials(name, email) {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-edge2 bg-ink/5 py-1 pl-1 pr-2 transition-colors hover:border-teal-400/50"
      >
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-violet-500 text-[11px] font-bold text-black">
          {initials(user?.name, user?.email)}
        </span>
        <span className="max-w-[110px] truncate text-xs font-medium text-body">
          {user?.name || user?.email || 'Profile'}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-edge bg-panel shadow-xl">
          <div className="border-b border-edge px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name || 'Coder'}</p>
            <p className="truncate text-xs text-muted">{user?.email || ''}</p>
          </div>
          <div className="p-1.5">
            <Link
              to="/studio"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
            >
              <FlaskConical size={15} /> My Studio
            </Link>
            <button
              onClick={() => {
                logout();
                setOpen(false);
                navigate('/');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-body hover:bg-ink/5 hover:text-red-400"
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
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nav-shell sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-black">
            <Boxes size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Codexa
          </span>
          <span className="ml-1 hidden rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[11px] text-muted md:inline">
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
          {isAuthenticated ? (
            <ProfileMenu />
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-ink/5 hover:text-ink">
                Log in
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up free</Button>
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
            {isAuthenticated ? (
              <>
                <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm">
                  <p className="truncate font-semibold text-ink">{user?.name || 'Coder'}</p>
                  <p className="truncate text-xs text-muted">{user?.email || ''}</p>
                </div>
                <NavLink
                  to="/studio"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-body hover:bg-ink/5 hover:text-ink"
                >
                  My Studio
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    navigate('/');
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-body hover:bg-ink/5"
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
                  className="rounded-lg bg-teal-400 px-3 py-2 text-sm font-medium text-black"
                >
                  Sign up free
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
