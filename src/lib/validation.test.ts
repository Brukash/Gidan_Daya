import { describe, expect, it } from 'vitest';
import {
  applicationDetailsSchema,
  applicationProblem,
  applicationSchema,
  evidenceProblem,
  paymentAmountProblem,
  pendingClauses,
  reviewNoteProblem,
  signInSchema,
} from './validation';
import { TERMS_CLAUSES } from '../data/terms';

const OPEN = [
  { sizeSqm: 200, remaining: 0 },
  { sizeSqm: 300, remaining: 12 },
  { sizeSqm: 400, remaining: 5 },
];

const ALL_CLAUSES = TERMS_CLAUSES.map((clause) => clause.id);

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

describe('applicationDetailsSchema', () => {
  const schema = applicationDetailsSchema([300, 400]);

  const valid = {
    applicantName: 'Aisha Bello',
    sizeSqm: 300,
    houseDesign: 'semi-detached' as const,
    memberNumber: 'CBN/2019/0417',
    cadre: 'Assistant Manager' as const,
  };

  it('passes complete details without any acceptance yet', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('rejects a plot size that is no longer open', () => {
    const result = schema.safeParse({ ...valid, sizeSqm: 200 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('That plot size is fully allocated.');
  });

  it('rejects an ID number with spaces or symbols', () => {
    expect(schema.safeParse({ ...valid, memberNumber: 'CBN 2019 0417' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, memberNumber: 'CBN/2019/0417#' }).success).toBe(false);
  });

  it('needs a full name, because an applicant may not be signed in', () => {
    const result = schema.safeParse({ ...valid, applicantName: '  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Enter the full name on your cooperative record.');
    }
  });
});

describe('applicationSchema acceptance', () => {
  const schema = applicationSchema([300]);

  const base = {
    applicantName: 'Aisha Bello',
    sizeSqm: 300,
    houseDesign: 'detached' as const,
    memberNumber: 'CBN/2019/0417',
    cadre: 'Clerk' as const,
  };

  it('passes only when every condition is acknowledged', () => {
    expect(schema.safeParse({ ...base, acceptedClauses: ALL_CLAUSES }).success).toBe(true);
  });

  it('fails when one condition is not acknowledged', () => {
    const result = schema.safeParse({ ...base, acceptedClauses: ALL_CLAUSES.slice(0, 3) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/acknowledge each of the four conditions/i);
    }
  });

  it('fails when nothing is acknowledged', () => {
    expect(schema.safeParse({ ...base, acceptedClauses: [] }).success).toBe(false);
  });

  it('reports the unticked clause ids', () => {
    expect(pendingClauses(['refunds', 'default'])).toEqual(['variation', 'title']);
    expect(pendingClauses(ALL_CLAUSES)).toEqual([]);
  });
});

describe('evidenceProblem', () => {
  it('accepts a receipt image or PDF within the size limit', () => {
    expect(evidenceProblem({ type: 'image/jpeg', size: 512_000 })).toBeNull();
    expect(evidenceProblem({ type: 'application/pdf', size: 200_000 })).toBeNull();
  });

  it('requires a file', () => {
    expect(evidenceProblem(null)).toBe('Attach the receipt or bank evidence.');
  });

  it('rejects an empty file and an unsupported type', () => {
    expect(evidenceProblem({ type: 'image/png', size: 0 })).toBe('That file is empty.');
    expect(evidenceProblem({ type: 'application/zip', size: 2048 })).toMatch(/PNG, JPEG, WebP or PDF/);
  });

  it('rejects anything over five megabytes', () => {
    expect(evidenceProblem({ type: 'application/pdf', size: 5 * 1024 * 1024 })).toBeNull();
    expect(evidenceProblem({ type: 'application/pdf', size: 5 * 1024 * 1024 + 1 })).toBe(
      'Files must be 5 MB or smaller.',
    );
  });
});

describe('reviewNoteProblem', () => {
  it('allows a verification without a note', () => {
    expect(reviewNoteProblem('', 'verified')).toBeNull();
  });

  it('requires a reason when rejecting', () => {
    expect(reviewNoteProblem('', 'rejected')).toMatch(/at least 8 characters/);
    expect(reviewNoteProblem('wrong', 'rejected')).toMatch(/at least 8 characters/);
    expect(reviewNoteProblem('Amount does not match the alert', 'rejected')).toBeNull();
  });

  it('caps the note length', () => {
    expect(reviewNoteProblem('x'.repeat(501), 'verified')).toBe('Keep the note under 500 characters.');
  });
});

describe('paymentAmountProblem', () => {
  it('accepts a payment up to what is outstanding', () => {
    expect(paymentAmountProblem(4_050_000, 4_050_000)).toBeNull();
  });

  it('rejects zero and anything above the balance', () => {
    expect(paymentAmountProblem(0, 4_050_000)).toBe('Enter the amount that was paid.');
    expect(paymentAmountProblem(4_050_001, 4_050_000)).toMatch(/more than the outstanding balance/);
  });
});

describe('signInSchema', () => {
  it('requires a valid email and an eight character password', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'longenough' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'short' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'member@coop.example', password: 'gidandaya' }).success).toBe(true);
  });
});
