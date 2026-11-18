import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
import { getSettings, listApplications, listAudit, saveSettings } from '../data/repository';
import type { AllocationPolicy } from '../data/types';
import { POLICY_OPTIONS, allocationOrder, describePolicy } from '../lib/allocations';
import { formatDate, formatDateTime, formatSqm } from '../lib/format';

export function Settings() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const applicationsQuery = useQuery({ queryKey: ['applications', 'all'], queryFn: () => listApplications() });
  const auditQuery = useQuery({ queryKey: ['audit', 'all'], queryFn: () => listAudit() });

  const current = settingsQuery.data?.allocationPolicy ?? 'cadre-priority-same-day';
  const [chosen, setChosen] = useState<AllocationPolicy | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data && chosen === null) setChosen(settingsQuery.data.allocationPolicy);
  }, [settingsQuery.data, chosen]);

  const save = useMutation({
    mutationFn: (policy: AllocationPolicy) =>
      user ? saveSettings(policy, user.name, note.trim() || `Allocation rule set to ${describePolicy(policy).label}.`) : Promise.reject(new Error('No session')),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ]);
      setNote('');
      toast({ title: 'Allocation rule updated', detail: 'The change is recorded in the audit trail.' });
    },
    onError: (cause: Error) => toast({ title: 'Could not save the rule', detail: cause.message }),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Secretariat" title="Scheme settings" description="Restricted to secretariat accounts." />
        <EmptyState
          title="Only the secretariat sets the allocation rule"
          body="Your application page shows the rule currently in force and where you sit in the queue."
          action={
            <Link to="/app/application" className="btn btn-forest">
              My application
            </Link>
          }
        />
      </div>
    );
  }

  if (settingsQuery.isLoading || applicationsQuery.isLoading) {
    return <LoadingBlock label="Reading the scheme settings…" />;
  }
  if (settingsQuery.isError) {
    return <ErrorBlock message={settingsQuery.error.message} onRetry={() => void settingsQuery.refetch()} />;
  }

  const applications = applicationsQuery.data ?? [];
  const active = chosen ?? current;
  const dirty = active !== current;
  const policy = describePolicy(active);
  const preview = allocationOrder(applications, active).slice(0, 6);
  const lastChange = (auditQuery.data ?? []).find((event) => event.action === 'Allocation rule set');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (note.trim().length > 500) {
      setError('Keep the note under 500 characters.');
      return;
    }
    setError(null);
    save.mutate(active);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Secretariat"
        title="Scheme settings"
        description="The call says allocation is first-come by payment confirmation, and that lower cadres get priority. Both cannot be absolute, so the rule is a setting rather than a hidden assumption."
      />

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <fieldset className="card-raised p-4 sm:p-5">
            <legend className="text-[1.05rem] font-semibold">Allocation rule</legend>
            <p className="mt-1 text-xs text-ink-soft">
              The rule orders the queue used by reports and by each applicant's position. It does not move an
              application ahead of a confirmed deposit under the first-come option.
            </p>

            <div className="mt-4 space-y-2">
              {POLICY_OPTIONS.map((option) => {
                const selected = active === option.id;
                return (
                  <label
                    key={option.id}
                    className={`block cursor-pointer rounded-sm border px-3.5 py-3 transition-colors ${
                      selected ? 'border-forest bg-sage/40' : 'border-line bg-paper-2 hover:border-forest/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="allocation-policy"
                        className="mt-1 accent-forest"
                        value={option.id}
                        checked={selected}
                        onChange={() => {
                          setChosen(option.id);
                          setError(null);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold">{option.label}</span>
                          {option.id === 'cadre-priority-same-day' ? (
                            <span className="rounded-full bg-paper px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                              Default
                            </span>
                          ) : null}
                          {option.id === current ? (
                            <span className="rounded-full bg-forest px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-paper">
                              In force
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink">{option.summary}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{option.detail}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4">
              <label htmlFor="rule-note" className="field-label">
                Why the change? (written to the audit trail)
              </label>
              <textarea
                id="rule-note"
                className={`input min-h-24${error ? ' input-invalid' : ''}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Resolution of the 6 November meeting: rank junior cadres first among payments confirmed on the same date."
                aria-invalid={Boolean(error)}
              />
              {error ? (
                <p role="alert" className="field-error mt-1">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="forest" disabled={!dirty || save.isPending}>
                {save.isPending ? 'Saving…' : dirty ? 'Save allocation rule' : 'Saved'}
              </Button>
              {dirty ? (
                <Button variant="ghost" onClick={() => setChosen(current)} disabled={save.isPending}>
                  Reset
                </Button>
              ) : null}
            </div>
          </fieldset>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">What the call actually says</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Allocation is first-come, first-served, determined by the date of payment confirmation — and preference
              is given to members in the lower cadre (Clerk to Assistant Manager). The document does not say what
              happens when a senior cadre pays first, so ask the cooperative to minute the order it wants, then set it
              here.
            </p>
            {lastChange ? (
              <p className="num mt-2 text-xs text-ink-soft">
                Last change: {lastChange.actor} · {formatDateTime(lastChange.at)}
                {lastChange.note ? ` — ${lastChange.note}` : ''}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="card-raised overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[1.05rem]">Queue under “{policy.label}”</h2>
              <p className="text-xs text-ink-soft">Top of the queue, recomputed from the rule you have selected.</p>
            </div>
            {preview.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-soft">No applications to order yet.</p>
            ) : (
              <ol className="divide-y divide-line">
                {preview.map((item) => {
                  const position = item.confirmedOn
                    ? preview.filter((row) => row.confirmedOn !== null).indexOf(item) + 1
                    : null;
                  return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="num w-6 shrink-0 text-sm font-semibold text-forest">{position ?? '—'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.memberName}</p>
                      <p className="num text-xs text-ink-soft">
                        {item.cadre} · {formatSqm(item.sizeSqm)} ·{' '}
                        {item.confirmedOn ? `confirmed ${formatDate(item.confirmedOn)}` : 'no confirmed deposit'}
                      </p>
                    </div>
                    <ApplicationPill status={item.status} />
                  </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">If you change it</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Existing allocations are not reversed: the rule orders applicants waiting for a plot. Applicants see the
              rule and their position on their application page, so a change is visible to them immediately.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
}
