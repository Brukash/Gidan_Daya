import type { AllocationPolicy, ApplicationStatus, Cadre, PlotTier, Scheme } from '../data/types';
import { PRIORITY_BAND_LABEL, SENIOR_BAND_LABEL, hasPriorityGrade } from '../data/grades';
import { daysUntil, formatDate } from './format';

export const PASSBOOK_TICKS = 24;

/**
 * Priority goes to the lower grades the call names: Assistant Manager down to
 * Drivers. The band is defined by rank in `grades.ts` so it cannot drift from
 * the grade list.
 */
export function hasPriority(cadre: Cadre): boolean {
  return hasPriorityGrade(cadre);
}

export function priceForPlot(sizeSqm: number, pricePerSqm: number = 27_000): number {
  return Math.round(sizeSqm * pricePerSqm);
}

export function depositFor(amount: number): number {
  return Math.round(amount / 2);
}

export function allocationPercent(allocated: number, totalPlots: number): number {
  if (totalPlots <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((allocated / totalPlots) * 100)));
}

export function remainingPlots(tier: Pick<PlotTier, 'allocated' | 'totalPlots'>): number {
  return Math.max(0, tier.totalPlots - tier.allocated);
}

export function filledTicks(allocated: number, totalPlots: number, ticks: number = PASSBOOK_TICKS): number {
  if (totalPlots <= 0) return 0;
  return Math.round((Math.min(allocated, totalPlots) / totalPlots) * ticks);
}

export type TierState = 'available' | 'limited' | 'closed' | 'exhausted';

export interface TierStatus {
  state: TierState;
  label: string;
  detail: string;
}

/** Status is derived so a tier cannot advertise plots it no longer has. */
export function describeTier(
  tier: Pick<PlotTier, 'allocated' | 'totalPlots'>,
  closesOn: string,
  today: Date = new Date(),
): TierStatus {
  const left = remainingPlots(tier);
  const days = daysUntil(closesOn, today);

  if (left === 0) return { state: 'exhausted', label: 'Fully allocated', detail: 'No plots left' };
  if (days < 0) return { state: 'closed', label: 'Closed', detail: 'Applications closed' };
  if (left <= 5 || days <= 30) {
    return {
      state: 'limited',
      label: 'Closing soon',
      detail: days <= 30 ? `${days} days to apply` : `${left} plots left`,
    };
  }
  return { state: 'available', label: 'Available', detail: `${left} plots left` };
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  reserved: 'Reserved — fee paid',
  'deposit-paid': 'Deposit paid',
  'fully-paid': 'Fully paid',
  allocated: 'Allocated',
};

export function outstandingFor(application: { amount: number; paid: number }): number {
  return Math.max(0, application.amount - application.paid);
}

export function milestoneLabel(application: { amount: number; paid: number; feePaid: boolean }): string {
  if (!application.feePaid) return 'Application fee outstanding';
  if (application.paid === 0) return '50% deposit outstanding';
  if (application.paid < application.amount) return 'Final balance outstanding';
  return 'Fully paid — allocation letter due';
}

