import { z } from 'zod';
import type { Cadre, HouseDesign } from '../data/types';

export const CADRES: Cadre[] = ['Clerk', 'Executive Officer', 'Assistant Manager', 'Manager', 'Senior Manager'];
export const HOUSE_DESIGNS: { id: HouseDesign; label: string }[] = [
  { id: 'semi-detached', label: '4-bedroom semi-detached duplex' },
  { id: 'detached', label: '4-bedroom detached duplex' },
];

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

export function applicationSchema(availableSizes: readonly number[]) {
  return z.object({
    sizeSqm: z
      .number({ error: 'Choose a plot size.' })
      .refine((value) => availableSizes.includes(value), {
        message: 'That plot size is fully allocated.',
      }),
    houseDesign: z.enum(['semi-detached', 'detached']),
    memberNumber: z
      .string()
      .trim()
      .min(4, 'Enter your cooperative ID number.')
      .max(24, 'That ID number is too long.')
      .regex(/^[A-Za-z0-9/._-]+$/, 'Use letters, digits, slashes or dashes only.'),
    cadre: z.enum(['Clerk', 'Executive Officer', 'Assistant Manager', 'Manager', 'Senior Manager']),
    acceptTerms: z.boolean().refine((value) => value, {
      message: 'You must accept the terms before submitting.',
    }),
  });
}

export type ApplicationValues = z.infer<ReturnType<typeof applicationSchema>>;

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export type SignInValues = z.infer<typeof signInSchema>;
