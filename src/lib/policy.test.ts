import { describe, expect, it } from 'vitest';
import { allocationOrder, describePolicy, positionReason, queuePosition } from './allocations';
import type { Cadre } from '../data/types';

interface Fixture {
  id: string;
  cadre: Cadre;
  amount: number;
  paid: number;
  createdAt: string;
  confirmedOn: string | null;
}

const SENIOR_EARLY: Fixture = {
  id: 'senior-early',
  cadre: 'Senior Manager',
  amount: 13_500_000,
  paid: 6_750_000,
  createdAt: '2026-11-04',
  confirmedOn: '2026-11-10',
};

const SENIOR_LATE: Fixture = {
  id: 'senior-late',
  cadre: 'Manager',
  amount: 8_100_000,
  paid: 4_050_000,
  createdAt: '2026-11-09',
  confirmedOn: '2026-11-12',
};

const JUNIOR_SAME_DAY: Fixture = {
  id: 'junior-same-day',
  cadre: 'Clerk',
  amount: 5_400_000,
  paid: 2_700_000,
  createdAt: '2026-11-11',
  confirmedOn: '2026-11-12',
};

const JUNIOR_LATE: Fixture = {
  id: 'junior-late',
  cadre: 'Assistant Manager',
  amount: 8_100_000,
  paid: 4_050_000,
  createdAt: '2026-11-13',
  confirmedOn: '2026-11-20',
};

const UNCONFIRMED: Fixture = {
  id: 'unconfirmed',
  cadre: 'Clerk',
  amount: 5_400_000,
  paid: 0,
  createdAt: '2026-11-02',
  confirmedOn: null,
};

const ALL = [SENIOR_EARLY, SENIOR_LATE, JUNIOR_SAME_DAY, JUNIOR_LATE, UNCONFIRMED];

describe('allocationOrder under first-come', () => {
  it('orders strictly by payment confirmation date and ignores cadre', () => {
    expect(allocationOrder(ALL, 'first-come').map((item) => item.id)).toEqual([
      'senior-early',
      'senior-late',
      'junior-same-day',
      'junior-late',
      'unconfirmed',
    ]);
  });

  it('leaves applications without a confirmed deposit at the back', () => {
    const order = allocationOrder(ALL, 'first-come');
    expect(order[order.length - 1]?.id).toBe('unconfirmed');
  });
});

describe('allocationOrder under payment date then cadre', () => {
  it('keeps the date order but lets the junior applicant ahead on the same date', () => {
    expect(allocationOrder(ALL, 'cadre-priority-same-day').map((item) => item.id)).toEqual([
      'senior-early',
      'junior-same-day',
      'senior-late',
      'junior-late',
      'unconfirmed',
    ]);
  });
});

describe('allocationOrder under cadre first', () => {
  it('places every priority cadre ahead of managers, whatever the date', () => {
    expect(allocationOrder(ALL, 'cadre-priority').map((item) => item.id)).toEqual([
      'junior-same-day',
      'junior-late',
      'senior-early',
      'senior-late',
      'unconfirmed',
    ]);
  });
});

describe('queuePosition', () => {
  it('is null until the deposit is confirmed', () => {
    expect(queuePosition(ALL, UNCONFIRMED, 'first-come')).toBeNull();
  });

  it('counts confirmed applications only', () => {
    expect(queuePosition(ALL, SENIOR_EARLY, 'first-come')).toBe(1);
    expect(queuePosition(ALL, JUNIOR_LATE, 'first-come')).toBe(4);
    expect(queuePosition(ALL, JUNIOR_LATE, 'cadre-priority')).toBe(2);
  });
});

describe('describePolicy', () => {
  it('covers every policy with a label, summary and detail', () => {
    for (const policy of ['first-come', 'cadre-priority-same-day', 'cadre-priority'] as const) {
      const option = describePolicy(policy);
      expect(option.id).toBe(policy);
      expect(option.label.length).toBeGreaterThan(3);
      expect(option.summary.length).toBeGreaterThan(10);
      expect(option.detail.length).toBeGreaterThan(30);
    }
  });
});

describe('positionReason', () => {
  it('explains an unconfirmed application', () => {
    expect(positionReason(UNCONFIRMED, 'first-come')).toMatch(/confirms the deposit/i);
  });

  it('explains grade priority only where the rule uses it', () => {
    expect(positionReason(JUNIOR_SAME_DAY, 'first-come')).toMatch(/cadre is not considered/i);
    expect(positionReason(JUNIOR_SAME_DAY, 'cadre-priority')).toMatch(/priority grade/i);
    expect(positionReason(SENIOR_LATE, 'cadre-priority')).toMatch(/not a priority grade/i);
    expect(positionReason(SENIOR_LATE, 'cadre-priority-same-day')).toMatch(/rank ahead of you/i);
  });
});
