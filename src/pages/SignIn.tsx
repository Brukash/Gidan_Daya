import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DEMO_ADMIN, DEMO_MEMBER, useSession } from '../auth/session';
import { signInSchema } from '../lib/validation';
import { isSupabaseConfigured } from '../lib/supabase';
import { Button, Field } from '../components/ui';

interface LocationState {
  from?: string;
}

export function SignIn() {
  const { user, signIn, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const target = (location.state as LocationState | null)?.from ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(target, { replace: true });
  }, [user, target, navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      navigate(target, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.85fr]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <main id="main" className="flex flex-col px-5 py-8 sm:px-10 lg:px-14">
        <Link to="/" className="inline-flex items-center gap-2.5 self-start">
          <img
            src="/brand/coop-seal-64.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px] shrink-0"
          />
          <span className="hidden text-[0.625rem] uppercase leading-[1.3] tracking-[0.1em] text-ink-soft sm:block">
            CBN Staff Multipurpose Cooperative Society
          </span>
        </Link>

        <div className="mt-12 w-full max-w-md lg:mt-20">
          <p className="eyebrow">Member access</p>
          <h1 className="mt-3 text-[2rem] leading-[1.05] sm:text-[2.4rem]">Sign in to your application.</h1>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            {isSupabaseConfigured
              ? 'Use the email address on your cooperative record.'
              : 'No Supabase project is configured on this deployment, so sign-in is simulated in this browser.'}
          </p>

          <form onSubmit={(event) => void onSubmit(event)} className="mt-7 space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={error && email.length === 0 ? error : undefined}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'email-error' : undefined}
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" hint="At least 8 characters.">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="field-error">
                <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 4.6v4.2M8 11.2v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting || loading}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {!isSupabaseConfigured ? (
            <div className="mt-7 border-t border-line pt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Demo accounts
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => {
                    setEmail(DEMO_MEMBER.email);
                    setPassword(DEMO_MEMBER.password);
                    setError(null);
                  }}
                >
                  Member demo
                </Button>
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => {
                    setEmail(DEMO_ADMIN.email);
                    setPassword(DEMO_ADMIN.password);
                    setError(null);
                  }}
                >
                  Secretariat demo
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                Both use the password <span className="num">gidandaya</span>. The secretariat address opens the applicant
                register, payment recording and the allocation report.
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-auto pt-10 text-xs text-ink-soft">
          <Link to="/" className="hover:underline">
            ← Back to the scheme page
          </Link>
        </p>
      </main>

      <aside className="hidden bg-forest px-10 py-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold">Inside the application</p>
          <h2 className="mt-4 text-[1.9rem] leading-tight text-paper">
            One estate, four plot sizes, and a record of every naira.
          </h2>
          <ul className="mt-8 space-y-4 border-t border-paper/20 pt-6 text-sm">
            {[
              'Live availability for 200, 300, 400 and 500 sqm plots',
              'A plot application with its reference, plot and status',
              'The deposit and balance dates, with every payment recorded',
              'A statement you can download as PDF; the register as Excel',
            ].map((item) => (
              <li key={item} className="flex gap-3 text-paper/85">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 max-w-sm text-xs leading-relaxed text-paper/55">
          Figures shown in this deployment are sample data unless it has been connected to a Supabase project.
        </p>
      </aside>
    </div>
  );
}
