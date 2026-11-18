import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  ApplicationPill,
  Button,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  useToast,
} from '../components/ui';
import {
  addEvidence,
  getSettings,
  listApplications,
  listAudit,
  listEvidence,
  recordPayment,
  reviewEvidence,
} from '../data/repository';
import { SCHEME } from '../data/seed';
import { TERMS_CLAUSES } from '../data/terms';
import type {
  Application as ApplicationRecord,
  ApplicationStatus,
  EvidenceStatus,
  PaymentEvidence,
  PaymentKind,
  ReviewDecision,
} from '../data/types';
import {
  depositFor,
  describePolicy,
  hasPriority,
  outstandingFor,
  positionReason,
  queuePosition,
  STATUS_LABEL,
} from '../lib/allocations';
import { exportApplicationPdf } from '../lib/exports';
import { formatDate, formatDateTime, formatFileSize, formatNaira, formatSqm } from '../lib/format';
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPE_LABEL,
  evidenceProblem,
  paymentAmountProblem,
  reviewNoteProblem,
} from '../lib/validation';

const STEPS: ApplicationStatus[] = ['reserved', 'deposit-paid', 'fully-paid', 'allocated'];

const STEP_LABEL: Record<ApplicationStatus, string> = {
  reserved: 'Application received',
  'deposit-paid': '50% deposit confirmed',
  'fully-paid': 'Full payment confirmed',
  allocated: 'Allocation letter issued',
};

const KIND_LABEL: Record<PaymentKind, string> = {
  'application-fee': 'Application fee',
  deposit: '50% deposit',
  balance: 'Balance',
};

const EVIDENCE_TONE: Record<EvidenceStatus, string> = {
  pending: 'bg-gold-tint text-[#6f4d12]',
  verified: 'bg-sage text-forest',
  rejected: 'bg-clay-tint text-clay-deep',
};

