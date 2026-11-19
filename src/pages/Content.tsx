import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import {
  Button,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  useToast,
} from '../components/ui';
import { listAudit, listTiers, saveSchemeContent, saveTierTotals } from '../data/repository';
import { useScheme } from '../data/scheme';
import type { PlotTier, SchemeContent } from '../data/types';
import { remainingPlots } from '../lib/allocations';
import {
  MAX_SITE_VISITS,
  NOTICE_MAX,
  contentFromValues,
  describeContentChanges,
  formFromContent,
  parseContentForm,
  tierTotalsProblem,
  type ContentForm,
} from '../lib/content';
import { formatDate, formatDateTime, formatSqm } from '../lib/format';

/**
 * The secretariat's editor for everything the app publishes: the rate, the fee,
 * the four dates, the site visits and the notice. Saving writes once and every
 * page, receipt and export reads the new figures.
 */
export function Content() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const content = useScheme();

  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers });
  const auditQuery = useQuery({ queryKey: ['audit', 'all'], queryFn: () => listAudit() });

  const tiers = tiersQuery.data ?? [];

  const [draft, setDraft] = useState<ContentForm | null>(null);
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: async ({ next, nextTiers }: { next: SchemeContent; nextTiers: PlotTier[] }) => {
      if (!user) throw new Error('No session');

      const totalChanges = nextTiers.filter(
        (tier) => tier.totalPlots !== tiers.find((current) => current.id === tier.id)?.totalPlots,
      );

      await saveSchemeContent(next, user.name, note.trim() || 'Published from the admin portal.');
      if (totalChanges.length > 0) {
        await saveTierTotals(
          nextTiers,
          user.name,
          totalChanges
            .map((tier) => `${formatSqm(tier.sizeSqm)}: ${tier.totalPlots} plots`)
            .join(' · '),
        );
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scheme'] }),
        queryClient.invalidateQueries({ queryKey: ['tiers'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ]);
      setDraft(null);
      setTotals({});
      setErrors({});
      setNote('');
      toast({
        title: 'Content published',
        detail: 'The landing page, the application form and every receipt now read these figures.',
      });
    },
    onError: (cause: Error) => toast({ title: 'Could not publish the change', detail: cause.message }),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Secretariat"
          title="Published content"
          description="Restricted to secretariat accounts."
        />
        <EmptyState
          title="Only the secretariat publishes the scheme content"
          body="The rate, the dates and the site visits shown to applicants are set here, in one place."
          action={
            <Link to="/apply" className="btn btn-forest">
              Start a subscription
            </Link>
          }
        />
      </div>
    );
  }

  if (tiersQuery.isLoading) return <LoadingBlock label="Reading the published content…" />;
  if (tiersQuery.isError) {
    return <ErrorBlock message={tiersQuery.error.message} onRetry={() => void tiersQuery.refetch()} />;
  }

  const form = draft ?? formFromContent(content);
  const setForm = (patch: Partial<ContentForm>) => setDraft({ ...form, ...patch });

  const parsed = parseContentForm(form);
  const changes = parsed.success
    ? describeContentChanges(content, contentFromValues(parsed.data, content))
    : [];
  const tierChanges = tiers.filter(
    (tier) => totalValue(totals, tier) !== String(tier.totalPlots),
  );
  const dirty = changes.length > 0 || tierChanges.length > 0;

  const lastChange = (auditQuery.data ?? []).find((event) => event.action === 'Scheme content updated');

  const addVisit = () => setForm({ siteVisitDates: [...form.siteVisitDates, ''] });

  const updateVisit = (index: number, date: string) => {
    const dates = [...form.siteVisitDates];
    dates[index] = date;
    setForm({ siteVisitDates: dates });
    setErrors((current) => ({ ...current, siteVisitDates: '' }));
  };

  const removeVisit = (index: number) =>
    setForm({ siteVisitDates: form.siteVisitDates.filter((_, position) => position !== index) });

  const reset = () => {
    setDraft(null);
    setTotals({});
    setErrors({});
    setNote('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = parseContentForm(form);
    const nextErrors: Record<string, string> = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }

    for (const tier of tiers) {
      const raw = totalValue(totals, tier);
      const total = raw.trim() === '' ? Number.NaN : Number(raw);
      const problem = tierTotalsProblem(total, tier.allocated);
      if (problem) nextErrors[`tier-${tier.id}`] = problem;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: 'Check the highlighted fields', detail: 'Nothing was saved.' });
      return;
    }
    if (!result.success) return;

    save.mutate({
      next: contentFromValues(result.data, content),
      nextTiers: tiers.map((tier) => ({ ...tier, totalPlots: Number(totalValue(totals, tier)) })),
    });
  };

  const errorCount = Object.keys(errors).filter((key) => errors[key]).length;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <PageHeader
        eyebrow="Secretariat"
        title="Published content"
        description="The rate, the payment dates, the site visits and the notice. Every page and every export reads these figures, so a change here is live everywhere at once."
        actions={
          <a
            href="#publish-panel"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              dirty ? 'border-gold/40 bg-gold-tint text-[#6f4d12]' : 'border-line bg-paper-2 text-ink-soft'
            }`}
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {dirty ? 'Unsaved changes — go to publish' : 'Matches what is live'}
          </a>
        }
      />

      {errorCount > 0 ? (
        <p role="alert" className="card border-clay/40 bg-clay-tint/50 px-4 py-3 text-sm text-clay-deep">
          {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention before this can be
          published.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">Rate and fee</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Every plot is priced at this rate per square metre, applied to the size measured after survey. No fixed
              plot price or deposit is published; changing the rate re-prices the scheme, not the amounts already
              recorded on an application.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Rate per square metre"
                htmlFor="content-rate"
                hint="Naira, inclusive of infrastructure."
                error={errors.pricePerSqm}
              >
                <input
                  id="content-rate"
                  className={`input num${errors.pricePerSqm ? ' input-invalid' : ''}`}
                  inputMode="numeric"
                  value={form.pricePerSqm}
                  onChange={(event) => {
                    setForm({ pricePerSqm: event.target.value });
                    setErrors((current) => ({ ...current, pricePerSqm: '' }));
                  }}
                  aria-invalid={Boolean(errors.pricePerSqm)}
                />
              </Field>

              <Field
                label="Application fee"
                htmlFor="content-fee"
                hint="Non-refundable. Use 0 if the fee is waived."
                error={errors.applicationFee}
              >
                <input
                  id="content-fee"
                  className={`input num${errors.applicationFee ? ' input-invalid' : ''}`}
                  inputMode="numeric"
                  value={form.applicationFee}
                  onChange={(event) => {
                    setForm({ applicationFee: event.target.value });
                    setErrors((current) => ({ ...current, applicationFee: '' }));
                  }}
                  aria-invalid={Boolean(errors.applicationFee)}
                />
              </Field>
            </div>
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">Dates</h2>
            <p className="mt-1 text-xs text-ink-soft">
              The closing date is also enforced by the application function, so a change here takes effect in the
              database as well as on the page.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Applications open" htmlFor="content-opens" error={errors.opensOn}>
                <input
                  id="content-opens"
                  type="date"
                  className={`input${errors.opensOn ? ' input-invalid' : ''}`}
                  value={form.opensOn}
                  onChange={(event) => {
                    setForm({ opensOn: event.target.value });
                    setErrors((current) => ({ ...current, opensOn: '' }));
                  }}
                  aria-invalid={Boolean(errors.opensOn)}
                />
              </Field>

              <Field label="Applications close" htmlFor="content-closes" error={errors.closesOn}>
                <input
                  id="content-closes"
                  type="date"
                  className={`input${errors.closesOn ? ' input-invalid' : ''}`}
                  value={form.closesOn}
                  onChange={(event) => {
                    setForm({ closesOn: event.target.value });
                    setErrors((current) => ({ ...current, closesOn: '' }));
                  }}
                  aria-invalid={Boolean(errors.closesOn)}
                />
              </Field>

              <Field label="50% deposit due" htmlFor="content-deposit" error={errors.depositDueOn}>
                <input
                  id="content-deposit"
                  type="date"
                  className={`input${errors.depositDueOn ? ' input-invalid' : ''}`}
                  value={form.depositDueOn}
                  onChange={(event) => {
                    setForm({ depositDueOn: event.target.value });
                    setErrors((current) => ({ ...current, depositDueOn: '' }));
                  }}
                  aria-invalid={Boolean(errors.depositDueOn)}
                />
              </Field>

              <Field label="Balance due" htmlFor="content-balance" error={errors.balanceDueOn}>
                <input
                  id="content-balance"
                  type="date"
                  className={`input${errors.balanceDueOn ? ' input-invalid' : ''}`}
                  value={form.balanceDueOn}
                  onChange={(event) => {
                    setForm({ balanceDueOn: event.target.value });
                    setErrors((current) => ({ ...current, balanceDueOn: '' }));
                  }}
                  aria-invalid={Boolean(errors.balanceDueOn)}
                />
              </Field>
            </div>

            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
              {parsed.success
                ? `Applicants will read: opens ${formatDate(parsed.data.opensOn)}, closes ${formatDate(
                    parsed.data.closesOn,
                  )}, deposit ${formatDate(parsed.data.depositDueOn)}, balance ${formatDate(
                    parsed.data.balanceDueOn,
                  )}.`
                : 'Fix the dates above to see how they will read to applicants.'}
            </p>
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">Site visits</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Inspection dates published on the landing page and on the member overview. Leave the list empty to
              publish no dates.
            </p>

            {form.siteVisitDates.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {form.siteVisitDates.map((date, index) => (
                  <li key={index} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Field label={`Visit ${index + 1}`} htmlFor={`content-visit-${index}`}>
                        <input
                          id={`content-visit-${index}`}
                          type="date"
                          className="input"
                          value={date}
                          onChange={(event) => updateVisit(index, event.target.value)}
                        />
                      </Field>
                    </div>
                    <Button
                      variant="quiet"
                      className="mb-0.5 shrink-0"
                      onClick={() => removeVisit(index)}
                      aria-label={`Remove visit ${index + 1}`}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">No inspection dates are published.</p>
            )}

            {errors.siteVisitDates ? (
              <p role="alert" className="field-error mt-2">
                {errors.siteVisitDates}
              </p>
            ) : null}

            <div className="mt-3">
              <Button
                variant="ghost"
                onClick={addVisit}
                disabled={form.siteVisitDates.length >= MAX_SITE_VISITS}
              >
                Add a date
              </Button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Time the buses leave" htmlFor="content-visit-time" error={errors.siteVisitTime}>
                <input
                  id="content-visit-time"
                  className={`input${errors.siteVisitTime ? ' input-invalid' : ''}`}
                  value={form.siteVisitTime}
                  onChange={(event) => {
                    setForm({ siteVisitTime: event.target.value });
                    setErrors((current) => ({ ...current, siteVisitTime: '' }));
                  }}
                  aria-invalid={Boolean(errors.siteVisitTime)}
                  placeholder="10:00 am"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Meeting point"
                  htmlFor="content-visit-point"
                  error={errors.siteVisitMeetingPoint}
                >
                  <textarea
                    id="content-visit-point"
                    rows={3}
                    className={`input${errors.siteVisitMeetingPoint ? ' input-invalid' : ''}`}
                    value={form.siteVisitMeetingPoint}
                    onChange={(event) => {
                      setForm({ siteVisitMeetingPoint: event.target.value });
                      setErrors((current) => ({ ...current, siteVisitMeetingPoint: '' }));
                    }}
                    aria-invalid={Boolean(errors.siteVisitMeetingPoint)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">Notice</h2>
            <p className="mt-1 text-xs text-ink-soft">
              A short message shown above the public page and above every member's dashboard. Leave it empty to
              hide it.
            </p>

            <div className="mt-4">
              <Field label="Message" htmlFor="content-notice" error={errors.notice}>
                <textarea
                  id="content-notice"
                  className={`input min-h-20${errors.notice ? ' input-invalid' : ''}`}
                  maxLength={NOTICE_MAX}
                  value={form.notice}
                  onChange={(event) => {
                    setForm({ notice: event.target.value });
                    setErrors((current) => ({ ...current, notice: '' }));
                  }}
                  aria-invalid={Boolean(errors.notice)}
                  placeholder="The 28 November site visit is moved to 5 December."
                />
              </Field>
              <p className="num mt-1 text-xs text-ink-soft">
                {form.notice.length}/{NOTICE_MAX}
              </p>
            </div>
          </section>

          <section className="card-raised overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[1.05rem]">Plot inventory</h2>
              <p className="text-xs text-ink-soft">
                How many plots of each size the scheme holds. A total cannot fall below what is already allocated.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Plots per size</caption>
                <thead>
                  <tr>
                    <th scope="col">Plot size</th>
                    <th scope="col" className="hidden sm:table-cell">
                      Allocated
                    </th>
                    <th scope="col">Total plots</th>
                    <th scope="col">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => {
                    const raw = totalValue(totals, tier);
                    const total = raw.trim() === '' ? Number.NaN : Number(raw);
                    const problem = errors[`tier-${tier.id}`];
                    return (
                      <tr key={tier.id}>
                        <td className="font-medium">
                          {formatSqm(tier.sizeSqm)}
                          <span className="num block whitespace-nowrap text-xs text-ink-soft sm:hidden">
                            {tier.allocated} taken
                          </span>
                        </td>
                        <td className="num hidden text-ink-soft sm:table-cell">{tier.allocated}</td>
                        <td className="min-w-[8rem]">
                          <input
                            aria-label={`Total ${formatSqm(tier.sizeSqm)} plots`}
                            className={`input num w-24${problem ? ' input-invalid' : ''}`}
                            inputMode="numeric"
                            value={raw}
                            onChange={(event) => {
                              setTotals((current) => ({ ...current, [tier.id]: event.target.value }));
                              setErrors((current) => ({ ...current, [`tier-${tier.id}`]: '' }));
                            }}
                            aria-invalid={Boolean(problem)}
                          />
                          {problem ? (
                            <p role="alert" className="field-error mt-1">
                              {problem}
                            </p>
                          ) : null}
                        </td>
                        <td className="num">
                          {Number.isFinite(total)
                            ? remainingPlots({ totalPlots: total, allocated: tier.allocated })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section id="publish-panel" className="card-raised scroll-mt-24 p-4">
            <h2 className="text-[1.05rem]">What this change does</h2>
            {dirty ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {changes.map((change) => (
                  <li key={change} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay" />
                    <span>{change}</span>
                  </li>
                ))}
                {tierChanges.map((tier) => (
                  <li key={tier.id} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay" />
                    <span className="num">
                      {formatSqm(tier.sizeSqm)} plots {tier.totalPlots} → {totalValue(totals, tier)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nothing changed yet.</p>
            )}

            <div className="mt-4">
              <label htmlFor="content-note" className="field-label">
                Why the change? (written to the audit trail)
              </label>
              <textarea
                id="content-note"
                className="input min-h-20"
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Secretariat resolution of 20 November: rate reviewed for the second phase."
              />
            </div>

            <Button
              type="submit"
              variant="forest"
              className="mt-3 w-full"
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? 'Publishing…' : dirty ? 'Publish changes' : 'Nothing to publish'}
            </Button>
            {dirty ? (
              <Button variant="ghost" className="mt-2 w-full" onClick={reset} disabled={save.isPending}>
                Discard
              </Button>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Amounts already recorded on an application keep the price they were created at; only what
              applicants are shown changes.
            </p>
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">Last content change</h2>
            {lastChange ? (
              <div className="mt-2 text-xs text-ink-soft">
                <p className="num">
                  {lastChange.actor} · {formatDateTime(lastChange.at)}
                </p>
                {lastChange.note ? <p className="mt-1 leading-relaxed">{lastChange.note}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">No content change recorded yet.</p>
            )}
            <Link
              to="/app/settings"
              className="mt-3 inline-block text-sm font-medium text-forest underline-offset-4 hover:underline"
            >
              Allocation rule →
            </Link>
          </section>
        </aside>
      </div>
    </form>
  );
}

function totalValue(totals: Record<string, string>, tier: PlotTier): string {
  return totals[tier.id] ?? String(tier.totalPlots);
}
