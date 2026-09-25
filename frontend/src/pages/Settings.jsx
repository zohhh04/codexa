import { AlertTriangle, Cpu, KeyRound, LogOut, MonitorCog, Palette, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getHistory, getProjects, getToolchainStatus } from '../services/api';
import { DEFAULT_EDITOR_PREFS, loadEditorPrefs, saveEditorPrefs } from '../utils/editorPrefs';
import { Badge, Button, Card } from '../components/ui';

const inputCls =
  'w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60';

function Section({ icon, title, subtitle, children }) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg border border-edge2 bg-ink/5 text-mint">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function Settings() {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [prefs, setPrefs] = useState(loadEditorPrefs);
  const [counts, setCounts] = useState({ projects: null, history: null });
  const [toolchain, setToolchain] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, h, t] = await Promise.allSettled([getProjects(), getHistory(), getToolchainStatus()]);
        if (cancelled) return;
        setCounts({
          projects: p.status === 'fulfilled' && p.value.success ? p.value.data.length : null,
          history: h.status === 'fulfilled' && h.value.success ? h.value.data.length : null,
        });
        if (t.status === 'fulfilled' && t.value.success) setToolchain(t.value.data);
      } catch {
        /* offline — leave counts unknown */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updatePrefs = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveEditorPrefs(next);
      return next;
    });
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileErr('Display name cannot be empty.');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile(trimmed);
      setProfileMsg('Display name updated.');
    } catch (err) {
      setProfileErr(err.message || 'Could not update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (pw.next.length < 8) {
      setPwErr('New password must be at least 8 characters.');
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwErr('New passwords do not match.');
      return;
    }
    if (pw.current === pw.next) {
      setPwErr('New password must be different from the current one.');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pw.current, pw.next);
      setPwMsg('Password changed successfully.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwErr(err.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your account and all saved projects? This cannot be undone.')) return;
    if (!confirm('Last chance — really delete everything and sign out?')) return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || 'Could not delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Account settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your profile, password, appearance, editor defaults and data.
        </p>
      </div>

      <Section
        icon={<UserRound size={17} />}
        title="Profile"
        subtitle="How your name appears across Codexa."
      >
        <form onSubmit={handleProfile} className="space-y-3">
          {profileErr && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 light:text-red-700">{profileErr}</p>}
          {profileMsg && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 light:text-emerald-700">{profileMsg}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Email</span>
              <p className="rounded-lg border border-edge bg-sunken px-3 py-2 text-sm text-muted">{user?.email}</p>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Member since</span>
              <p className="rounded-lg border border-edge bg-sunken px-3 py-2 text-sm text-muted">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Section>

      <Section
        icon={<KeyRound size={17} />}
        title="Password"
        subtitle="Change your sign-in password. Minimum 8 characters."
      >
        <form onSubmit={handlePassword} className="space-y-3">
          {pwErr && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 light:text-red-700">{pwErr}</p>}
          {pwMsg && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 light:text-emerald-700">{pwMsg}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pw-next">New password</label>
              <input id="pw-next" type="password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} minLength={8} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" type="password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} minLength={8} required />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={pwSaving}>
            {pwSaving ? 'Changing…' : 'Change password'}
          </Button>
        </form>
      </Section>

      <Section
        icon={<Palette size={17} />}
        title="Appearance"
        subtitle="Theme applies instantly across the app and editor."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => theme !== 'dark' && toggle()}>
            Dark
          </Button>
          <Button size="sm" variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => theme !== 'light' && toggle()}>
            Light
          </Button>
          <Badge tone="teal">Current: {theme}</Badge>
        </div>
      </Section>

      <Section
        icon={<MonitorCog size={17} />}
        title="Editor defaults"
        subtitle="Applied to the compiler editor on your next visit."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pref-font">Font size ({prefs.fontSize}px)</label>
            <input
              id="pref-font"
              type="range"
              min={11}
              max={20}
              value={prefs.fontSize}
              onChange={(e) => updatePrefs({ fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pref-tab">Tab size</label>
            <select
              id="pref-tab"
              value={prefs.tabSize}
              onChange={(e) => updatePrefs({ tabSize: Number(e.target.value) })}
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
            >
              {[2, 4, 8].map((n) => <option key={n} value={n}>{n} spaces</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="pref-wrap">Word wrap</label>
            <select
              id="pref-wrap"
              value={prefs.wordWrap}
              onChange={(e) => updatePrefs({ wordWrap: e.target.value })}
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-body"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => { saveEditorPrefs({ ...DEFAULT_EDITOR_PREFS }); setPrefs({ ...DEFAULT_EDITOR_PREFS }); }}
        >
          Reset editor defaults
        </Button>
      </Section>

      <Section
        icon={<Cpu size={17} />}
        title="Language toolchains"
        subtitle="What can actually execute on this backend machine."
      >
        {!toolchain ? (
          <p className="text-sm text-muted">Checking toolchains…</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(toolchain).map(([key, info]) => (
              <div key={key} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm">
                <Badge tone={info.available ? 'green' : 'red'}>{info.available ? 'OK' : 'Missing'}</Badge>
                <span className="font-medium text-ink">{info.label}</span>
                <span className="font-mono text-[11px] text-muted">{info.available ? (info.version || info.path) : `not found at '${info.path}'`}</span>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted">
              Missing Java or Python? On the backend machine: install a JDK 17+ and Python 3.10+, add them to PATH
              (or set JAVAC_PATH / JAVA_PATH / PYTHON_PATH in backend/.env), then restart the backend.
              Windows shortcut: <span className="font-mono">node backend/scripts/setup-toolchains.js --install</span> (winget).
            </p>
          </div>
        )}
      </Section>

      <Section
        icon={<AlertTriangle size={17} />}
        title="Data & danger zone"
        subtitle="Your saved work and account lifecycle."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="teal">{counts.projects === null ? '…' : counts.projects} projects</Badge>
          <Badge tone="violet">{counts.history === null ? '…' : counts.history} history entries</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { logout(); navigate('/', { replace: true }); }}
          >
            <LogOut size={14} /> Sign out
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete account & all data'}
          </Button>
        </div>
      </Section>
    </div>
  );
}
