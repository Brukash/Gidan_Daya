import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BrandBar } from '../components/BrandBar';
import { ApplicationPill, Button, Field } from '../components/ui';
import { getApplicationByReference } from '../data/repository';
import { useScheme } from '../data/scheme';
import type { Application } from '../data/types';
import { depositFor, outstandingFor } from '../lib/allocations';
import { formatDate, formatNaira, formatSqm } from '../lib/format';
import { memberCategoryLabel } from '../lib/validation';

interface ReceiptState {
  application?: Application;
}

export function ApplicationReceived() {
  const { reference = '' } = useParams();
  const location = useLocation();
  const { scheme } = useScheme();
  const preselected = (location.state as ReceiptState | null)?.application;

  const [application, setApplication] = useState<Application | null>(
    preselected && preselected.reference.toUpperCase() === reference.toUpperCase() ? preselected : null,
  );
  const [memberNumber, setMemberNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const lookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (memberNumber.trim().length < 4) {
      setError('Enter the member ID on the application.');
      return;
    }

    setLooking(true);
    setError(null);
    try {
      const found = await getApplicationByReference(reference, memberNumber);
      if (!found) {
        setError('No application matches that reference and ID number.');
        return;
      }
      setApplication(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not look the application up.');
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="print:hidden">
        <BrandBar>
          <span className="hidden text-xs text-ink-soft sm:inline">Application received</span>
        </BrandBar>
      </div>

      <main className="mx-auto max-w-[52rem] px-5 py-10">
        {application ? (
          <div className="space-y-6">
            <header className="border-b border-line pb-5">
              <p className="eyebrow">Gidan Daya · application received</p>
              <h1 className="mt-3 text-[2rem] leading-none sm:text-[2.4rem]">Keep this reference.</h1>
              <p className="mt-3 max-w-[52ch] text-[0.9375rem] text-ink-soft">
                {application.memberName}, your application for a {formatSqm(application.sizeSqm)} plot is on record. The
                secretariat will match your transfer using the ID number and name in the narration.
              </p>
            </header>

            <section className="card-raised overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">Reference</p>
                  <p className="num mt-1 font-display text-[1.6rem] leading-none text-forest">{application.reference}</p>
                </div>
                <ApplicationPill status={application.status} />
              </div>

              <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Applicant</dt>
                  <dd className="mt-0.5 text-sm font-medium">{application.memberName}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Member ID</dt>
                  <dd className="num mt-0.5 text-sm font-medium">{application.memberNumber}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Member category</dt>
                  <dd className="mt-0.5 text-sm font-medium">{memberCategoryLabel(application.memberCategory)}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Plot</dt>
                  <dd className="num mt-0.5 text-sm font-medium">{formatSqm(application.sizeSqm)}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Design</dt>
                  <dd className="mt-0.5 text-sm font-medium">
                    {application.houseDesign === 'detached' ? '4-bedroom detached duplex' : '4-bedroom semi-detached duplex'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Plot price</dt>
                  <dd className="num mt-0.5 text-sm font-medium">{formatNaira(application.amount)}</dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Application fee</dt>
                  <dd className="num mt-0.5 text-sm font-medium">
                    {formatNaira(scheme.applicationFee)} · non-refundable
                  </dd>
                </div>
              </dl>

              <div className="border-t border-line px-4 py-4">
                <h2 className="text-[1.05rem]">What you owe next</h2>
                <dl className="mt-2 divide-y divide-line border-y border-line text-sm">
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt>
                      50% deposit
                      <span className="block text-xs text-ink-soft">due {formatDate(scheme.depositDueOn)}</span>
                    </dt>
                    <dd className="num shrink-0 font-medium">{formatNaira(depositFor(application.amount))}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt>
                      Balance
                      <span className="block text-xs text-ink-soft">due {formatDate(scheme.balanceDueOn)}</span>
                    </dt>
                    <dd className="num shrink-0 font-medium">
                      {formatNaira(application.amount - depositFor(application.amount))}
                    </dd>
                  </div>
                </dl>
                <p className="num mt-2 text-xs text-ink-soft">
                  Recorded so far: {formatNaira(application.paid)} · outstanding{' '}
                  {formatNaira(outstandingFor(application))}
                </p>
              </div>
            </section>

            <section className="card p-4">
              <h2 className="text-[1.05rem]">Next steps</h2>
              <ol className="mt-2 space-y-1.5 text-sm text-ink-soft">
                <li>
                  1. Pay the {formatNaira(scheme.applicationFee)} fee and the 50% deposit by transfer to the
                  cooperative's UBA project account, quoting{' '}
                  <span className="num">{application.memberNumber}</span> and your name.
                </li>
                <li>2. The secretariat verifies the transfer, records the payment date and fixes your queue position.</li>
                <li>
                  3. Sign in with your cooperative account to attach payment evidence, follow the balance, and download a
                  statement.
                </li>
                <li>4. Allocation is first-come by confirmed payment, with the cadre rule stated on the scheme page.</li>
              </ol>
            </section>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Button onClick={() => window.print()}>Print this receipt</Button>
              <Link to="/signin" className="btn btn-forest">
                Sign in to track it
              </Link>
              <Link to="/apply" className="btn btn-ghost">
                Start another subscription
              </Link>
              <Link to="/" className="btn btn-quiet">
                Back to the scheme
              </Link>
            </div>

            <p className="text-xs text-ink-soft">
              Keep the reference <span className="num">{application.reference}</span>. You can reopen this receipt with it
              and your member ID.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="border-b border-line pb-5">
              <p className="eyebrow">Gidan Daya</p>
              <h1 className="mt-3 text-[2rem] leading-none sm:text-[2.4rem]">Open your application</h1>
              <p className="mt-3 max-w-[52ch] text-[0.9375rem] text-ink-soft">
                The application is on record. Enter the member ID used on it to see the reference, the plot and what
                is due next.
              </p>
            </header>

            <form onSubmit={(event) => void lookup(event)} noValidate className="card-raised max-w-md p-4">
              <p className="num text-sm font-semibold text-forest">{reference}</p>
              <div className="mt-3">
                <Field
                  label="Member ID"
                  htmlFor="lookup-member-number"
                  error={error ?? undefined}
                  hint="The member ID on the application, e.g. 19159."
                >
                  <input
                    id="lookup-member-number"
                    className={`input${error ? ' input-invalid' : ''}`}
                    value={memberNumber}
                    onChange={(event) => setMemberNumber(event.target.value)}
                    autoComplete="off"
                    placeholder="19159"
                    aria-invalid={Boolean(error)}
                  />
                </Field>
              </div>
              <Button type="submit" className="mt-3 w-full" disabled={looking}>
                {looking ? 'Opening…' : 'Open application'}
              </Button>
              <p className="mt-2 text-xs text-ink-soft">
                Applied with an account?{' '}
                <Link to="/signin" className="text-forest underline underline-offset-4">
                  Sign in instead
                </Link>
                .
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
