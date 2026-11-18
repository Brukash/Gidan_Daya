import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  ApplicationPill,
  ErrorBlock,
  Kpi,
  LoadingBlock,
  PageHeader,
  Passbook,
  TierPill,
} from '../components/ui';
import { getSettings, listApplications, listTiers } from '../data/repository';
import { SCHEME, SITE_VISIT } from '../data/seed';
import {
  allocationPercent,
  describePolicy,
  describeTier,
  milestoneLabel,
  outstandingFor,
  positionReason,
  priceForPlot,
  queuePosition,
  remainingPlots,
  schemeTotals,
  sumBy,
} from '../lib/allocations';
import { daysUntil, formatCompactNaira, formatDate, formatNaira, formatSqm, plural } from '../lib/format';

export function Overview() {
  const { user } = useSession();
  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers });
  const mineQuery = useQuery({
    queryKey: ['applications', user?.id ?? 'anonymous'],
    queryFn: () => listApplications(user?.id),
    enabled: Boolean(user),
  });
  const allQuery = useQuery({ queryKey: ['applications', 'all'], queryFn: () => listApplications() });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  if (tiersQuery.isLoading || mineQuery.isLoading) return <LoadingBlock />;
  if (tiersQuery.isError) {
    return <ErrorBlock message={tiersQuery.error.message} onRetry={() => void tiersQuery.refetch()} />;
  }

  const tiers = tiersQuery.data ?? [];
  const mine = mineQuery.data ?? [];
  const all = allQuery.data ?? [];
  const totals = schemeTotals(tiers, SCHEME);

  const latest = mine[0];
  const policy = describePolicy(settingsQuery.data?.allocationPolicy ?? 'cadre-priority-same-day');
  const position = latest ? queuePosition(all, latest, policy.id) : null;
  const collected = sumBy(all, (item) => item.paid);
  const committed = sumBy(all, (item) => item.amount);

  const milestones = [
    { label: 'Applications close', date: SCHEME.closesOn, note: 'No applications after this date' },
    { label: '50% deposit due', date: SCHEME.depositDueOn, note: 'Half of the plot price' },
    { label: 'Balance due', date: SCHEME.balanceDueOn, note: 'Temporary allocation after this' },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Gidan Daya · CBN Staff Cooperative Estate"
        title={`Good to see you, ${user?.name.split(' ')[0] ?? 'member'}.`}
        description={`Plots from 200 to 500 sqm at ${formatNaira(SCHEME.pricePerSqm)} per sqm. Applications close ${formatDate(SCHEME.closesOn)}.`}
        actions={
          <Link to="/apply" className="btn btn-primary">
            Apply for a plot
          </Link>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Plots available"
          value={String(totals.remaining)}
          context={`of ${totals.plots} plots in this scheme`}
        />
        <Kpi
          label="Allocated"
          value={`${allocationPercent(totals.allocated, totals.plots)}%`}
          context={`${totals.allocated} plots taken`}
        />
        <Kpi
          label="Your application"
          value={latest ? formatSqm(latest.sizeSqm) : 'None yet'}
          context={latest ? latest.reference : 'Start one before 30 Dec 2026'}
        />
        <Kpi
          label="Next milestone"
          value={latest ? formatCompactNaira(outstandingFor(latest)) : formatCompactNaira(20_000)}
          context={latest ? milestoneLabel(latest) : 'Application fee'}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="availability-heading" className="card-raised overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 id="availability-heading" className="text-[1.05rem]">
                Plot availability
              </h2>
              <p className="text-xs text-ink-soft">Allocation is first-come, by payment confirmation.</p>
            </div>
            <Link to="/app/plots" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
              All sizes
            </Link>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="ledger">
              <caption className="sr-only">Plot sizes and availability</caption>
              <thead>
                <tr>
                  <th scope="col">Plot size</th>
                  <th scope="col">Plot price</th>
                  <th scope="col" className="w-[30%]">
                    Allocated
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const status = describeTier(tier, SCHEME.closesOn);
                  return (
                    <tr key={tier.id}>
                      <td>
                        <Link to={`/apply?size=${tier.sizeSqm}`} className="block hover:underline">
                          <span className="block font-medium">{formatSqm(tier.sizeSqm)}</span>
                          <span className="num text-xs text-ink-soft">
                            {remainingPlots(tier)} of {tier.totalPlots} left
                          </span>
                        </Link>
                      </td>
                      <td className="num whitespace-nowrap">
                        {formatNaira(priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm))}
                      </td>
                      <td className="min-w-[9rem]">
                        <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                        <span className="num mt-1 block text-xs text-ink-soft">
                          {allocationPercent(tier.allocated, tier.totalPlots)}% taken
                        </span>
                      </td>
                      <td>
                        <TierPill status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line sm:hidden">
            {tiers.map((tier) => {
              const status = describeTier(tier, SCHEME.closesOn);
              return (
                <li key={tier.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/apply?size=${tier.sizeSqm}`} className="min-w-0">
                      <span className="block font-medium">{formatSqm(tier.sizeSqm)}</span>
                      <span className="num block text-xs text-ink-soft">
                        {remainingPlots(tier)} of {tier.totalPlots} left
                      </span>
                    </Link>
                    <TierPill status={status} />
                  </div>
                  <div className="mt-2">
                    <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                    <p className="num mt-1 text-xs text-ink-soft">
                      {formatNaira(priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm))} per plot
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-5">
          <section aria-labelledby="mine-heading" className="card-raised p-4">
            <h2 id="mine-heading" className="text-[1.05rem]">
              Your application
            </h2>
            {latest ? (
              <>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="num font-display text-[1.6rem] leading-none text-forest">{formatSqm(latest.sizeSqm)}</p>
                  <ApplicationPill status={latest.status} />
                </div>
                <p className="num mt-1.5 text-xs text-ink-soft">
                  {latest.reference} · {latest.houseDesign === 'detached' ? 'Detached duplex' : 'Semi-detached duplex'}
                </p>
                <p className="mt-1.5 rounded-sm bg-paper-3/60 px-2 py-1.5 text-xs leading-snug text-ink-soft">
                  <span className="font-semibold text-ink">
                    {position ? `Queue position ${position}` : 'Queue position pending'}
                  </span>{' '}
                  · {policy.label}. {positionReason(latest, policy.id)}
                </p>
                <dl className="mt-3 border-t border-line pt-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3 py-1">
                    <dt className="text-ink-soft">Plot price</dt>
                    <dd className="num">{formatNaira(latest.amount)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-1">
                    <dt className="text-ink-soft">Paid</dt>
                    <dd className="num">{formatNaira(latest.paid)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-1">
                    <dt className="text-ink-soft">Outstanding</dt>
                    <dd className="num font-semibold">{formatNaira(outstandingFor(latest))}</dd>
                  </div>
                </dl>
                <Link
                  to="/app/application"
                  className="mt-3 inline-block text-sm font-medium text-forest underline-offset-4 hover:underline"
                >
                  Open my application →
                </Link>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-ink-soft">
                  No application on record for your membership number yet. Choose a plot size and pay the ₦20,000 fee
                  to start.
                </p>
                <Link to="/apply" className="btn btn-forest mt-3 w-full text-sm">
                  Apply for a plot
                </Link>
              </div>
            )}
          </section>

          <section aria-labelledby="dates-heading" className="card p-4">
            <h2 id="dates-heading" className="text-[1.05rem]">
              Key dates
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {milestones.map((milestone) => {
                const days = daysUntil(milestone.date);
                return (
                  <li key={milestone.label} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="block font-medium">{milestone.label}</span>
                      <span className="text-xs text-ink-soft">{milestone.note}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <span className="block">{formatDate(milestone.date)}</span>
                      <span className={`block text-xs ${days < 0 ? 'text-clay-deep' : 'text-ink-soft'}`}>
                        {days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
              Site visits {formatDate(SITE_VISIT.dates[0])} and {formatDate(SITE_VISIT.dates[1])} at {SITE_VISIT.time}.
            </p>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="register-heading" className="card-raised overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 id="register-heading" className="text-[1.05rem]">
              Recent applications
            </h2>
            <p className="text-xs text-ink-soft">Sample applicants, ordered newest first.</p>
          </div>
          <ul className="divide-y divide-line">
            {all.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.memberName}</p>
                  <p className="num text-xs text-ink-soft">
                    {formatSqm(item.sizeSqm)} · {item.reference} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="num text-sm">{formatNaira(item.amount)}</span>
                  <ApplicationPill status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="book-heading" className="card p-4">
          <h2 id="book-heading" className="text-[1.05rem]">
            The scheme in figures
          </h2>
          <dl className="mt-2 divide-y divide-line text-sm">
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-ink-soft">Plots</dt>
              <dd className="num">{totals.plots}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-ink-soft">Square metres</dt>
              <dd className="num">{totals.squareMetres.toLocaleString('en-NG')}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-ink-soft">Value at published rate</dt>
              <dd className="num">{formatCompactNaira(totals.value)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-ink-soft">Committed by applicants</dt>
              <dd className="num">{formatCompactNaira(committed)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-ink-soft">Collected</dt>
              <dd className="num">{formatCompactNaira(collected)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-soft">
            {all.length} {plural(all.length, 'application')} on record. Figures are sample data until Supabase is
            connected.
          </p>
        </section>
      </div>
    </div>
  );
}
