import { BookOpen, Eye, EyeOff, FileText, Lock, Pill, Users } from 'lucide-react';
import { FormEvent, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { HospitalPhoto } from '@/components/brand/HospitalPhoto';
import { site } from '@/config/site';
import { homePathForRole } from '@/config/roleHome';
import { testAccountsForTab, type LoginTab, type TestAccount } from '@/config/testAccounts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { authStatusBanner } from '@/services/authProvider';

const features = [
  { icon: Pill, title: 'Drug Index A–Z', text: 'Browse formulary medications' },
  { icon: FileText, title: 'Protocols', text: 'Access therapeutic protocols' },
  { icon: BookOpen, title: 'Guidelines', text: 'Clinical practice guidelines' },
  { icon: Users, title: 'Patient Counseling Materials', text: 'Counseling resources' },
];

export function LoginPage() {
  const { signInWithTab, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<LoginTab>('admin-team');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const banner = authStatusBanner();
  const tabAccounts = testAccountsForTab(tab);

  function switchTab(next: LoginTab) {
    setTab(next);
    setErrors({});
  }

  function fillCredentials(account: TestAccount) {
    setUsername(account.username);
    setPassword(account.password);
    setErrors({});
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) return;

    const result = await signInWithTab(username, password, tab);
    if (!result.session) {
      setErrors({ form: result.error ?? 'Credentials were not recognized.' });
      return;
    }
    navigate(safeNext(params.get('next'), result.session.role));
  }

  return (
    <div className="min-h-screen bg-[#e7f3fb] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,440px)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
      <section className="relative min-h-[360px] overflow-hidden sm:min-h-[420px] lg:min-h-screen">
        <HospitalPhoto variant="primary" decorative className="login-photo absolute inset-0 h-[78%] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-[#e7f3fb]/20 to-[#e7f3fb]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-8 lg:p-10">
          <Link to="/" className="inline-flex w-fit rounded-2xl bg-white/75 px-3 py-2 backdrop-blur">
            <ClusterLogo className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="max-w-xl pb-4">
            <h1 className="font-serif text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight text-navy">{site.platformName}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-ink/80">{site.tagline}</p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="text-center sm:text-left">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-sm sm:mx-0">
                    <feature.icon size={20} />
                  </span>
                  <p className="mt-2 text-sm font-semibold text-navy">{feature.title}</p>
                  <p className="text-xs leading-5 text-muted">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-white px-4 py-10 lg:rounded-bl-[72px]">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <ClusterLogo className="h-10 w-auto" />
          </div>
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-clinical text-primary">
              <Lock size={22} />
            </span>
            <h2 className="mt-4 font-serif text-[clamp(1.75rem,3vw,2.25rem)] text-navy">Welcome Back</h2>
            <p className="mt-1 text-sm text-muted">Sign in to access the {site.platformName}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-teal/20 bg-clinical px-4 py-3 text-sm leading-6 text-navy">
            <p className="font-semibold">Local evaluation workspace</p>
            <p className="mt-1 text-[13px] text-ink/80">{banner}</p>
            {session && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                <span>
                  Signed in as {session.displayName} ({session.role}).
                </span>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={async () => {
                    await signOut();
                  }}
                >
                  Sign out
                </button>
              </p>
            )}
          </div>

          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1"
            role="tablist"
            aria-label="Sign-in type"
          >
            <TabButton active={tab === 'admin-team'} onClick={() => switchTab('admin-team')}>
              Admin &amp; Team Login
            </TabButton>
            <TabButton active={tab === 'staff'} onClick={() => switchTab('staff')}>
              General Staff Login
            </TabButton>
          </div>

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <Field label="Username" value={username} onChange={setUsername} error={errors.username} autoComplete="username" />
            <div>
              <label className="ui-label" htmlFor="password">
                Password
              </label>
              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                error={errors.password}
              />
            </div>
            {errors.form && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {errors.form}
              </p>
            )}
            <button type="submit" className="btn-primary w-full py-3">
              Sign In
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-line/80 bg-canvas/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Test Account Information</p>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              Evaluation credentials only. Embedded in the static frontend and not real-world access control.
            </p>
            <ul className="mt-3 space-y-2">
              {tabAccounts.map((account) => (
                <li
                  key={account.username}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/70 bg-white px-3 py-2 text-[13px]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{account.displayName}</p>
                    <p className="truncate text-muted">
                      {account.username} · {account.password}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-navy transition hover:border-primary/40 hover:bg-clinical"
                    onClick={() => fillCredentials(account)}
                  >
                    Fill Credentials
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink">
            <span className="mt-0.5 text-primary">
              <Lock size={16} />
            </span>
            <p>
              <span className="font-semibold text-navy">Authorized evaluation use</span>
              <br />
              Prototype role navigation for {site.organizationName}. No public self-registration. Do not store confidential
              hospital credentials in this static application.
            </p>
          </div>
          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-primary hover:underline">
              Return to hospital selection
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-xl px-2 py-2.5 text-center text-[12px] font-semibold leading-snug transition sm:text-sm',
        active ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy',
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label className="ui-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="ui-input"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggle,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <input
          id="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          className="ui-input pr-12"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-navy"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

function safeNext(value: string | null, role?: string): string {
  const fallback = homePathForRole(role);
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return fallback;
  }
  // Staff may not open admin/workspace deep links after login.
  if (role === 'staff' && (value.startsWith('/admin') || value.startsWith('/workspace'))) {
    return '/';
  }
  if (role === 'team_member' && value.startsWith('/admin') && value !== '/admin') {
    // Allow team content editors on shared admin content routes; dashboard alone redirects.
  }
  return value;
}