function StatusTrack({ status }: { status: ApplicationStatus }) {
  const current = STEPS.indexOf(status);

  return (
    <ol className="mt-4 grid gap-2 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} className="flex items-start gap-2">
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold ${
                done ? 'bg-forest text-paper' : 'border border-line bg-paper-2 text-ink-soft'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={`text-xs leading-snug ${done ? 'font-medium text-ink' : 'text-ink-soft'}`}>
              {STEP_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PaymentSchedule({ application }: { application: ApplicationRecord }) {
  const deposit = depositFor(application.amount);
  const paidToDeposit = Math.min(application.paid, deposit);
  const paidToBalance = Math.max(0, application.paid - deposit);

  const rows = [
    {
      label: 'Application fee',
      due: 'On application',
      amount: SCHEME.applicationFee,
      paid: application.feePaid ? SCHEME.applicationFee : 0,
      note: 'Non-refundable',
    },
    {
      label: '50% deposit',
      due: formatDate(SCHEME.depositDueOn),
      amount: deposit,
      paid: paidToDeposit,
      note: 'Secures your position',
    },
    {
      label: 'Balance',
      due: formatDate(SCHEME.balanceDueOn),
      amount: application.amount - deposit,
      paid: paidToBalance,
      note: 'Temporary allocation after this',
    },
  ];

  return (
    <>
      <ul className="divide-y divide-line sm:hidden">
        {rows.map((row) => {
          const settled = row.paid >= row.amount;
          return (
            <li key={row.label} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-ink-soft">
                    {row.note} · due {row.due}
                  </p>
                </div>
                <span
                  className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                    settled ? 'bg-sage text-forest' : 'bg-gold-tint text-[#6f4d12]'
                  }`}
                >
                  {settled ? 'Paid' : 'Outstanding'}
                </span>
              </div>
              <dl className="mt-2 flex gap-6 text-xs">
                <div>
                  <dt className="text-ink-soft">Amount</dt>
                  <dd className="num mt-0.5 text-sm">{formatNaira(row.amount)}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Recorded</dt>
                  <dd className="num mt-0.5 text-sm">{formatNaira(row.paid)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
      <table className="ledger">
        <caption className="sr-only">Payment schedule for {application.reference}</caption>
        <thead>
          <tr>
            <th scope="col">Instalment</th>
            <th scope="col">Due</th>
            <th scope="col">Amount</th>
            <th scope="col">Recorded</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const settled = row.paid >= row.amount;
            return (
              <tr key={row.label}>
                <td>
                  <span className="block font-medium">{row.label}</span>
                  <span className="text-xs text-ink-soft">{row.note}</span>
                </td>
                <td className="whitespace-nowrap text-ink-soft">{row.due}</td>
                <td className="num whitespace-nowrap">{formatNaira(row.amount)}</td>
                <td className="num whitespace-nowrap text-ink-soft">{formatNaira(row.paid)}</td>
                <td>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                      settled ? 'bg-sage text-forest' : 'bg-gold-tint text-[#6f4d12]'
                    }`}
                  >
                    {settled ? 'Paid' : 'Outstanding'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

function EvidenceUpload({ application }: { application: ApplicationRecord }) {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();

  const outstanding = outstandingFor(application);
  const defaultKind: PaymentKind = application.paid === 0 ? 'deposit' : 'balance';
  const [kind, setKind] = useState<PaymentKind>(defaultKind);
  const [amount, setAmount] = useState<string>(String(instalmentGap(application, defaultKind)));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileKey, setFileKey] = useState(0);

  const mutation = useMutation({
    mutationFn: addEvidence,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['evidence'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ]);
      setFile(null);
      setFileKey((key) => key + 1);
      toast({
        title: 'Evidence attached',
        detail: 'The secretariat will verify it and record the payment date.',
      });
    },
    onError: (error: Error) => toast({ title: 'Could not attach the evidence', detail: error.message }),
  });

  if (outstanding === 0) {
    return (
      <p className="border-t border-line px-4 py-4 text-sm text-ink-soft">
        The full plot price is recorded against this application. Nothing further to attach unless the secretariat asks
        for a document.
      </p>
    );
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const next: Record<string, string> = {};
    const fileError = evidenceProblem(file);
    if (fileError) next.file = fileError;

    const value = Number(amount.replace(/,/g, ''));
    const amountError = paymentAmountProblem(value, outstanding);
    if (amountError) next.amount = amountError;

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    mutation.mutate({ application, kind, amount: value, file: file as File, actor: user.name });
  };

  return (
    <form onSubmit={submit} noValidate className="border-t border-line px-4 py-4">
      <h3 className="text-sm font-semibold">Attach payment evidence</h3>
      <p className="mt-1 text-xs text-ink-soft">
        A transfer receipt, bank alert or stamped teller. {EVIDENCE_TYPE_LABEL}, up to{' '}
        {formatFileSize(EVIDENCE_MAX_BYTES)}. Nothing is confirmed until the secretariat verifies it.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_10rem_1fr]">
        <Field label="Instalment" htmlFor="evidence-kind">
          <select
            id="evidence-kind"
            className="input"
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as PaymentKind;
              setKind(nextKind);
              setAmount(String(instalmentGap(application, nextKind)));
            }}
          >
            <option value="deposit">50% deposit</option>
            <option value="balance">Balance</option>
            <option value="application-fee">Application fee</option>
          </select>
        </Field>

        <Field label="Amount paid" htmlFor="evidence-amount" error={errors.amount}>
          <input
            id="evidence-amount"
            className={`input num${errors.amount ? ' input-invalid' : ''}`}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(errors.amount)}
          />
        </Field>

        <Field label="Evidence file" htmlFor="evidence-file" error={errors.file}>
          <input
            key={fileKey}
            id="evidence-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="input file:mr-3 file:rounded-sm file:border-0 file:bg-paper-3 file:px-2 file:py-1 file:text-xs file:font-semibold"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setErrors((current) => ({ ...current, file: '' }));
            }}
            aria-invalid={Boolean(errors.file)}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="num text-xs text-ink-soft">
          Outstanding on this application: {formatNaira(outstanding)}
        </p>
        <Button type="submit" variant="forest" disabled={mutation.isPending}>
          {mutation.isPending ? 'Attaching…' : 'Attach evidence'}
        </Button>
      </div>
    </form>
  );
}

function instalmentGap(application: ApplicationRecord, kind: PaymentKind): number {
  if (kind === 'application-fee') return application.feePaid ? 0 : SCHEME.applicationFee;
  if (kind === 'deposit') return Math.max(0, depositFor(application.amount) - application.paid);
  return Math.max(0, application.amount - Math.max(depositFor(application.amount), application.paid));
}

