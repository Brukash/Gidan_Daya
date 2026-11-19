import { z } from 'zod';
import type { Cadre, HouseDesign, MemberCategory } from '../data/types';
import { GRADE_NAMES } from '../data/grades';
import { TERMS_CLAUSES, acceptedAllClauses } from '../data/terms';

/** The cooperative's grades in rank order, for the application form. */
export const CADRES: Cadre[] = [...GRADE_NAMES];
export const MEMBER_CATEGORIES: { id: MemberCategory; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'retiree', label: 'Retiree' },
  { id: 'pensioner', label: 'Pensioner' },
  { id: 'coop-staff', label: 'Coop Staff' },
];

const MEMBER_CATEGORY_IDS = MEMBER_CATEGORIES.map((item) => item.id);

/** How a category reads on a receipt or in the register. */
export function memberCategoryLabel(value: string | null | undefined): string {
  return MEMBER_CATEGORIES.find((item) => item.id === value)?.label ?? 'Not stated';
}

export const HOUSE_DESIGNS: { id: HouseDesign; label: string }[] = [
  { id: 'semi-detached', label: '4-bedroom semi-detached duplex' },
  { id: 'detached', label: '4-bedroom detached duplex' },
];

/** 5 MB, matching the storage bucket limit in the migration. */
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const EVIDENCE_TYPE_LABEL = 'PNG, JPEG, WebP or PDF';

/**
 * The one rule that decides whether a plot application may proceed, shared by
 * the form and the tests so the two cannot drift.
 */
export function applicationProblem(
  sizeSqm: number,
  availableSizes: readonly { sizeSqm: number; remaining: number }[],
): string | null {
  if (!Number.isFinite(sizeSqm)) return 'Choose a plot size.';
  const tier = availableSizes.find((item) => item.sizeSqm === sizeSqm);
  if (!tier) return 'That plot size is not part of this scheme.';
  if (tier.remaining === 0) return `${sizeSqm} sqm plots are fully allocated.`;
  return null;
}

/** Step one of the application: the plot and the applicant's details. */
export function applicationDetailsSchema(availableSizes: readonly number[]) {
  return z.object({
    applicantName: z
      .string()
      .trim()
      .min(3, 'Enter the full name on your cooperative record.')
      .max(120, 'That name is too long.'),
    sizeSqm: z
      .number({ error: 'Choose a plot size.' })
      .refine((value) => availableSizes.includes(value), {
        message: 'That plot size is fully allocated.',
      }),
    houseDesign: z.enum(['semi-detached', 'detached']),
    memberNumber: z
      .string()
      .trim()
      .min(4, 'Enter your member ID.')
      .max(24, 'That ID number is too long.')
      .regex(/^[A-Za-z0-9/._-]+$/, 'Use letters, digits, slashes or dashes only.'),
    cadre: z.enum(GRADE_NAMES, { error: 'Choose your grade.' }),
    memberCategory: z.string().refine((value) => MEMBER_CATEGORY_IDS.includes(value as MemberCategory), {
      message: 'Choose your member category: Active, Retiree, Pensioner or Coop Staff.',
    }),
  });
}

export type ApplicationDetails = z.infer<ReturnType<typeof applicationDetailsSchema>>;

/** The whole application, including every acknowledged condition. */
export function applicationSchema(availableSizes: readonly number[]) {
  return applicationDetailsSchema(availableSizes).extend({
    acceptedClauses: z
      .array(z.string())
      .refine((value) => acceptedAllClauses(value), {
        message: 'Acknowledge each of the four conditions before submitting.',
      }),
  });
}

export type ApplicationValues = z.infer<ReturnType<typeof applicationSchema>>;

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

/** Which clause ids are still unticked, for the acceptance step. */
export function pendingClauses(accepted: readonly string[]): string[] {
  return TERMS_CLAUSES.filter((clause) => !accepted.includes(clause.id)).map((clause) => clause.id);
}

/**
 * A payment file must be something the secretariat can actually open: an image
 * of a receipt or a PDF, within the size the bucket accepts.
 */
export function evidenceProblem(file: { type: string; size: number } | null): string | null {
  if (!file) return 'Attach the receipt or bank evidence.';
  if (file.size === 0) return 'That file is empty.';
  if (!EVIDENCE_TYPES.includes(file.type)) return `Attach a ${EVIDENCE_TYPE_LABEL} file.`;
  if (file.size > EVIDENCE_MAX_BYTES) return 'Files must be 5 MB or smaller.';
  return null;
}

/** A rejection must be explicable: the note goes into the audit trail. */
export function reviewNoteProblem(note: string, decision: 'verified' | 'rejected'): string | null {
  const trimmed = note.trim();
  if (decision === 'rejected') {
    if (trimmed.length < 8) return 'Say what is wrong with the evidence — at least 8 characters.';
    if (trimmed.length > 500) return 'Keep the note under 500 characters.';
    return null;
  }
  if (trimmed.length > 500) return 'Keep the note under 500 characters.';
  return null;
}

export function paymentAmountProblem(amount: number, outstanding: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount that was paid.';
  if (amount > outstanding)
    return 'That is more than the outstanding balance on this application.';
  return null;
}
