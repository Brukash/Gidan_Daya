import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorBlock, LoadingBlock, PageHeader, Passbook, PlotsLeft, TierPill } from '../components/ui';
import { listTiers } from '../data/repository';
import { SCHEME } from '../data/seed';
import {
  allocationPercent,
  depositFor,
  describeTier,
  priceForPlot,
  remainingPlots,
  schemeTotals,
} from '../lib/allocations';
import { formatNaira, formatSqm } from '../lib/format';

export function Plots() {
  const query = useQuery({ queryKey: ['tiers'], queryFn: listTiers });

  if (query.isLoading) return <LoadingBlock label="Reading plot availability…" />;
  if (query.isError) return <ErrorBlock message={query.error.message} onRetry={() => void query.refetch()} />;

  const tiers = query.data ?? [];
  const totals = schemeTotals(tiers, SCHEME);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gidan Daya"
        title="Plot availability"
        description={`${totals.remaining} of ${totals.plots} plots remain. Allocation is first-come, first-served, determined by payment confirmation — with priority for Clerk to Assistant Manager cadre.`}
        actions={
          <Link to="/apply" className="btn btn-primary">
            Start subscription
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => {
          const status = describeTier(tier, SCHEME.closesOn);
          const price = priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm);
          const soldOut = remainingPlots(tier) === 0;

          return (
            <section key={tier.id} className="card-raised flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-[1.4rem] leading-none">{formatSqm(tier.sizeSqm)}</h2>
                <TierPill status={status} />
              </div>

              <PlotsLeft remaining={remainingPlots(tier)} total={tier.totalPlots} className="mt-3" />

              <p className="num mt-1.5 font-display text-[1.15rem] text-forest">{formatNaira(price)}</p>
              <p className="num text-xs text-ink-soft">50% deposit {formatNaira(depositFor(price))}</p>

              <div className="mt-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Allocated</span>
                  <span className="num text-xs font-semibold text-forest">
                    {allocationPercent(tier.allocated, tier.totalPlots)}%
                  </span>
                </div>
                <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                <p className="num mt-1.5 text-xs text-ink-soft">
                  {tier.allocated} of {tier.totalPlots} plots taken
                </p>
              </div>

              <div className="mt-auto pt-4">
                {soldOut ? (
                  <button type="button" className="btn btn-ghost w-full text-sm" disabled>
                    Fully allocated
                  </button>
                ) : (
                  <Link to={`/apply?size=${tier.sizeSqm}`} className="btn btn-forest w-full text-sm">
                    Start subscription
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="hidden overflow-hidden rounded-sm border border-line bg-paper-2 sm:block">
        <div className="overflow-x-auto">
          <table className="ledger">
            <caption className="sr-only">Plot inventory and pricing</caption>
            <thead>
              <tr>
                <th scope="col">Plot size</th>
                <th scope="col">Plots</th>
                <th scope="col">Allocated</th>
                <th scope="col">Remaining</th>
                <th scope="col">Price at {formatNaira(SCHEME.pricePerSqm)}/sqm</th>
                <th scope="col">50% deposit</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const price = priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm);
                return (
                  <tr key={tier.id}>
                    <td className="font-medium">{formatSqm(tier.sizeSqm)}</td>
                    <td className="num text-ink-soft">{tier.totalPlots}</td>
                    <td className="num text-ink-soft">{tier.allocated}</td>
                    <td>
                      <PlotsLeft remaining={remainingPlots(tier)} total={tier.totalPlots} size="sm" />
                    </td>
                    <td className="num">{formatNaira(price)}</td>
                    <td className="num text-ink-soft">{formatNaira(depositFor(price))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="max-w-3xl text-xs leading-relaxed text-ink-soft">
        Plot sizes are subject to the size allocated after survey. Additional square metres are payable by the
        subscriber at the published rate; payments in excess of the allotted size are refunded unconditionally.
      </p>
    </div>
  );
}
