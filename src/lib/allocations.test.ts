import { describe, expect, it } from 'vitest';
import {
  allocationPercent,
  depositFor,
  describeTier,
  filledTicks,
  hasPriority,
  milestoneLabel,
  outstandingFor,
  priceForPlot,
  remainingPlots,
  schemeTotals,
  sumBy,
  PASSBOOK_TICKS,
} from './allocations';
import { SAMPLE_TIERS, SCHEME } from '../data/seed';

describe('priceForPlot', () => {
  it('prices each plot at the published rate per square metre', () => {
    expect(priceForPlot(200, 27_000)).toBe(5_400_000);
    expect(priceForPlot(300, 27_000)).toBe(8_100_000);
    expect(priceForPlot(400, 27_000)).toBe(10_800_000);
    expect(priceForPlot(500, 27_000)).toBe(13_500_000);
  });

  it('defaults to the scheme rate', () => {
    expect(priceForPlot(400)).toBe(10_800_000);
  });
});

describe('depositFor', () => {
  it('is exactly half of the plot price', () => {
    expect(depositFor(8_100_000)).toBe(4_050_000);
    expect(depositFor(5_400_001)).toBe(2_700_001);
  });
});

describe('remainingPlots and allocationPercent', () => {
  it('never goes below zero', () => {
    expect(remainingPlots({ allocated: 44, totalPlots: 44 })).toBe(0);
    expect(remainingPlots({ allocated: 50, totalPlots: 44 })).toBe(0);
  });

  it('rounds percentages and guards an empty tier', () => {
    expect(allocationPercent(1, 4)).toBe(25);
    expect(allocationPercent(17, 44)).toBe(39);
    expect(allocationPercent(0, 0)).toBe(0);
  });
});

describe('describeTier', () => {
  const opens = new Date('2026-11-18T09:00:00');

  it('reports an exhausted tier before anything else', () => {
    expect(describeTier({ allocated: 10, totalPlots: 10 }, '2026-11-20', opens).state).toBe('exhausted');
  });

  it('reports closing soon inside the last thirty days', () => {
    expect(describeTier({ allocated: 1, totalPlots: 44 }, '2026-12-10', opens).state).toBe('limited');
  });

  it('reports closed after the closing date', () => {
    expect(describeTier({ allocated: 1, totalPlots: 44 }, '2026-11-01', opens).state).toBe('closed');
  });

  it('reports available otherwise', () => {
    expect(describeTier({ allocated: 1, totalPlots: 44 }, '2027-03-01', opens).state).toBe('available');
  });
});

describe('passbook ticks', () => {
  it('fills proportionally and caps at the tick count', () => {
    expect(filledTicks(0, 44)).toBe(0);
    expect(filledTicks(22, 44)).toBe(PASSBOOK_TICKS / 2);
    expect(filledTicks(44, 44)).toBe(PASSBOOK_TICKS);
    expect(filledTicks(90, 44)).toBe(PASSBOOK_TICKS);
  });
});

describe('cadre priority', () => {
  it('gives priority to Clerk through Assistant Manager', () => {
    expect(hasPriority('Clerk')).toBe(true);
    expect(hasPriority('Executive Officer')).toBe(true);
    expect(hasPriority('Assistant Manager')).toBe(true);
  });

  it('does not extend priority to Manager and above', () => {
    expect(hasPriority('Manager')).toBe(false);
    expect(hasPriority('Senior Manager')).toBe(false);
  });
});

describe('payment position', () => {
  const application = { amount: 8_100_000, paid: 4_050_000, feePaid: true };

  it('reports the outstanding balance', () => {
    expect(outstandingFor(application)).toBe(4_050_000);
    expect(outstandingFor({ amount: 8_100_000, paid: 9_000_000 })).toBe(0);
  });

  it('names the next milestone', () => {
    expect(milestoneLabel({ ...application, paid: 0 })).toBe('50% deposit outstanding');
    expect(milestoneLabel(application)).toBe('Final balance outstanding');
    expect(milestoneLabel({ ...application, paid: 8_100_000 })).toBe('Fully paid — allocation letter due');
    expect(milestoneLabel({ ...application, feePaid: false })).toBe('Application fee outstanding');
  });
});

describe('scheme totals', () => {
  const totals = schemeTotals(SAMPLE_TIERS, SCHEME);

  it('matches the call document: 102 plots', () => {
    expect(totals.plots).toBe(102);
    expect(totals.squareMetres).toBe(200 * 4 + 300 * 44 + 400 * 44 + 500 * 10);
  });

  it('values the scheme at the published rate', () => {
    expect(totals.value).toBe(totals.squareMetres * SCHEME.pricePerSqm);
    expect(totals.remaining).toBe(totals.plots - totals.allocated);
  });
});

describe('sumBy', () => {
  it('adds a picked field', () => {
    expect(sumBy([{ paid: 10 }, { paid: 32 }], (item) => item.paid)).toBe(42);
  });
});
