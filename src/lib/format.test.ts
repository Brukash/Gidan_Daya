import { describe, expect, it } from 'vitest';
import { daysUntil, formatCompactNaira, formatNaira, plural } from './format';

describe('formatNaira', () => {
  it('formats whole naira with the narrow symbol', () => {
    expect(formatNaira(1_280_000)).toMatch(/^₦1,280,000$/);
  });

  it('never shows kobo for whole amounts', () => {
    expect(formatNaira(250_000)).not.toContain('.');
  });
});

describe('formatCompactNaira', () => {
  it('compacts millions and billions', () => {
    expect(formatCompactNaira(1_280_000)).toBe('₦1.3m');
    expect(formatCompactNaira(2_400_000_000)).toBe('₦2.4b');
  });

  it('rounds to thousands above ten thousand', () => {
    expect(formatCompactNaira(12_900)).toBe('₦13k');
  });

  it('leaves small amounts exact', () => {
    expect(formatCompactNaira(9_500)).toBe(formatNaira(9_500));
  });
});

describe('daysUntil', () => {
  it('counts calendar days forward and backward', () => {
    const from = new Date('2026-11-18T09:00:00');
    expect(daysUntil('2026-11-25', from)).toBe(7);
    expect(daysUntil('2026-11-10', from)).toBe(-8);
  });
});

describe('plural', () => {
  it('agrees with the count', () => {
    expect(plural(1, 'unit')).toBe('unit');
    expect(plural(3, 'unit')).toBe('units');
  });
});
