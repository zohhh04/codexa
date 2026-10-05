import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/studio';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-md px-4 py-14">
      <Card>
        <h1 className="text-xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to open your compiler studio.</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-body">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-body">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300 light:text-red-700">
              {error}
              {error.includes('404') || error.toLowerCase().includes('not found') || error.toLowerCase().includes('network') ? (
                <span className="mt-1 block text-xs opacity-80">Is the backend running at {import.meta.env.VITE_API_URL || '/api'}? Start it with: cd backend; npm run dev</span>
              ) : null}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          No account?{' '}
          <Link to="/register" state={{ from }} className="font-medium text-mint hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
