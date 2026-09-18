import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card } from '../components/ui';

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <Badge tone="amber">Demo session only · Real JWT auth in Phase 9</Badge>
        <h1 className="mt-3 text-xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
      </Card>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-edge2 bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-teal-400/60';

export function Login() {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Phase 1 keeps a local demo session so routing can be tested. Backend JWT login arrives in Phase 9."
      footer={<>No account? <Link className="text-mint hover:underline" to="/register">Register</Link></>}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          loginLocal(form.email.split('@')[0] || 'student', form.email || 'student@codexa.ai');
          navigate('/compiler');
        }}
      >
        <input className={inputCls} placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={inputCls} placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button className="w-full" type="submit">Log in (demo)</Button>
      </form>
    </AuthCard>
  );
}

export function Register() {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  return (
    <AuthCard
      title="Create your account"
      subtitle="Registration UI is functional locally. Password hashing + MongoDB persistence arrive in Phase 9."
      footer={<>Have an account? <Link className="text-mint hover:underline" to="/login">Log in</Link></>}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          loginLocal(form.name || 'student', form.email || 'student@codexa.ai');
          navigate('/compiler');
        }}
      >
        <input className={inputCls} placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={inputCls} placeholder="Password (min 8 chars)" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button className="w-full" type="submit">Get Started (demo)</Button>
      </form>
    </AuthCard>
  );
}
