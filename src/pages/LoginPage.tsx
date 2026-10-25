import { BookOpen, Eye, EyeOff, FileText, Lock, Pill, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { HospitalPhoto } from '@/components/brand/HospitalPhoto';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { accountsInitialized, createAccount } from '@/services/accounts';
import { authStatusBanner } from '@/services/authProvider';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

const features = [
  { icon: Pill, title: 'Drug Index A–Z', text: 'Browse formulary medications' },
  { icon: FileText, title: 'Protocols', text: 'Access therapeutic protocols' },
  { icon: BookOpen, title: 'Guidelines', text: 'Clinical practice guidelines' },
  { icon: Users, title: 'Patient Counseling Materials', text: 'Counseling resources' },
];

export function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const needsBootstrap = useMemo(() => !accountsInitialized(), []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string; email?: string; confirm?: string }>({});
  const [ssoNote, setSsoNote] = useState('');
  const [recoveryNote, setRecoveryNote] = useState('');
  const banner = authStatusBanner();
  const supabase = getSupabaseConfigStatus();

  async function onBootstrap(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = 'Choose a username.';
    if (!email.trim()) nextErrors.email = 'Enter an email for notifications.';
    if (password.length < 10) nextErrors.password = 'Use at least 10 characters.';
    if (password !== confirm) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await createAccount({
        username,
        displayName: displayName || 'Administrator',
        email,
        role: 'administrator',
        password,
      });
      const result = await signIn(username, password);
      if (!result) {
        setErrors({ form: 'Account created but sign-in failed. Try signing in again.' });
        return;
      }
      navigate(safeNext(params.get('next'), result.role));
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not create administrator.' });
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    setSsoNote('');
    if (nextErrors.username || nextErrors.password) return;
    const result = await signIn(username, password);
    if (!result) {
      setErrors({ form: 'Credentials were not recognized, or the account is disabled.' });
      return;
    }
    navigate(safeNext(params.get('next'), result.role));
  }

  return (
    <div className="min-h-screen bg-[#e7f3fb] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.9fr)]">
      <section className="relative min-h-[460px] overflow-hidden">
        <HospitalPhoto variant="primary" decorative className="login-photo absolute inset-0 h-[78%] w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-[#e7f3fb]/20 to-[#e7f3fb]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10">
          <Link to="/" className="inline-flex w-fit rounded-2xl bg-white/75 px-3 py-2 backdrop-blur">
            <ClusterLogo className="h-12 w-auto" />
          </Link>
          <div className="max-w-xl pb-4">
            <h1 className="font-serif text-4xl font-semibold leading-tight text-navy sm:text-5xl">{site.hospitalName}</h1>
            <p className="mt-1 font-serif text-2xl leading-snug text-navy/90 sm:text-3xl">{site.platformName}</p>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink/80">{site.tagline}</p>
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
            <h2 className="mt-4 font-serif text-4xl text-navy">{needsBootstrap ? 'Create administrator' : 'Welcome Back'}</h2>
            <p className="mt-1 text-sm text-muted">
              {needsBootstrap ? 'Initialize the first supervisor account for this library.' : `Sign in to the ${site.platformName} workspace`}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-teal/20 bg-clinical px-4 py-3 text-sm leading-6 text-navy">
            <p className="font-semibold">{supabase.configured ? 'Shared backend ready' : 'Local team accounts'}</p>
            <p className="mt-1 text-[13px] text-ink/80">{banner}</p>
            {session && <p className="mt-2 text-[13px]">Signed in as {session.displayName} ({session.role}).</p>}
          </div>

          {needsBootstrap ? (
            <form className="mt-6 space-y-4" onSubmit={onBootstrap} noValidate>
              <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Pharmacy Administrator" />
              <Field label="Username" value={username} onChange={setUsername} error={errors.username} autoComplete="username" />
              <Field label="Email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
              <PasswordField
                label="Password (min. 10 characters)"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                error={errors.password}
              />
              <PasswordField
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                error={errors.confirm}
              />
              {errors.form && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {errors.form}
                </p>
              )}
              <button type="submit" className="btn-primary w-full py-3">
                Create administrator & sign in
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <Field label="Username" value={username} onChange={setUsername} error={errors.username} autoComplete="username" />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-navy" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setRecoveryNote('Password recovery requires a server-side identity provider (Supabase Auth or hospital SSO).')
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordField
                  label=""
                  hideLabel
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  error={errors.password}
                />
              </div>
              {errors.form && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {errors.form}
                </p>
              )}
              {recoveryNote && <p className="text-sm text-muted">{recoveryNote}</p>}
              <button type="submit" className="btn-primary w-full py-3">
                Sign In
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            or continue with
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() =>
              setSsoNote('Hospital single sign-on is not connected yet. Configure Supabase Auth or the hospital IdP before production.')
            }
          >
            Sign in with Hospital Account (SSO)
          </button>
          {ssoNote && <p className="mt-2 text-sm leading-6 text-muted">{ssoNote}</p>}

          <div className="mt-5 flex gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink">
            <span className="mt-0.5 text-primary">
              <Lock size={16} />
            </span>
            <p>
              <span className="font-semibold text-navy">Authorized personnel only</span>
              <br />
              This system is for {site.hospitalName} staff. No public self-registration into privileged roles.
            </p>
          </div>
          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-primary hover:underline">
              Return to the public library
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
  hideLabel?: boolean;
}) {
  return (
    <div>
      {!hideLabel && label && (
        <label className="ui-label" htmlFor={`pw-${label}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={hideLabel ? 'password' : `pw-${label}`}
          type={show ? 'text' : 'password'}
          autoComplete={hideLabel ? 'current-password' : 'new-password'}
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
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return role === 'team_member' ? '/workspace' : '/admin';
  }
  return value;
}
