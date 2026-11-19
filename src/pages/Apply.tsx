import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../auth/session';
import { BrandBar } from '../components/BrandBar';
import {
  Button,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  Passbook,
  PlotsLeft,
  useToast,
} from '../components/ui';
import { addPublicEvidence, createApplication, getSettings, listTiers } from '../data/repository';
import { useScheme } from '../data/scheme';
import { gradeLabel } from '../data/grades';
import { TERMS_CLAUSES, TERMS_EFFECTIVE_ON, TERMS_VERSION } from '../data/terms';
import type { Cadre, HouseDesign, MemberCategory } from '../data/types';
import { depositFor, describePolicy, priceForPlot, remainingPlots } from '../lib/allocations';
import { formatDate, formatFileSize, formatNaira, formatSqm } from '../lib/format';
import {
  CADRES,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPE_LABEL,
  HOUSE_DESIGNS,
  MEMBER_CATEGORIES,
  applicationDetailsSchema,
  applicationSchema,
  evidenceProblem,
  memberCategoryLabel,
} from '../lib/validation';

export function Apply() {
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { scheme } = useScheme();

  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const [step, setStep] = useState<1 | 2>(1);
  const [applicantName, setApplicantName] = useState(user?.name ?? '');
  const [sizeSqm, setSizeSqm] = useState<number>(() => Number(params.get('size')) || 300);
  const [houseDesign, setHouseDesign] = useState<HouseDesign>('semi-detached');
  const [memberNumber, setMemberNumber] = useState(user?.memberNumber ?? '');
  const [cadre, setCadre] = useState<Cadre>(user?.cadre ?? 'Clerk');
  const [memberCategory, setMemberCategory] = useState<MemberCategory | ''>('');
  const [accepted, setAccepted] = useState<string[]>([]);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceKey, setEvidenceKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tiers = tiersQuery.data ?? [];
  const openTiers = tiers.filter((tier) => remainingPlots(tier) > 0);
  const selected = tiers.find((tier) => tier.sizeSqm === sizeSqm) ?? openTiers[0];
  const availableSizes = openTiers.map((tier) => tier.sizeSqm);
  const policy = describePolicy(settingsQuery.data?.allocationPolicy ?? 'cadre-priority-same-day');
  const signedIn = Boolean(user);

  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess: async (created) => {
      // The application exists once this runs, so a failure to attach the file
      // must not throw it away: say what happened and keep the reference.
      let evidenceName: string | undefined;
      if (evidenceFile) {
        try {
          await addPublicEvidence({ application: created, file: evidenceFile });
          evidenceName = evidenceFile.name;
        } catch (error) {
          toast({
            title: 'Application submitted, evidence not attached',
            detail: `${(error as Error).message} Send the receipt to the secretariat quoting ${created.reference}.`,
          });
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['tiers'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
        queryClient.invalidateQueries({ queryKey: ['evidence'] }),
      ]);
      navigate(`/apply/received/${encodeURIComponent(created.reference)}`, {
        replace: true,
        state: { application: created, evidenceFileName: evidenceName },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not submit the application', detail: error.message });
    },
  });

  if (tiersQuery.isLoading) return <LoadingBlock label="Reading plot availability…" />;

  const amount = selected ? priceForPlot(selected.sizeSqm, scheme.pricePerSqm) : 0;

  const continueToTerms = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      setErrors({ sizeSqm: 'No plot sizes are open for application.' });
      return;
    }

    const fileProblem = evidenceFile ? evidenceProblem(evidenceFile) : null;
    if (fileProblem) {
      setErrors({ evidence: fileProblem });
      return;
    }

    const parsed = applicationDetailsSchema(availableSizes).safeParse({
      applicantName,
      sizeSqm: selected.sizeSqm,
      houseDesign,
      memberNumber,
      cadre,
      memberCategory,
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
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      setErrors({ sizeSqm: 'No plot sizes are open for application.' });
      setStep(1);
      return;
    }

    const parsed = applicationSchema(availableSizes).safeParse({
      applicantName,
      sizeSqm: selected.sizeSqm,
      houseDesign,
      memberNumber,
      cadre,
      memberCategory,
      acceptedClauses: accepted,
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

    const fileProblem = evidenceFile ? evidenceProblem(evidenceFile) : null;
    if (fileProblem) {
      setErrors({ evidence: fileProblem });
      setStep(1);
      return;
    }

    setErrors({});
    mutation.mutate({
      memberId: user?.id ?? null,
      memberName: parsed.data.applicantName,
      memberNumber: parsed.data.memberNumber.toUpperCase(),
      cadre: parsed.data.cadre,
      memberCategory: parsed.data.memberCategory as MemberCategory,
      sizeSqm: parsed.data.sizeSqm,
      houseDesign: parsed.data.houseDesign,
      acceptedClauses: parsed.data.acceptedClauses,
    });
  };

  const toggleClause = (id: string, checked: boolean) => {
    setAccepted((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
    if (checked) setErrors((current) => ({ ...current, acceptedClauses: '' }));
  };

  return (
    <div className="min-h-dvh">
      <BrandBar>
        <span className="hidden text-xs text-ink-soft sm:inline">No account needed</span>
      </BrandBar>

      <main className="mx-auto max-w-[1180px] px-5 py-8">
        <div className="space-y-6">
          <PageHeader
            eyebrow="Gidan Daya"
            title="Start your subscription"
            description={`One application covers one plot. The ${formatNaira(scheme.applicationFee)} application fee is non-refundable; the 50% deposit is due ${formatDate(scheme.depositDueOn)}.`}
            actions={
              <ol className="flex items-center gap-2 text-xs" aria-label="Application steps">
                {[
                  { number: 1, label: 'Plot and applicant' },
                  { number: 2, label: 'Conditions' },
                ].map((item) => {
                  const active = step === item.number;
                  const done = step > item.number;
                  return (
                    <li key={item.number}>
                      <span
                        aria-current={active ? 'step' : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                          active
                            ? 'border-forest bg-forest text-paper'
                            : done
                              ? 'border-forest/30 bg-sage text-forest'
                              : 'border-line bg-paper-2 text-ink-soft'
                        }`}
                      >
                        <span aria-hidden className="num">{done ? '✓' : item.number}</span>
                        {item.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            }
          />

          {tiersQuery.isError ? (
            <ErrorBlock message={tiersQuery.error.message} onRetry={() => void tiersQuery.refetch()} />
          ) : null}

          {step === 1 ? (
            <form onSubmit={continueToTerms} noValidate className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
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
                            <PlotsLeft
                              remaining={left}
                              total={tier.totalPlots}
                              size="sm"
                              className="mt-1.5"
                            />
                          </span>
                          <span className="num shrink-0 text-right text-sm">
                            {formatNaira(priceForPlot(tier.sizeSqm, scheme.pricePerSqm))}
                            <span className="block text-[0.625rem] text-ink-soft">
                              deposit {formatNaira(depositFor(priceForPlot(tier.sizeSqm, scheme.pricePerSqm)))}
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
                  {signedIn ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      Taken from your signed-in account. The cooperative matches payments using your ID number and name
                      in the transfer narration.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-soft">
                      You do not need an account to apply. Enter the details on your cooperative record — the
                      secretariat checks them against the register. Use your ID number and name in the transfer
                      narration.
                    </p>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field
                        label="Full name"
                        htmlFor="applicantName"
                        hint={
                          signedIn
                            ? 'Changing this changes only the application; your account name stays as it is.'
                            : 'As it appears on your cooperative record.'
                        }
                        error={errors.applicantName}
                      >
                        <input
                          id="applicantName"
                          name="applicantName"
                          className={`input${errors.applicantName ? ' input-invalid' : ''}`}
                          value={applicantName}
                          onChange={(event) => setApplicantName(event.target.value)}
                          autoComplete="name"
                          placeholder="Aisha Bello"
                          aria-invalid={Boolean(errors.applicantName)}
                        />
                      </Field>
                    </div>

                    <Field
                      label="Member ID"
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
                        placeholder="19159"
                        aria-invalid={Boolean(errors.memberNumber)}
                        aria-describedby={errors.memberNumber ? 'memberNumber-error' : 'memberNumber-hint'}
                      />
                    </Field>

                    <Field
                      label="Grade"
                      htmlFor="cadre"
                      hint="Your cooperative grade, as recorded. It sets priority under the call."
                      error={errors.cadre}
                    >
                      <select
                        id="cadre"
                        name="cadre"
                        className="input"
                        value={cadre}
                        onChange={(event) => setCadre(event.target.value as Cadre)}
                      >
                        {CADRES.map((item) => (
                          <option key={item} value={item}>
                            {gradeLabel(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label="Member category"
                      htmlFor="memberCategory"
                      hint="As the cooperative records you today."
                      error={errors.memberCategory}
                    >
                      <select
                        id="memberCategory"
                        name="memberCategory"
                        className={`input${errors.memberCategory ? ' input-invalid' : ''}`}
                        value={memberCategory}
                        aria-invalid={Boolean(errors.memberCategory)}
                        onChange={(event) => {
                          setMemberCategory(event.target.value as MemberCategory | '');
                          setErrors((current) => ({ ...current, memberCategory: '' }));
                        }}
                      >
                        <option value="">Select category</option>
                        {MEMBER_CATEGORIES.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4 rounded-sm border border-dashed border-line bg-paper-2 px-3.5 py-3">
                    <label htmlFor="fee-evidence" className="text-sm font-semibold text-forest">
                      Fee evidence <span className="font-normal text-ink-soft">(optional)</span>
                    </label>
                    <p id="fee-evidence-hint" className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                      Already paid the {formatNaira(scheme.applicationFee)} application fee? Attach the receipt or bank
                      alert here. {EVIDENCE_TYPE_LABEL}, up to {formatFileSize(EVIDENCE_MAX_BYTES)}. The secretariat
                      verifies it before anything is allocated.
                    </p>
                    <input
                      key={evidenceKey}
                      id="fee-evidence"
                      name="feeEvidence"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      aria-describedby="fee-evidence-hint"
                      aria-invalid={Boolean(errors.evidence)}
                      className={`input mt-2 file:mr-3 file:rounded-sm file:border-0 file:bg-paper-3 file:px-2 file:py-1 file:text-xs file:font-semibold${
                        errors.evidence ? ' input-invalid' : ''
                      }`}
                      onChange={(event) => {
                        setEvidenceFile(event.target.files?.[0] ?? null);
                        setErrors((current) => ({ ...current, evidence: '' }));
                      }}
                    />
                    {evidenceFile ? (
                      <p className="num mt-1 text-xs text-ink-soft">
                        {formatFileSize(evidenceFile.size)} attached
                        <button
                          type="button"
                          className="ml-2 font-semibold text-forest underline"
                          onClick={() => {
                            setEvidenceFile(null);
                            setEvidenceKey((key) => key + 1);
                          }}
                        >
                          Remove
                        </button>
                      </p>
                    ) : null}
                    {errors.evidence ? (
                      <p role="alert" className="field-error mt-1">
                        {errors.evidence}
                      </p>
                    ) : null}
                  </div>

                  {signedIn ? (
                    <div className="mt-4 rounded-sm border border-line bg-paper-3/50 px-3 py-3 text-xs leading-relaxed text-ink-soft">
                      <p className="font-semibold text-ink">Signed in</p>
                      <p className="mt-0.5">
                        {applicantName || 'No name'} · {memberNumber || 'no ID number'}
                      </p>
                      <p className="mt-1">
                        The application will appear on your application page as soon as it is submitted.
                      </p>
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
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
                        {formatNaira(scheme.pricePerSqm)}/sqm × {selected.sizeSqm} sqm
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
                          <dd className="num">{formatNaira(scheme.applicationFee)}</dd>
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
                        Pay by transfer to the cooperative's UBA project account, quoting your ID number and name. The
                        bank details are in the call document; the secretariat confirms each payment.
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">No plot sizes are open right now.</p>
                  )}
                </section>

                <section className="card p-4">
                  <h2 className="text-[1.05rem]">Before you continue</h2>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    Step 2 sets out the refund, default, plot-size and title conditions. You will acknowledge each one
                    before the application is created.
                  </p>
                </section>

                <button type="submit" className="btn btn-primary w-full" disabled={!selected}>
                  Continue to the conditions
                </button>
                <p className="text-center text-xs text-ink-soft">
                  Applications close {formatDate(scheme.closesOn)}.
                </p>
              </aside>
            </form>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <div className="space-y-4">
                <section className="card-raised p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[1.05rem]">Conditions of application</h2>
                      <p className="mt-1 text-xs text-ink-soft">
                        {TERMS_VERSION} · effective {formatDate(TERMS_EFFECTIVE_ON)}. Acknowledge each condition; the
                        record stores the version and the date you accepted it.
                      </p>
                    </div>
                    <span className="num rounded-full bg-paper-3 px-2.5 py-1 text-xs text-ink-soft">
                      {accepted.length}/{TERMS_CLAUSES.length} acknowledged
                    </span>
                  </div>

                  <ol className="mt-4 space-y-3">
                    {TERMS_CLAUSES.map((clause) => {
                      const checked = accepted.includes(clause.id);
                      return (
                        <li
                          key={clause.id}
                          className={`rounded-sm border px-3.5 py-3 transition-colors ${
                            checked ? 'border-forest/35 bg-sage/40' : 'border-line bg-paper-2'
                          }`}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 accent-forest"
                              checked={checked}
                              onChange={(event) => toggleClause(clause.id, event.target.checked)}
                              aria-describedby={`${clause.id}-body`}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-forest">{clause.title}</span>
                              <span className="mt-0.5 block font-display text-[1.02rem] leading-snug">
                                {clause.headline}
                              </span>
                              <span
                                id={`${clause.id}-body`}
                                className="mt-1.5 block text-sm leading-relaxed text-ink-soft"
                              >
                                {clause.body}
                              </span>
                              <span className="mt-1.5 block text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
                                {clause.source}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ol>

                  {errors.acceptedClauses ? (
                    <p role="alert" className="field-error mt-3">
                      {errors.acceptedClauses}
                    </p>
                  ) : null}
                </section>

                <section className="card p-4">
                  <h2 className="text-[1.05rem]">How your place in the queue is decided</h2>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{policy.label}.</span> {policy.summary}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    The secretariat sets this rule; the call gives both first-come and lower-cadre priority, and the
                    current reading is shown here and on your application.
                  </p>
                </section>

                <section className="card p-4">
                  <h2 className="text-[1.05rem]">What happens after you submit</h2>
                  <ol className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    <li>1. Your application is created with a reference, shown on the next screen.</li>
                    <li>
                      2. Pay the {formatNaira(scheme.applicationFee)} fee and the 50% deposit by{' '}
                      {formatDate(scheme.depositDueOn)}, quoting your ID number and name.
                    </li>
                    <li>3. The secretariat verifies the payment, records its date and fixes your queue position.</li>
                    <li>
                      4. Clear the balance by {formatDate(scheme.balanceDueOn)}. Sign in at any time to attach
                      evidence and follow the balance.
                    </li>
                  </ol>
                </section>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <section className="card-raised p-4">
                  <h2 className="text-[1.05rem]">The application</h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Applicant</dt>
                      <dd className="text-right">{applicantName || '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Member ID</dt>
                      <dd className="num">{memberNumber.toUpperCase() || '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Grade</dt>
                      <dd>{gradeLabel(cadre)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Member category</dt>
                      <dd>{memberCategory ? memberCategoryLabel(memberCategory) : '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Plot</dt>
                      <dd className="num">{selected ? formatSqm(selected.sizeSqm) : '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">Design</dt>
                      <dd className="text-right">
                        {houseDesign === 'detached' ? 'Detached duplex' : 'Semi-detached duplex'}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
                      <dt className="text-ink-soft">Plot price</dt>
                      <dd className="num font-semibold">{formatNaira(amount)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-soft">50% deposit</dt>
                      <dd className="num">{formatNaira(depositFor(amount))}</dd>
                    </div>
                  </dl>
                </section>

                <div className="flex flex-col gap-2">
                  <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Submitting…' : 'Accept and submit application'}
                  </button>
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={mutation.isPending}>
                    Back to plot and details
                  </Button>
                </div>
                <p className="text-center text-xs text-ink-soft">
                  {signedIn
                    ? 'Your acceptance is recorded with the application.'
                    : 'You can apply without an account. Sign in later to track payments.'}
                </p>
              </aside>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
