import { describe, expect, it } from 'vitest';
import { MAX_UNITS_PER_SUBSCRIPTION, signInSchema, subscribeSchema, subscriptionProblem } from './validation';

describe('subscriptionProblem', () => {
  it('accepts a valid unit count', () => {
    expect(subscriptionProblem(3, 62)).toBeNull();
  });

  it('rejects zero, negatives and fractions', () => {
    expect(subscriptionProblem(0, 62)).toMatch(/at least one unit/);
    expect(subscriptionProblem(-2, 62)).toMatch(/at least one unit/);
    expect(subscriptionProblem(1.5, 62)).toMatch(/whole number/);
  });

  it('rejects more units than remain', () => {
    expect(subscriptionProblem(63, 62)).toBe('Only 62 units are left on this project.');
    expect(subscriptionProblem(1, 0)).toBe('This project is fully subscribed.');
  });

  it('enforces the per-subscription cap', () => {
    expect(subscriptionProblem(MAX_UNITS_PER_SUBSCRIPTION + 1, 500)).toMatch(/capped/);
  });
});

describe('subscribeSchema', () => {
  it('passes a value inside capacity', () => {
    expect(subscribeSchema(10).safeParse({ units: 4 }).success).toBe(true);
  });

  it('fails a value above capacity with a readable message', () => {
    const result = subscribeSchema(2).safeParse({ units: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Only 2 units are left on this project.');
    }
  });
});

describe('signInSchema', () => {
  it('requires a valid email and an eight character password', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'longenough' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'short' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'gidandaya' }).success).toBe(true);
  });
});