export function schemeTotals(tiers: PlotTier[], scheme: Pick<Scheme, 'pricePerSqm'>) {
  const plots = tiers.reduce((sum, tier) => sum + tier.totalPlots, 0);
  const allocated = tiers.reduce((sum, tier) => sum + tier.allocated, 0);
  const squareMetres = tiers.reduce((sum, tier) => sum + tier.totalPlots * tier.sizeSqm, 0);
  return {
    plots,
    allocated,
    remaining: Math.max(0, plots - allocated),
    squareMetres,
    value: Math.round(squareMetres * scheme.pricePerSqm),
  };
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

// ---------------------------------------------------------------------------
// Allocation rule
// ---------------------------------------------------------------------------

export interface PolicyOption {
  id: AllocationPolicy;
  label: string;
  summary: string;
  detail: string;
}

/**
 * The three defensible readings of the call. The document says allocation is
 * first-come by payment confirmation *and* that lower cadres get priority;
 * these options make the compromise explicit instead of hiding it in code.
 */
const POLICY_BY_ID: Record<AllocationPolicy, PolicyOption> = {
  'first-come': {
    id: 'first-come',
    label: 'First-come, strictly',
    summary: 'Payment confirmation decides; cadre is ignored.',
    detail:
      'The earliest confirmed deposit takes the next plot, whatever the applicant\'s cadre. This is the plain reading of "first-come, first-served, determined by the date of payment confirmation".',
  },
  'cadre-priority-same-day': {
    id: 'cadre-priority-same-day',
    label: 'Payment date, then cadre',
    summary: 'Lower cadre ranks ahead only among payments confirmed on the same date.',
    detail:
      `Applications are ordered by the date the deposit is confirmed. Within one date, ${PRIORITY_BAND_LABEL} rank ahead of ${SENIOR_BAND_LABEL}. This honours both sentences in the call without letting an early junior payment overtake everyone.`,
  },
  'cadre-priority': {
    id: 'cadre-priority',
    label: 'Cadre first',
    summary: 'Every lower-cadre applicant ranks ahead, however late they paid.',
    detail:
      `All ${PRIORITY_BAND_LABEL} applicants are placed before ${SENIOR_BAND_LABEL} applicants, and payment date only breaks ties inside each group. This maximises the preference the call describes, at the cost of strict first-come order.`,
  },
};

/** Ordered for menus: strict first-come, the default, then cadre first. */
export const POLICY_OPTIONS: PolicyOption[] = [
  POLICY_BY_ID['first-come'],
  POLICY_BY_ID['cadre-priority-same-day'],
  POLICY_BY_ID['cadre-priority'],
];

export function describePolicy(policy: AllocationPolicy): PolicyOption {
  return POLICY_BY_ID[policy];
}

/** A plot is held only once half the price has been confirmed. */
export function isConfirmed(application: { amount: number; paid: number }): boolean {
  return application.paid >= depositFor(application.amount);
}

type QueueItem = {
  id: string;
  cadre: Cadre;
  amount: number;
  paid: number;
  createdAt: string;
  confirmedOn: string | null;
};

/**
 * Applications in allocation order. Confirmed applications come first, then
 * those still waiting for a confirmed deposit, oldest application first.
 */
export function allocationOrder<T extends QueueItem>(applications: readonly T[], policy: AllocationPolicy): T[] {
  const confirmed = applications.filter((item) => item.confirmedOn !== null);
  const waiting = applications.filter((item) => item.confirmedOn === null);

  const sorted = [...confirmed].sort((a, b) => {
    if (policy === 'cadre-priority') {
      const rank = Number(hasPriority(b.cadre)) - Number(hasPriority(a.cadre));
      if (rank !== 0) return rank;
    }

    const byDate = (a.confirmedOn ?? '').localeCompare(b.confirmedOn ?? '');
    if (byDate !== 0) return byDate;

    if (policy === 'cadre-priority-same-day') {
      const rank = Number(hasPriority(b.cadre)) - Number(hasPriority(a.cadre));
      if (rank !== 0) return rank;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });

  const queue = [...waiting].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return [...sorted, ...queue];
}

/** 1-based position in the allocation queue, or null before the deposit is confirmed. */
export function queuePosition<T extends QueueItem>(
  applications: readonly T[],
  application: T,
  policy: AllocationPolicy,
): number | null {
  if (application.confirmedOn === null) return null;
  const index = allocationOrder(applications, policy).findIndex((item) => item.id === application.id);
  return index >= 0 ? index + 1 : null;
}

/** Why an application sits where it does, in one line. */
export function positionReason(application: { confirmedOn: string | null; cadre: Cadre }, policy: AllocationPolicy): string {
  if (application.confirmedOn === null) {
    return 'Your position is fixed when the secretariat confirms the deposit.';
  }

  const when = formatDate(application.confirmedOn);

  if (policy === 'first-come') {
    return `Confirmed ${when}. Cadre is not considered under the current rule.`;
  }

  if (policy === 'cadre-priority') {
    return hasPriority(application.cadre)
      ? `${application.cadre} is a priority grade, so you rank ahead of ${SENIOR_BAND_LABEL} regardless of payment date.`
      : `${application.cadre} is not a priority grade, so ${PRIORITY_BAND_LABEL} rank ahead of you whatever the payment date.`;
  }

  return hasPriority(application.cadre)
    ? `Confirmed ${when}. ${application.cadre} ranks ahead of ${SENIOR_BAND_LABEL} on the same date.`
    : `Confirmed ${when}. ${PRIORITY_BAND_LABEL} confirmed on the same date rank ahead of you.`;
}
