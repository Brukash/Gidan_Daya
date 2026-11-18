import type { ApplicationStatus, Cadre, PlotTier, Scheme } from '../data/types';
import { daysUntil } from './format';

export const PASSBOOK_TICKS = 24;

/** Cadres that the call gives priority to: Clerk through Assistant Manager. */
const PRIORITY_CADRES: Cadre[] = ['Clerk', 'Executive Officer', 'Assistant Manager'];

export function hasPriority(cadre: Cadre): boolean {
  return PRIORITY_CADRES.includes(cadre);
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