function ReviewControls({
  evidence,
  application,
}: {
  evidence: PaymentEvidence;
  application: ApplicationRecord;
}) {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: reviewEvidence,
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['evidence'] }),
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ]);
      setDecision(null);
      setNote('');
      toast({
        title: updated.status === 'verified' ? 'Payment verified and recorded' : 'Evidence rejected',
        detail:
          updated.status === 'verified'
            ? `${formatNaira(updated.amount)} added to ${application.reference}.`
            : 'The applicant can attach a replacement.',
      });
    },
    onError: (cause: Error) => toast({ title: 'Could not save the review', detail: cause.message }),
  });

  if (!decision) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="forest" className="text-xs" onClick={() => setDecision('verified')}>
          Verify payment
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setDecision('rejected')}>
          Reject evidence
        </Button>
      </div>
    );
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const problem = reviewNoteProblem(note, decision);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    mutation.mutate({ evidence, application, decision, note, actor: user.name });
  };

  return (
    <form onSubmit={submit} noValidate className="mt-2 rounded-sm border border-line bg-paper-2/70 p-3">
      <label htmlFor={`note-${evidence.id}`} className="field-label">
        {decision === 'verified' ? 'Verification note (optional)' : 'Reason for rejection'}
      </label>
      <textarea
        id={`note-${evidence.id}`}
        className={`input min-h-24${error ? ' input-invalid' : ''}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={
          decision === 'verified'
            ? 'UBA credit alert of ₦4,050,000 on 13 Nov, narration carries the ID number.'
            : 'The receipt shows a different amount and no narration.'
        }
        aria-invalid={Boolean(error)}
      />
      <p className="mt-1 text-xs text-ink-soft">
        This note is written to the audit trail with your name and the time.
      </p>
      {error ? (
        <p role="alert" className="field-error mt-1">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={decision === 'verified' ? 'forest' : 'primary'}
          className="text-xs"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : decision === 'verified' ? 'Confirm verification' : 'Confirm rejection'}
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => {
            setDecision(null);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EvidenceList({
  evidence,
  application,
  isAdmin,
}: {
  evidence: PaymentEvidence[];
  application: ApplicationRecord;
  isAdmin: boolean;
}) {
  if (evidence.length === 0) {
    return (
      <p className="border-t border-line px-4 py-4 text-sm text-ink-soft">
        No evidence attached yet. Upload the receipt for the deposit so the secretariat can confirm the payment and its
        date.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-t border-line">
      {evidence.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {KIND_LABEL[item.kind]} · {formatNaira(item.amount)}
              </p>
              <p className="num mt-0.5 break-words text-xs text-ink-soft">
                {item.fileName} · {formatFileSize(item.fileSize)} · attached {formatDateTime(item.uploadedAt)}
              </p>
              {item.preview ? (
                <a
                  href={item.preview}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
                >
                  Open the attachment
                </a>
              ) : item.fileType === 'application/pdf' ? (
                <p className="mt-1 text-xs text-ink-soft">PDF on file with the secretariat.</p>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${EVIDENCE_TONE[item.status]}`}>
                {item.status === 'pending' ? 'Awaiting verification' : item.status === 'verified' ? 'Verified' : 'Rejected'}
              </span>
              {item.reviewedAt ? (
                <span className="num text-[0.6875rem] text-ink-soft">
                  {item.reviewedBy} · {formatDateTime(item.reviewedAt)}
                </span>
              ) : null}
            </div>
          </div>

          {item.reviewNote ? (
            <p className="mt-2 rounded-sm border-l-2 border-forest/30 bg-paper-3/50 px-2.5 py-1.5 text-xs leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Audit note:</span> {item.reviewNote}
            </p>
          ) : null}

          {isAdmin && item.status === 'pending' ? (
            <ReviewControls evidence={item} application={application} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Application() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();

  const mineQuery = useQuery({
    queryKey: ['applications', user?.id ?? 'anonymous'],
    queryFn: () => listApplications(user?.id),
    enabled: Boolean(user),
  });
  const allQuery = useQuery({ queryKey: ['applications', 'all'], queryFn: () => listApplications() });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const current = mineQuery.data?.[0];
  const evidenceQuery = useQuery({
    queryKey: ['evidence', current?.id ?? 'none'],
    queryFn: () => listEvidence(current?.id),
    enabled: Boolean(current),
  });
  const auditQuery = useQuery({
    queryKey: ['audit', current?.id ?? 'none'],
    queryFn: () => listAudit(current?.id),
    enabled: Boolean(current),
  });

  const payment = useMutation({
    mutationFn: ({ application, amount }: { application: ApplicationRecord; amount: number }) =>
      user ? recordPayment(application, amount, user.name, 'Recorded from the application page.') : Promise.reject(new Error('No session')),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
        queryClient.invalidateQueries({ queryKey: ['tiers'] }),
      ]);
      toast({
        title: `Payment recorded on ${updated.reference}`,
        detail: `${formatNaira(updated.paid)} of ${formatNaira(updated.amount)} now recorded.`,
      });
    },
    onError: (error: Error) => toast({ title: 'Could not record the payment', detail: error.message }),
  });

  if (mineQuery.isLoading) return <LoadingBlock label="Opening your application…" />;
  if (mineQuery.isError) return <ErrorBlock message={mineQuery.error.message} onRetry={() => void mineQuery.refetch()} />;

  const applications = mineQuery.data ?? [];
  const currentApplication = applications[0];

  if (!currentApplication) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Gidan Daya" title="My application" />
        <EmptyState
          title="No application yet"
          body={`Applications close ${formatDate(SCHEME.closesOn)}. Choose a plot size and accept the conditions to start.`}
          action={
            <Link to="/app/apply" className="btn btn-primary">
              Apply for a plot
            </Link>
          }
        />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const policy = describePolicy(settingsQuery.data?.allocationPolicy ?? 'cadre-priority-same-day');
  const all = allQuery.data ?? [];
  const position = queuePosition(all, currentApplication, policy.id);
  const depositGap = Math.max(0, depositFor(currentApplication.amount) - currentApplication.paid);
  const balanceGap = Math.max(0, currentApplication.amount - currentApplication.paid);
  const evidence = evidenceQuery.data ?? [];
  const audit = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gidan Daya"
        title="My application"
        description={`${currentApplication.reference} · ${formatSqm(currentApplication.sizeSqm)} · submitted ${formatDate(currentApplication.createdAt)}`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                void exportApplicationPdf(currentApplication).catch((error: Error) =>
                  toast({ title: 'Could not build the statement', detail: error.message }),
                );
              }}
            >
              Download statement
            </Button>
            <Link to="/app/apply" className="btn btn-primary">
              Apply for another plot
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card-raised p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">Plot</p>
              <h2 className="mt-1 font-display text-[1.7rem] leading-none">{formatSqm(currentApplication.sizeSqm)}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {currentApplication.houseDesign === 'detached'
                  ? '4-bedroom detached duplex'
                  : '4-bedroom semi-detached duplex'}
              </p>
            </div>
            <ApplicationPill status={currentApplication.status} />
          </div>

          <StatusTrack status={currentApplication.status} />

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Plot price</dt>
              <dd className="num mt-1 text-sm font-semibold">{formatNaira(currentApplication.amount)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Recorded</dt>
              <dd className="num mt-1 text-sm font-semibold">{formatNaira(currentApplication.paid)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Outstanding</dt>
              <dd className="num mt-1 text-sm font-semibold text-clay-deep">{formatNaira(outstandingFor(currentApplication))}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Cadre priority</dt>
              <dd className="mt-1 text-sm font-semibold">{hasPriority(currentApplication.cadre) ? 'Yes' : 'Standard'}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-sm border border-line bg-paper-3/45 px-3 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Queue</p>
              <p className="num text-sm font-semibold text-forest">
                {position ? `Position ${position}` : 'Pending confirmation'}
              </p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {positionReason(currentApplication, policy.id)}
            </p>
            <p className="mt-1 text-[0.6875rem] text-ink-soft">
              Rule: {policy.label}.{' '}
              {isAdmin ? (
                <Link to="/app/settings" className="text-forest underline underline-offset-4">
                  Change it
                </Link>
              ) : null}
            </p>
          </div>

          {isAdmin && (depositGap > 0 || balanceGap > 0) ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                Secretariat · record a confirmed payment directly
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Prefer verifying an attached receipt; this records the payment without one.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {depositGap > 0 ? (
                  <Button
                    variant="forest"
                    disabled={payment.isPending}
                    onClick={() => payment.mutate({ application: currentApplication, amount: depositGap })}
                  >
                    Record 50% deposit ({formatNaira(depositGap)})
                  </Button>
                ) : null}
                {balanceGap > 0 ? (
                  <Button
                    variant="ghost"
                    disabled={payment.isPending}
                    onClick={() => payment.mutate({ application: currentApplication, amount: balanceGap })}
                  >
                    Record final balance ({formatNaira(balanceGap)})
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-[1.05rem]">Acceptance on record</h2>
            <p className="mt-1 text-xs text-ink-soft">
              {currentApplication.termsVersion} · accepted {formatDateTime(currentApplication.acceptedAt)}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {TERMS_CLAUSES.map((clause) => {
                const accepted = currentApplication.acceptedClauses.includes(clause.id);
                return (
                  <li key={clause.id} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5625rem] font-bold ${
                        accepted ? 'bg-forest text-paper' : 'border border-line text-ink-soft'
                      }`}
                    >
                      {accepted ? '✓' : '–'}
                    </span>
                    <span className={accepted ? 'text-ink' : 'text-ink-soft'}>
                      {clause.title}
                      {accepted ? '' : ' — not acknowledged'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">Allocation</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              <li>
                Position follows the confirmed payment date. A temporary allocation letter is issued after full
                payment; the permanent letter follows completion of the building to 100%.
              </li>
              <li>Title perfection costs — survey, registration, consent, ground rent — are the subscriber's.</li>
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">Need to change something?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Plot size and design changes are handled by the secretariat before allocation. Write to them quoting{' '}
              <span className="num">{currentApplication.reference}</span>.
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Refunds require a written request and only follow a resale, with penalties of up to 5%; infrastructure
              funds are non-refundable.
            </p>
          </section>
        </aside>
      </div>

      <section className="card-raised overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[1.05rem]">Payment evidence</h2>
          <p className="text-xs text-ink-soft">
            {isAdmin
              ? 'Verify each attachment against the project bank statement; verification records the payment and its date.'
              : 'Upload what the bank gave you. The secretariat verifies it before the payment is recorded.'}
          </p>
        </div>
        <EvidenceList evidence={evidence} application={currentApplication} isAdmin={isAdmin} />
        <EvidenceUpload application={currentApplication} />
      </section>

      <section className="card-raised overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[1.05rem]">Payment schedule</h2>
          <p className="text-xs text-ink-soft">
            Figures are the published rate of {formatNaira(SCHEME.pricePerSqm)} per sqm, infrastructure inclusive.
          </p>
        </div>
        <PaymentSchedule application={currentApplication} />
      </section>

      <section className="card-raised overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[1.05rem]">Audit trail</h2>
          <p className="text-xs text-ink-soft">
            Every submission, upload, verification and rule change, with the person and the time.
          </p>
        </div>
        <ol className="divide-y divide-line">
          {audit.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {event.action}
                  {event.applicationId === null ? (
                    <span className="ml-2 rounded-full bg-paper-3 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.06em] text-ink-soft">
                      Scheme-wide
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-soft">{event.note}</p>
              </div>
              <p className="num shrink-0 text-xs text-ink-soft">
                {event.actor} · {formatDateTime(event.at)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {applications.length > 1 ? (
        <section className="card-raised overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[1.05rem]">All my applications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger">
              <caption className="sr-only">All applications by this member</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Plot</th>
                  <th scope="col">Design</th>
                  <th scope="col">Price</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((item) => (
                  <tr key={item.id}>
                    <td className="num">{item.reference}</td>
                    <td className="num">{formatSqm(item.sizeSqm)}</td>
                    <td className="text-ink-soft">
                      {item.houseDesign === 'detached' ? 'Detached' : 'Semi-detached'}
                    </td>
                    <td className="num">{formatNaira(item.amount)}</td>
                    <td className="num text-ink-soft">{formatNaira(item.paid)}</td>
                    <td>
                      <span className="text-sm">{STATUS_LABEL[item.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
