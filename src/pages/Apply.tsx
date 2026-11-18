import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../auth/session';
import { ErrorBlock, Field, LoadingBlock, PageHeader, Passbook, useToast } from '../components/ui';
import { createApplication, listTiers } from '../data/repository';
import { SCHEME } from '../data/seed';
import type { Cadre, HouseDesign } from '../data/types';
import { depositFor, priceForPlot, remainingPlots } from '../lib/allocations';
import { formatDate, formatNaira, formatSqm } from '../lib/format';
import { CADRES, HOUSE_DESIGNS, applicationSchema } from '../lib/validation';

export function Apply() {
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();

  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers });

  const [sizeSqm, setSizeSqm] = useState<number>(() => Number(params.get('size')) || 300);
  const [houseDesign, setHouseDesign] = useState<HouseDesign>('semi-detached');
  const [memberNumber, setMemberNumber] = useState(user?.memberNumber ?? '');
  const [cadre, setCadre] = useState<Cadre>(user?.cadre ?? 'Clerk');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tiers = tiersQuery.data ?? [];
  const openTiers = tiers.filter((tier) => remainingPlots(tier) > 0);
  const selected = tiers.find((tier) => tier.sizeSqm === sizeSqm) ?? openTiers[0];
  const availableSizes = openTiers.map((tier) => tier.sizeSqm);

  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['tiers'] }),
      ]);
      toast({
        title: `Application ${created.reference} created`,
        detail: `${formatSqm(created.sizeSqm)} reserved. Pay the ${formatNaira(SCHEME.applicationFee)} fee to confirm it.`,
      });
      navigate('/app/application');
    },
    onError: (error: Error) => {
      toast({ title: 'Could not submit the application', detail: error.message });
    },
  });

  if (!user) return null;
  if (tiersQuery.isLoading) return <LoadingBlock label="Reading plot availability…" />;
  if (tiersQuery.isError) {
    return <ErrorBlock message={tiersQuery.error.message} onRetry={() => void tiersQuery.refetch()} />;
  }

  const amount = selected ? priceForPlot(selected.sizeSqm, SCHEME.pricePerSqm) : 0;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      setErrors({ sizeSqm: 'No plot sizes are open for application.' });
      return;
    }

    const parsed = applicationSchema(availableSizes).safeParse({
      sizeSqm: selected.sizeSqm,
      houseDesign,
      memberNumber,
      cadre,
      acceptTerms,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    mutation.mutate({
      memberId: user.id,
      memberName: user.name,
      memberNumber: parsed.data.memberNumber.toUpperCase(),
      cadre: parsed.data.cadre,
      sizeSqm: parsed.data.sizeSqm,
      houseDesign: parsed.data.houseDesign,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gidan Daya"
        title="Apply for a plot"
        description={`One application covers one plot. The ${formatNaira(SCHEME.applicationFee)} application fee is non-refundable; the 50% deposit is due ${formatDate(SCHEME.depositDueOn)}.`}
      />

      <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">1. Choose a plot size</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Availability is first-come by payment confirmation. Sizes are confirmed after survey.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {tiers.map((tier) => {
                const left = remainingPlots(tier);
                const soldOut = left === 0;
                const chosen = selected?.sizeSqm === tier.sizeSqm;

                return (
                  <label
                    key={tier.id}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-sm border px-3 py-3 transition-colors ${
                      soldOut
                        ? 'cursor-not-allowed border-line bg-paper-3/60 text-ink-soft'
                        : chosen
                          ? 'border-forest bg-sage/50'
                          : 'border-line bg-paper-2 hover:border-forest/40'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="size"
                          className="accent-forest"
                          value={tier.sizeSqm}
                          checked={chosen}
                          disabled={soldOut}
                          onChange={() => {
                            setSizeSqm(tier.sizeSqm);
                            setErrors((current) => ({ ...current, sizeSqm: '' }));
                          }}
                        />
                        <span className="font-medium">{formatSqm(tier.sizeSqm)}</span>
                      </span>
                      <span className="num mt-1 block text-xs text-ink-soft">
                        {soldOut ? 'Fully allocated' : `${left} of ${tier.totalPlots} left`}
                      </span>
                    </span>
                    <span className="num shrink-0 text-right text-sm">
                      {formatNaira(priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm))}
                      <span className="block text-[0.625rem] text-ink-soft">
                        deposit {formatNaira(depositFor(priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm)))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.sizeSqm ? (
              <p role="alert" className="field-error mt-2">
                {errors.sizeSqm}
              </p>
            ) : null}
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">2. Choose a house design</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Both designs are 4-bedroom duplexes. The design does not change the plot price.
            </p>

            <div className="mt-4 grid gap-2">
              {HOUSE_DESIGNS.map((design) => (
                <label
                  key={design.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 transition-colors ${
                    houseDesign === design.id
                      ? 'border-forest bg-sage/50'
                      : 'border-line bg-paper-2 hover:border-forest/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="design"
                    className="accent-forest"
                    value={design.id}
                    checked={houseDesign === design.id}
                    onChange={() => setHouseDesign(design.id)}
                  />
                  <span className="text-sm">{design.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">3. Your cooperative details</h2>
            <p className="mt-1 text-xs text-ink-soft">
              The cooperative matches payments using your ID number and name in the transfer narration.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Cooperative ID number"
                htmlFor="memberNumber"
                hint="As it appears on your cooperative records."
                error={errors.memberNumber}
              >
                <input
                  id="memberNumber"
                  name="memberNumber"
                  className={`input${errors.memberNumber ? ' input-invalid' : ''}`}
                  value={memberNumber}
                  onChange={(event) => setMemberNumber(event.target.value)}
                  autoComplete="off"
                  placeholder="CBN/2019/0417"
                  aria-invalid={Boolean(errors.memberNumber)}
                  aria-describedby={errors.memberNumber ? 'memberNumber-error' : 'memberNumber-hint'}
                />
              </Field>

              <Field label="Cadre" htmlFor="cadre" hint="Determines priority under the call." error={errors.cadre}>
                <select
                  id="cadre"
                  name="cadre"
                  className="input"
                  value={cadre}
                  onChange={(event) => setCadre(event.target.value as Cadre)}
                >
                  {CADRES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 rounded-sm border border-line bg-paper-3/50 px-3 py-3 text-xs leading-relaxed text-ink-soft">
              <p className="font-semibold text-ink">Applicant on this application</p>
              <p className="mt-0.5">
                {user.name} · {memberNumber || 'no ID number yet'}
              </p>
              <p className="mt-1">
                Applications are personal to a cooperative member. Contact the secretariat if these details are wrong
                before paying.
              </p>
            </div>
          </section>

          <section className="card-raised p-4 sm:p-5">
            <h2 className="text-[1.05rem]">4. Accept the terms</h2>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-sm border border-line bg-paper-3/40 p-3 text-xs leading-relaxed text-ink-soft">
              <p>
                I confirm that I am a member of the CBN Staff Multipurpose Cooperative Society and that the details
                above are correct.
              </p>
              <p>
                I understand that the {formatNaira(SCHEME.applicationFee)} application fee is non-refundable, and that
                the 50% deposit is due by {formatDate(SCHEME.depositDueOn)} and the balance by{' '}
                {formatDate(SCHEME.balanceDueOn)}.
              </p>
              <p>
                I understand that allocation is first-come, determined by payment confirmation, with priority to
                members in the lower cadre, and that plot sizes may be adjusted after survey with any additional
                square metres payable.
              </p>
              <p>
                I understand that refunds are only considered after the plot is resold, attract penalties of up to 5%,
                and that infrastructure funds already applied are non-refundable. Title perfection costs are mine.
              </p>
            </div>

            <label className="mt-3 flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-forest"
                checked={acceptTerms}
                onChange={(event) => {
                  setAcceptTerms(event.target.checked);
                  if (event.target.checked) setErrors((current) => ({ ...current, acceptTerms: '' }));
                }}
              />
              <span>I have read and accept these terms.</span>
            </label>
            {errors.acceptTerms ? (
              <p role="alert" className="field-error mt-1">
                {errors.acceptTerms}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="card-raised p-4">
            <h2 className="text-[1.05rem]">What you will pay</h2>

            {selected ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-soft">{formatSqm(selected.sizeSqm)} plot</span>
                  <span className="num font-display text-[1.4rem] leading-none text-forest">
                    {formatNaira(amount)}
                  </span>
                </div>
                <p className="num mt-1 text-xs text-ink-soft">
                  {formatNaira(SCHEME.pricePerSqm)}/sqm × {selected.sizeSqm} sqm
                </p>

                <div className="mt-3">
                  <Passbook allocated={selected.allocated} totalPlots={selected.totalPlots} />
                  <p className="num mt-1 text-xs text-ink-soft">
                    {remainingPlots(selected)} of {selected.totalPlots} plots still open
                  </p>
                </div>

                <dl className="mt-4 divide-y divide-line border-t border-line text-sm">
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-ink-soft">Application fee</dt>
                    <dd className="num">{formatNaira(SCHEME.applicationFee)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-ink-soft">50% deposit</dt>
                    <dd className="num">{formatNaira(depositFor(amount))}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-ink-soft">Balance</dt>
                    <dd className="num">{formatNaira(amount - depositFor(amount))}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                  Pay by transfer to the cooperative's UBA project account, quoting your ID number and name. The bank
                  details are in the call document; the secretariat confirms each payment.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">No plot sizes are open right now.</p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-[1.05rem]">After you submit</h2>
            <ol className="mt-2 space-y-2 text-sm text-ink-soft">
              <li>1. The application appears on your application page with a reference.</li>
              <li>2. Pay the fee, then the 50% deposit by {formatDate(SCHEME.depositDueOn)}.</li>
              <li>3. The secretariat confirms payments and issues your allocation letter.</li>
            </ol>
          </section>

          <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending || !selected}>
            {mutation.isPending ? 'Submitting…' : 'Submit application'}
          </button>
          <p className="text-center text-xs text-ink-soft">
            Applications close {formatDate(SCHEME.closesOn)}.
          </p>
        </aside>
      </form>
    </div>
  );
}
