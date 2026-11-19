import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT } from '../data/seed';
import {
  contentFromValues,
  describeContentChanges,
  formFromContent,
  parseContentForm,
  tierTotalsProblem,
} from './content';

const published = () => ({ ...formFromContent(DEFAULT_CONTENT) });

describe('published content', () => {
  it('round-trips the issued figures without changing them', () => {
    const parsed = parseContentForm(published());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(contentFromValues(parsed.data, DEFAULT_CONTENT)).toEqual(DEFAULT_CONTENT);
    expect(describeContentChanges(DEFAULT_CONTENT, DEFAULT_CONTENT)).toEqual([]);
  });

  it('will not close applications before they open', () => {
    const parsed = parseContentForm({ ...published(), closesOn: '2026-11-01' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.map((issue) => issue.path[0])).toContain('closesOn');
  });

  it('will not put the balance before the deposit', () => {
    const parsed = parseContentForm({ ...published(), balanceDueOn: '2027-01-01' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.map((issue) => issue.path[0])).toContain('balanceDueOn');
  });

  it('rejects an empty or negative rate and a negative fee', () => {
    expect(parseContentForm({ ...published(), pricePerSqm: '' }).success).toBe(false);
    expect(parseContentForm({ ...published(), pricePerSqm: '-27000' }).success).toBe(false);
    expect(parseContentForm({ ...published(), applicationFee: '-1' }).success).toBe(false);
  });

  it('allows a zero fee, because the cooperative may waive it', () => {
    expect(parseContentForm({ ...published(), applicationFee: '0' }).success).toBe(true);
  });

  it('describes what a change alters, for the audit note', () => {
    const parsed = parseContentForm({ ...published(), pricePerSqm: '30000' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const changes = describeContentChanges(DEFAULT_CONTENT, contentFromValues(parsed.data, DEFAULT_CONTENT));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatch(/Rate/);
  });

  it('will not cut a tier below what is already allocated', () => {
    expect(tierTotalsProblem(10, 17)).toMatch(/already allocated/);
    expect(tierTotalsProblem(20, 17)).toBeNull();
    expect(tierTotalsProblem(3.5, 0)).toMatch(/whole number/);
    expect(tierTotalsProblem(Number.NaN, 0)).toMatch(/whole number/);
  });
});
