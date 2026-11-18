import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  ApplicationPill,
  Button,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  useToast,
} from '../components/ui';
import { listApplications, recordPayment } from '../data/repository';
import { SCHEME } from '../data/seed';
import type { Application as ApplicationRecord, ApplicationStatus } from '../data/types';
import { depositFor, hasPriority, milestoneLabel, outstandingFor, STATUS_LABEL } from '../lib/allocations';
import { exportApplicationPdf } from '../lib/exports';
import { formatDate, formatNaira, formatSqm } from '../lib/format';

const STEPS: ApplicationStatus[] = ['reserved', 'deposit-paid', 'fully-paid', 'allocated'];

const STEP_LABEL: Record<ApplicationStatus, string> = {
  reserved: 'Application received',
  'deposit-paid': '50% deposit confirmed',
  'fully-paid': 'Full payment confirmed',
  allocated: 'Allocation letter issued',
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
    <div className="overflow-x-auto">
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
  );
}

export function Application() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['applications', user?.id ?? 'anonymous'],
    queryFn: () => listApplications(user?.id),
    enabled: Boolean(user),
  });

  const payment = useMutation({
    mutationFn: ({ application, amount }: { application: ApplicationRecord; amount: number }) =>
      recordPayment(application, amount),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['tiers'] }),
      ]);
      toast({
        title: `Payment recorded on ${updated.reference}`,
        detail: `${formatNaira(updated.paid)} of ${formatNaira(updated.amount)} now recorded.`,
      });
    },
    onError: (error: Error) => toast({ title: 'Could not record the payment', detail: error.message }),
  });

  if (query.isLoading) return <LoadingBlock label="Opening your application…" />;
  if (query.isError) return <ErrorBlock message={query.error.message} onRetry={() => void query.refetch()} />;

  const applications = query.data ?? [];
  const current = applications[0];

  if (!current) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Gidan Daya" title="My application" />
        <EmptyState
          title="No application yet"
          body={`Applications close ${formatDate(SCHEME.closesOn)}. Choose a plot size and pay the ${formatNaira(SCHEME.applicationFee)} fee to start.`}
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
  const depositGap = Math.max(0, depositFor(current.amount) - current.paid);
  const balanceGap = Math.max(0, current.amount - current.paid);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gidan Daya"
        title="My application"
        description={`${current.reference} · ${formatSqm(current.sizeSqm)} · submitted ${formatDate(current.createdAt)}`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                void exportApplicationPdf(current).catch((error: Error) =>
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
              <h2 className="mt-1 font-display text-[1.7rem] leading-none">{formatSqm(current.sizeSqm)}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {current.houseDesign === 'detached' ? '4-bedroom detached duplex' : '4-bedroom semi-detached duplex'}
              </p>
            </div>
            <ApplicationPill status={current.status} />
          </div>

          <StatusTrack status={current.status} />

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Plot price</dt>
              <dd className="num mt-1 text-sm font-semibold">{formatNaira(current.amount)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Recorded</dt>
              <dd className="num mt-1 text-sm font-semibold">{formatNaira(current.paid)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Outstanding</dt>
              <dd className="num mt-1 text-sm font-semibold text-clay-deep">{formatNaira(outstandingFor(current))}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Cadre priority</dt>
              <dd className="mt-1 text-sm font-semibold">{hasPriority(current.cadre) ? 'Yes' : 'Standard'}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-ink-soft">{milestoneLabel(current)}</p>

          {isAdmin && (depositGap > 0 || balanceGap > 0) ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                Secretariat · record a bank payment
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {depositGap > 0 ? (
                  <Button
                    variant="forest"
                    disabled={payment.isPending}
                    onClick={() => payment.mutate({ application: current, amount: depositGap })}
                  >
                    Record 50% deposit ({formatNaira(depositGap)})
                  </Button>
                ) : null}
                {balanceGap > 0 ? (
                  <Button
                    variant="ghost"
                    disabled={payment.isPending}
                    onClick={() => payment.mutate({ application: current, amount: balanceGap })}
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
            <h2 className="text-[1.05rem]">Allocation</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              <li>
                Position follows payment confirmation, first-come. Members from Clerk to Assistant Manager rank ahead
                of other cadres for the same payment date.
              </li>
              <li>
                A temporary allocation letter is issued after full payment; the permanent letter follows completion of
                the building to 100%.
              </li>
              <li>Title perfection costs — survey, registration, consent, ground rent — are the subscriber's.</li>
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">Need to change something?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Plot size and design changes are handled by the secretariat before allocation. Write to them quoting{' '}
              <span className="num">{current.reference}</span>.
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
          <h2 className="text-[1.05rem]">Payment schedule</h2>
          <p className="text-xs text-ink-soft">
            Figures are the published rate of {formatNaira(SCHEME.pricePerSqm)} per sqm, infrastructure inclusive.
          </p>
        </div>
        <PaymentSchedule application={current} />
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
