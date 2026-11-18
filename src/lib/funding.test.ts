import { describe, expect, it } from 'vitest';
import { describeProject, filledTicks, fundingPercent, remainingUnits, sumBy } from './funding';

const base = { unitsTaken: 178, totalUnits: 240, closesOn: '2027-02-27' };

describe('fundingPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(fundingPercent(178, 240)).toBe(74);
  });

  it('clamps over-subscription and guards a zero total', () => {
    expect(fundingPercent(300, 240)).toBe(100);
    expect(fundingPercent(10, 0)).toBe(0);
  });
});

describe('remainingUnits', () => {
  it('never goes negative', () => {
    expect(remainingUnits(base)).toBe(62);
    expect(remainingUnits({ unitsTaken: 400, totalUnits: 240 })).toBe(0);
  });
});

describe('describeProject', () => {
  it('reports an open project with units left', () => {
    const status = describeProject(base, new Date('2026-11-18'));
    expect(status.state).toBe('open');
    expect(status.label).toBe('Open');
  });

  it('reports closing soon inside thirty days', () => {
    const status = describeProject({ ...base, closesOn: '2026-12-05' }, new Date('2026-11-18'));
    expect(status.state).toBe('closing');
    expect(status.detail).toBe('17 days left');
  });

  it('reports a project outside the thirty-day window as open', () => {
    const status = describeProject({ ...base, closesOn: '2027-01-30' }, new Date('2026-11-18'));
    expect(status.state).toBe('open');
    expect(status.detail).toBe('62 units left');
  });

  it('reports a fully subscribed project even if the date has passed', () => {
    const status = describeProject(
      { unitsTaken: 240, totalUnits: 240, closesOn: '2026-11-01' },
      new Date('2026-11-18'),
    );
    expect(status.state).toBe('funded');
  });

  it('reports a closed project when the date has passed', () => {
    const status = describeProject({ ...base, closesOn: '2026-11-01' }, new Date('2026-11-18'));
    expect(status.state).toBe('closed');
  });
});

describe('filledTicks', () => {
  it('fills the passbook proportionally', () => {
    expect(filledTicks(178, 240, 24)).toBe(18);
    expect(filledTicks(0, 240, 24)).toBe(0);
    expect(filledTicks(240, 240, 24)).toBe(24);
  });
});

describe('sumBy', () => {
  it('adds a projected field', () => {
    expect(sumBy([{ amount: 100 }, { amount: 50 }], (item) => item.amount)).toBe(150);
  });
});
