import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  Button,
  EmptyState,
  ErrorBlock,
  Kpi,
  LoadingBlock,
  PageHeader,
  Passbook,
  PlotsLeft,
  useToast,
} from '../components/ui';
import { getSettings, listApplications, listMembers, listTiers } from '../data/repository';
import { SCHEME } from '../data/seed';
import {
  STATUS_LABEL,
  allocationOrder,
  allocationPercent,
  describePolicy,
  hasPriority,
  remainingPlots,
  schemeTotals,
  sumBy,
} from '../lib/allocations';
import { exportAllocationXlsx, exportRegisterPdf } from '../lib/exports';
import { formatCompactNaira, formatDate, formatNaira, formatSqm, plural } from '../lib/format';

export function Reports() {
  const { user } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);

  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers });
  const appsQuery = useQuery({ queryKey: ['applications', 'all'], queryFn: () => listApplications() });
  const membersQuery = useQuery({ queryKey: ['members'], queryFn: listMembers });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const tiers = tiersQuery.data ?? [];
  const apps = appsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const totals = schemeTotals(tiers, SCHEME);
  const policy = describePolicy(settingsQuery.data?.allocationPolicy ?? 'cadre-priority-same-day');
  const queue = allocationOrder(apps, policy.id);
  const confirmedQueue = queue.filter((item) => item.confirmedOn !== null);
  const committed = sumBy(apps, (item) => item.amount);
  const collected = sumBy(apps, (item) => item.paid);
  const outstanding = Math.max(0, committed - collected);
  const fees = apps.filter((item) => item.feePaid).length * SCHEME.applicationFee;
  const priorityCount = apps.filter((item) => hasPriority(item.cadre)).length;

  const loading = tiersQuery.isLoading || appsQuery.isLoading;

  const onRegister = async () => {
    setBusy('pdf');
    try {
      await exportRegisterPdf(apps, tiers);
      toast({ title: 'Register downloaded', detail: `${apps.length} ${plural(apps.length, 'application')} in the PDF.` });
    } catch (cause) {
      toast({ title: 'Could not build the PDF', detail: cause instanceof Error ? cause.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  };

  const onWorkbook = async () => {
    setBusy('xlsx');
    try {
      await exportAllocationXlsx(tiers, apps, members);
      toast({ title: 'Workbook downloaded', detail: 'Three sheets: plot availability, applications, applicants.' });
    } catch (cause) {
      toast({ title: 'Could not build the workbook', detail: cause instanceof Error ? cause.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Secretariat" title="Allocation report" description="Restricted to secretariat accounts." />
        <EmptyState
          title="This report is for the secretariat"
          body="It totals every applicant's payments, so members cannot open it. Your own figures are on the application page."
          action={
            <Link to="/app/application" className="btn btn-forest">
              My application
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gidan Daya"
        title="Allocation report"
        description={`${totals.plots} plots · ${formatNaira(SCHEME.pricePerSqm)} per sqm · ${totals.squareMetres.toLocaleString('en-NG')} sqm at ${formatCompactNaira(totals.value)}. Totals are derived, not typed in.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => void onRegister()} disabled={busy !== null || apps.length === 0}>
              {busy === 'pdf' ? 'Building PDF…' : 'Register (PDF)'}
            </Button>
            <Button variant="forest" onClick={() => void onWorkbook()} disabled={busy !== null}>
              {busy === 'xlsx' ? 'Building workbook…' : 'Allocation workbook (Excel)'}
            </Button>
          </>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {tiersQuery.isError ? (
        <ErrorBlock message={tiersQuery.error.message} onRetry={() => void tiersQuery.refetch()} />
      ) : null}

      {!loading && !tiersQuery.isError ? (
        <>
          <section aria-label="Scheme totals" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi
              label="Applications"
              value={String(apps.length)}
              context={`${priorityCount} from priority cadres`}
            />
            <Kpi label="Committed" value={formatCompactNaira(committed)} context="Plot value on all applications" />
            <Kpi label="Collected" value={formatCompactNaira(collected)} context={`Fees recorded ${formatCompactNaira(fees)}`} />
            <Kpi
              label="Outstanding"
              value={formatCompactNaira(outstanding)}
              context={`Balance falls due ${formatDate(SCHEME.balanceDueOn)}`}
            />
          </section>

          <section aria-labelledby="breakdown-heading" className="card-raised overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 id="breakdown-heading" className="text-[1.05rem]">
                Breakdown by plot size
              </h2>
              <p className="text-xs text-ink-soft">
                Allocation counts include applications made in this browser while the app runs on sample data.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Applications and payments per plot size</caption>
                <thead>
                  <tr>
                    <th scope="col">Plot size</th>
                    <th scope="col">Plots</th>
                    <th scope="col" className="w-[20%]">
                      Allocated
                    </th>
                    <th scope="col">Applications</th>
                    <th scope="col">Price</th>
                    <th scope="col">Committed</th>
                    <th scope="col">Collected</th>
                    <th scope="col">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => {
                    const own = apps.filter((item) => item.sizeSqm === tier.sizeSqm);
                    return (
                      <tr key={tier.id}>
                        <td className="font-medium">{formatSqm(tier.sizeSqm)}</td>
                        <td className="num text-ink-soft">{tier.totalPlots}</td>
                        <td className="min-w-[8rem]">
                          <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                          <span className="num mt-1 block text-xs text-ink-soft">
                            {allocationPercent(tier.allocated, tier.totalPlots)}% allocated
                          </span>
                        </td>
                        <td className="num">{own.length}</td>
                        <td className="num whitespace-nowrap">{formatNaira(tier.sizeSqm * SCHEME.pricePerSqm)}</td>
                        <td className="num whitespace-nowrap">{formatNaira(sumBy(own, (item) => item.amount))}</td>
                        <td className="num whitespace-nowrap">{formatNaira(sumBy(own, (item) => item.paid))}</td>
                        <td>
                          <PlotsLeft remaining={remainingPlots(tier)} total={tier.totalPlots} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="queue-heading" className="card-raised overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 id="queue-heading" className="text-[1.05rem]">
                  Allocation queue
                </h2>
                <p className="text-xs text-ink-soft">
                  {policy.label} — {policy.summary}
                </p>
              </div>
              <Link to="/app/settings" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
                Change the rule
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Allocation order under the current rule</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Applicant</th>
                    <th scope="col">Cadre</th>
                    <th scope="col">Plot</th>
                    <th scope="col">Deposit confirmed</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => {
                    const position = item.confirmedOn ? confirmedQueue.indexOf(item) + 1 : null;
                    return (
                      <tr key={item.id}>
                        <td className="num text-ink-soft">{position ?? '—'}</td>
                        <td>
                          <span className="block font-medium">{item.memberName}</span>
                          <span className="num block text-xs text-ink-soft">{item.memberNumber}</span>
                        </td>
                        <td>
                          <span className="block">{item.cadre}</span>
                          {hasPriority(item.cadre) ? (
                            <span className="text-xs text-ink-soft">Priority cadre</span>
                          ) : null}
                        </td>
                        <td className="num whitespace-nowrap">{formatSqm(item.sizeSqm)}</td>
                        <td className="num whitespace-nowrap text-ink-soft">
                          {item.confirmedOn ? formatDate(item.confirmedOn) : 'Awaiting confirmation'}
                        </td>
                        <td>
                          <span className="text-xs">{STATUS_LABEL[item.status]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-ink-soft">
            Exports are generated in the browser from the data above. No file leaves the device. Figures are sample data
            until this deployment is connected to Supabase.
          </p>
        </>
      ) : null}
    </div>
  );
}
