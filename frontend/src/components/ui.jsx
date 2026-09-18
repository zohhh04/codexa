export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  const variants = {
    primary:
      'bg-teal-400 text-black hover:bg-teal-300 shadow-[0_0_24px_-6px_rgba(45,212,191,0.6)]',
    secondary: 'bg-raise text-body border border-edge2 hover:border-teal-400/50',
    ghost: 'text-body hover:text-ink hover:bg-ink/5',
    danger: 'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 light:text-red-700',
  };
  return (
    <button
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`panel p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-ink/5 text-body border-ink/10',
    teal: 'bg-teal-400/10 text-teal-300 border-teal-400/30 light:text-teal-700 light:border-teal-600/40',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30 light:text-violet-700 light:border-violet-600/40',
    red: 'bg-red-500/10 text-red-300 border-red-500/30 light:text-red-700 light:border-red-600/40',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/30 light:text-amber-700 light:border-amber-600/40',
    green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30 light:text-emerald-700 light:border-emerald-600/40',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge2 bg-ink/5 px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, icon }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
