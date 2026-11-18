import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  Button,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Passbook,
  ProjectPill,
  SubscriptionPill,
  useToast,
} from '../components/ui';
import { createSubscription, listProjects, listSubscriptions } from '../data/repository';
import { describeProject, fundingPercent, remainingUnits, sumBy } from '../lib/funding';
import { formatDate, formatNaira, plural } from '../lib/format';
import { MAX_UNITS_PER_SUBSCRIPTION, MIN_UNITS, subscriptionProblem } from '../lib/validation';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const subsQuery = useQuery({ queryKey: ['subscriptions', 'all'], queryFn: () => listSubscriptions() });

  const [units, setUnits] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const project = projectsQuery.data?.find((item) => item.id === projectId);

  const mutation = useMutation({
    mutationFn: async (count: number) => {
      if (!project || !user) throw new Error('You need to be signed in to subscribe.');
      return createSubscription({
        project,
        memberId: user.id,
        memberName: user.name,
        units: count,
      });
    },
    onSuccess: (created) => {
      toast({
        title: `Subscription confirmed · ${created.reference}`,
        detail: `${created.units} ${plural(created.units, 'unit')} on ${created.projectName} for ${formatNaira(created.amount)}.`,
      });
      setUnits('1');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  if (projectsQuery.isLoading) return <LoadingBlock label="Opening the project…" />;
  if (projectsQuery.isError) {
    return <ErrorBlock message={projectsQuery.error.message} onRetry={() => void projectsQuery.refetch()} />;
  }

  if (!project) {
    return (
      <EmptyState
        title="That project is not on the register"
        body="It may have been withdrawn, or the link may be wrong. Every project this cycle is listed under Projects."
        action={
          <Link to="/app/projects" className="btn btn-forest">
            Back to projects
          </Link>
        }
      />
    );
  }

  const status = describeProject(project);
  const left = remainingUnits(project);
  const percent = fundingPercent(project.unitsTaken, project.totalUnits);
  const parsedUnits = Number(units);
  const amount = Number.isFinite(parsedUnits) ? parsedUnits * project.unitPrice : 0;

  const projectSubs = (subsQuery.data ?? []).filter((item) => item.projectId === project.id);
  const mySubs = projectSubs.filter((item) => item.memberId === user?.id);
  const myUnits = sumBy(mySubs, (item) => item.units);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = subscriptionProblem(parsedUnits, left);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    mutation.mutate(parsedUnits);
  };

  return (
    <div className="space-y-6">
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        ← All projects
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-6">
          <header className="border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {project.code} · {project.category}
              </span>
              <ProjectPill status={status} />
            </div>
            <h1 className="mt-2 text-[1.85rem] leading-[1.06] sm:text-[2.25rem]">{project.name}</h1>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-soft">{project.summary}</p>
          </header>

          <section aria-label="Funding position" className="card-raised p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.09em] text-ink-soft">Funding position</p>
                <p className="num mt-1 font-display text-[2rem] leading-none text-forest">{percent}%</p>
              </div>
              <p className="num text-sm text-ink-soft">
                {project.unitsTaken} of {project.totalUnits} units taken
              </p>
            </div>
            <div className="mt-4">
              <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} size="lg" label={`${percent}% funded`} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Unit price</dt>
                <dd className="num mt-0.5 font-semibold">{formatNaira(project.unitPrice)}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Units left</dt>
                <dd className="num mt-0.5 font-semibold">{left}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Subscriptions open</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(project.opensOn)}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Closes</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(project.closesOn)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="register-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="register-heading" className="text-[1.15rem]">
                Members on this project
              </h2>
              <p className="text-xs text-ink-soft">
                {projectSubs.length} {plural(projectSubs.length, 'subscription')}
              </p>
            </div>

            {projectSubs.length === 0 ? (
              <EmptyState
                title="No subscriptions yet"
                body="This project is still at zero. Members who subscribe first appear here with their reference and units."
              />
            ) : (
              <div className="overflow-hidden rounded-sm border border-line bg-paper-2">
                <div className="overflow-x-auto">
                  <table className="ledger">
                    <caption className="sr-only">Subscriptions recorded against this project</caption>
                    <thead>
                      <tr>
                        <th scope="col">Member</th>
                        <th scope="col">Reference</th>
                        <th scope="col">Units</th>
                        <th scope="col">Committed</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectSubs.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium">{item.memberName || 'Member'}</td>
                          <td className="num text-ink-soft">{item.reference}</td>
                          <td className="num">{item.units}</td>
                          <td className="num">{formatNaira(item.amount)}</td>
                          <td>
                            <SubscriptionPill status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20">
          <div className="card-raised p-5">
            <h2 className="text-[1.15rem]">Take units</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {left === 0
                ? 'Every unit on this project has been taken.'
                : `${left} ${plural(left, 'unit')} remain. Between ${MIN_UNITS} and ${MAX_UNITS_PER_SUBSCRIPTION} per subscription.`}
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <Field
                label="Units"
                htmlFor="units"
                hint={`${formatNaira(project.unitPrice)} per unit · ${formatNaira(amount || 0)} total`}
                error={error ?? undefined}
              >
                <input
                  id="units"
                  name="units"
                  type="number"
                  inputMode="numeric"
                  min={MIN_UNITS}
                  max={Math.min(MAX_UNITS_PER_SUBSCRIPTION, Math.max(left, 1))}
                  step={1}
                  className="input"
                  value={units}
                  onChange={(event) => {
                    setUnits(event.target.value);
                    setError(null);
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'units-error' : 'units-hint'}
                  disabled={left === 0}
                />
              </Field>

              <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Amount due</dt>
                  <dd className="num font-semibold">{formatNaira(Math.max(0, amount))}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">First installment</dt>
                  <dd className="num text-ink-soft">30 days after confirmation</dd>
                </div>
                {myUnits > 0 ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-soft">You already hold</dt>
                    <dd className="num">
                      {myUnits} {plural(myUnits, 'unit')}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <Button type="submit" className="w-full" disabled={mutation.isPending || left === 0 || !user}>
                {mutation.isPending ? 'Confirming…' : left === 0 ? 'Fully subscribed' : 'Confirm subscription'}
              </Button>

              {!user ? (
                <p className="text-xs text-ink-soft">
                  <Link to="/signin" className="underline underline-offset-2">
                    Sign in
                  </Link>{' '}
                  to take units.
                </p>
              ) : null}
            </form>
          </div>

          <p className="mt-3 px-1 text-xs leading-relaxed text-ink-soft">
            Capacity is verified again on submit. If another member takes the last units first, the subscription is
            refused rather than over-allocated.
          </p>
        </aside>
      </div>
    </div>
  );
}
