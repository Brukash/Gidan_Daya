import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import { ErrorBlock, Kpi, LoadingBlock, PageHeader, Passbook, ProjectPill, SubscriptionPill } from '../components/ui';
import { listProjects, listSubscriptions } from '../data/repository';
import { SAMPLE_CYCLE, SAMPLE_MONTHLY } from '../data/seed';
import { describeProject, fundingPercent, remainingUnits, sumBy } from '../lib/funding';
import { daysUntil, formatCompactNaira, formatDate, formatNaira, plural } from '../lib/format';

function MonthlyChart() {
  const max = Math.max(...SAMPLE_MONTHLY.map((point) => point.amount));
  const description = SAMPLE_MONTHLY.map((point) => `${point.month}: ${formatNaira(point.amount)}`).join(', ');

  return (
    <div>
      <div className="flex h-36 items-end gap-2 sm:gap-3" role="img" aria-label={`Commitments by month. ${description}`}>
        {SAMPLE_MONTHLY.map((point) => {
          const height = Math.max(6, Math.round((point.amount / max) * 100));
          return (
            <div key={point.month} className="flex h-full flex-1 flex-col justify-end gap-1.5">
              <span className="num text-center text-[0.625rem] text-ink-soft">{formatCompactNaira(point.amount)}</span>
              <div className="relative w-full overflow-hidden rounded-t-[2px] bg-sage/70" style={{ height: `${height}%` }}>
                <div className="absolute inset-x-0 bottom-0 top-0 bg-forest/85" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {SAMPLE_MONTHLY.map((point) => (
          <span key={point.month} className="num flex-1 text-center text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
            {point.month}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Overview() {
  const { user } = useSession();
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const allSubsQuery = useQuery({ queryKey: ['subscriptions', 'all'], queryFn: () => listSubscriptions() });
  const mySubsQuery = useQuery({
    queryKey: ['subscriptions', user?.id ?? 'anonymous'],
    queryFn: () => listSubscriptions(user?.id),
    enabled: Boolean(user),
  });

  if (projectsQuery.isLoading || allSubsQuery.isLoading) return <LoadingBlock />;
  if (projectsQuery.isError) return <ErrorBlock message={projectsQuery.error.message} onRetry={() => void projectsQuery.refetch()} />;

  const projects = projectsQuery.data ?? [];
  const allSubs = allSubsQuery.data ?? [];
  const mySubs = mySubsQuery.data ?? [];

  const committed = sumBy(allSubs, (item) => item.amount);
  const collected = sumBy(allSubs, (item) => item.paid);
  const open = projects.filter((project) => {
    const state = describeProject(project).state;
    return state === 'open' || state === 'closing';
  });

  const mine = sumBy(mySubs, (item) => item.amount);
  const minePaid = sumBy(mySubs, (item) => item.paid);

  const upcoming = mySubs
    .filter((item) => item.nextDueOn !== null)
    .sort((a, b) => (a.nextDueOn ?? '').localeCompare(b.nextDueOn ?? ''));
  const nextDue = upcoming[0];

  const dueSoon = allSubs
    .filter((item) => item.status === 'due' && item.nextDueOn && daysUntil(item.nextDueOn) <= 30)
    .slice(0, 3);

  const recent = allSubs.slice(0, 4);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Cycle ${SAMPLE_CYCLE.label}`}
        title={`Good to see you, ${user?.name.split(' ')[0] ?? 'member'}.`}
        description={`Subscriptions for this cycle close ${formatDate(SAMPLE_CYCLE.closesOn)}. Figures below cover the whole cooperative's book.`}
        actions={
          <Link to="/app/projects" className="btn btn-primary">
            Subscribe to a project
          </Link>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Committed this cycle"
          value={formatCompactNaira(committed)}
          context={`${allSubs.length} ${plural(allSubs.length, 'subscription')} across ${projects.length} projects`}
        />
        <Kpi
          label="Collected"
          value={formatCompactNaira(collected)}
          context={`${formatNaira(Math.max(0, committed - collected))} still outstanding`}
        />
        <Kpi
          label="Open projects"
          value={String(open.length)}
          context={open.length === 1 ? 'One project accepting units' : `${open.length} projects accepting units`}
        />
        <Kpi
          label="Your next installment"
          value={nextDue?.nextDueOn ? formatCompactNaira(Math.max(0, nextDue.amount - nextDue.paid)) : '—'}
          context={nextDue?.nextDueOn ? `Due ${formatDate(nextDue.nextDueOn)}` : 'Nothing scheduled'}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="funding-heading" className="card-raised overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 id="funding-heading" className="text-[1.05rem]">
                Funding by project
              </h2>
              <p className="text-xs text-ink-soft">Units taken against units offered this cycle.</p>
            </div>
            <Link to="/app/projects" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
              All projects
            </Link>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="ledger">
              <caption className="sr-only">Funding progress by project</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Unit price</th>
                  <th scope="col" className="w-[30%]">
                    Funding
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const status = describeProject(project);
                  return (
                    <tr key={project.id}>
                      <td>
                        <Link to={`/app/projects/${project.id}`} className="block hover:underline">
                          <span className="num text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                            {project.code}
                          </span>
                          <span className="block font-medium">{project.name}</span>
                        </Link>
                      </td>
                      <td className="num whitespace-nowrap text-ink-soft">{formatNaira(project.unitPrice)}</td>
                      <td className="min-w-[9rem]">
                        <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                        <span className="num mt-1 block text-xs text-ink-soft">
                          {fundingPercent(project.unitsTaken, project.totalUnits)}% · {remainingUnits(project)} left
                        </span>
                      </td>
                      <td>
                        <ProjectPill status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line sm:hidden">
            {projects.map((project) => (
              <li key={project.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/app/projects/${project.id}`} className="min-w-0">
                    <span className="num block text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                      {project.code}
                    </span>
                    <span className="block font-medium leading-snug">{project.name}</span>
                  </Link>
                  <ProjectPill status={describeProject(project)} />
                </div>
                <div className="mt-2">
                  <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                  <p className="num mt-1 text-xs text-ink-soft">
                    {fundingPercent(project.unitsTaken, project.totalUnits)}% · {formatNaira(project.unitPrice)} per unit
                    · {remainingUnits(project)} left
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          <section aria-labelledby="mine-heading" className="card-raised p-4">
            <h2 id="mine-heading" className="text-[1.05rem]">
              Your commitments
            </h2>
            <p className="num mt-2 font-display text-[1.75rem] leading-none text-forest">{formatNaira(mine)}</p>
            <p className="mt-1.5 text-xs text-ink-soft">
              {formatNaira(minePaid)} paid · {formatNaira(Math.max(0, mine - minePaid))} outstanding
            </p>
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {mySubs.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.projectName}</span>
                    <span className="num block text-xs text-ink-soft">
                      {item.reference} · {item.units} {plural(item.units, 'unit')}
                    </span>
                  </span>
                  <SubscriptionPill status={item.status} />
                </li>
              ))}
              {mySubs.length === 0 ? <li className="py-3 text-sm text-ink-soft">No subscriptions yet.</li> : null}
            </ul>
            <Link
              to="/app/subscriptions"
              className="mt-3 inline-block text-sm font-medium text-forest underline-offset-4 hover:underline"
            >
              Open my subscriptions →
            </Link>
          </section>

          <section aria-labelledby="due-heading" className="card p-4">
            <h2 id="due-heading" className="text-[1.05rem]">
              Due within 30 days
            </h2>
            {dueSoon.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Nothing due in the next 30 days.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {dueSoon.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.memberName}</span>
                      <span className="num block text-xs text-ink-soft">{item.reference}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <span className="block">{formatNaira(item.amount - item.paid)}</span>
                      <span className="block text-xs text-clay-deep">
                        {item.nextDueOn ? formatDate(item.nextDueOn) : '—'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="chart-heading" className="card-raised p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="chart-heading" className="text-[1.05rem]">
                Commitments recorded by month
              </h2>
              <p className="text-xs text-ink-soft">Naira committed to projects, June to November 2026.</p>
            </div>
            <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[#6f4d12]">
              Sample data
            </span>
          </div>
          <MonthlyChart />
        </section>

        <section aria-labelledby="activity-heading" className="card p-4">
          <h2 id="activity-heading" className="text-[1.05rem]">
            Recent activity
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((item) => (
              <li key={item.id} className="py-2.5 text-sm">
                <p className="font-medium">
                  {item.memberName || 'Member'} subscribed {item.units} {plural(item.units, 'unit')}
                </p>
                <p className="num text-xs text-ink-soft">
                  {item.projectName} · {formatNaira(item.amount)} · {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
