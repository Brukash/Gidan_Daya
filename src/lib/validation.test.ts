import { describe, expect, it } from 'vitest';
import { applicationProblem, applicationSchema, signInSchema } from './validation';

const OPEN = [
  { sizeSqm: 200, remaining: 0 },
  { sizeSqm: 300, remaining: 12 },
  { sizeSqm: 400, remaining: 5 },
];

describe('applicationProblem', () => {
  it('accepts a size that still has plots', () => {
    expect(applicationProblem(300, OPEN)).toBeNull();
  });

  it('rejects a size outside the scheme', () => {
    expect(applicationProblem(650, OPEN)).toBe('That plot size is not part of this scheme.');
  });

  it('rejects an allocated size', () => {
    expect(applicationProblem(200, OPEN)).toBe('200 sqm plots are fully allocated.');
  });

  it('rejects a value that is not a number', () => {
    expect(applicationProblem(Number.NaN, OPEN)).toBe('Choose a plot size.');
  });
});

describe('applicationSchema', () => {
  const schema = applicationSchema([300, 400]);

  const valid = {
    sizeSqm: 300,
    houseDesign: 'semi-detached' as const,
    memberNumber: 'CBN/2019/0417',
    cadre: 'Assistant Manager' as const,
    acceptTerms: true,
  };

  it('passes a complete application', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('rejects a plot size that is no longer open', () => {
    const result = schema.safeParse({ ...valid, sizeSqm: 200 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('That plot size is fully allocated.');
  });

  it('requires the terms to be accepted', () => {
    const result = schema.safeParse({ ...valid, acceptTerms: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/accept the terms/i);
  });

  it('rejects an ID number with spaces or symbols', () => {
    expect(schema.safeParse({ ...valid, memberNumber: 'CBN 2019 0417' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, memberNumber: 'CBN/2019/0417#' }).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('requires a valid email and an eight character password', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'longenough' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'short' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'gidandaya' }).success).toBe(true);
  });
});
