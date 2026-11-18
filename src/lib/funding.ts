import type { Project } from '../data/types';
import { daysUntil } from './format';

export const PASSBOOK_TICKS = 24;

export function fundingPercent(unitsTaken: number, totalUnits: number): number {
  if (totalUnits <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((unitsTaken / totalUnits) * 100)));
}

export function remainingUnits(project: Pick<Project, 'unitsTaken' | 'totalUnits'>): number {
  return Math.max(0, project.totalUnits - project.unitsTaken);
}

export type ProjectState = 'open' | 'closing' | 'funded' | 'closed';

export interface ProjectStatus {
  state: ProjectState;
  label: string;
  detail: string;
}

/**
 * Status is derived, never stored, so a project cannot claim to be open while
 * its units are exhausted or its closing date has passed.
 */
export function describeProject(
  project: Pick<Project, 'unitsTaken' | 'totalUnits' | 'closesOn'>,
  today: Date = new Date(),
): ProjectStatus {
  const left = remainingUnits(project);
  const days = daysUntil(project.closesOn, today);

  if (left === 0) {
    return { state: 'funded', label: 'Fully subscribed', detail: 'No units remain' };
  }
  if (days < 0) {
    return { state: 'closed', label: 'Closed', detail: `Closed ${Math.abs(days)} days ago` };
  }
  if (days <= 30) {
    return {
      state: 'closing',
      label: 'Closing soon',
      detail: `${days} ${days === 1 ? 'day' : 'days'} left`,
    };
  }
  return { state: 'open', label: 'Open', detail: `${left} units left` };
}

export function filledTicks(unitsTaken: number, totalUnits: number, ticks: number = PASSBOOK_TICKS): number {
  if (totalUnits <= 0) return 0;
  return Math.round((Math.min(unitsTaken, totalUnits) / totalUnits) * ticks);
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}
