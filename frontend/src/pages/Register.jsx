import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/studio';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-md px-4 py-14">
      <Card>
        <h1 className="text-xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Sign up to write, analyze and run code.</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-body">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
            />
          </label>
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
            <span className="mb-1 block font-medium text-body">Password (min 8 chars)</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300 light:text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Sign up free'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Have an account?{' '}
          <Link to="/login" state={{ from }} className="font-medium text-mint hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
