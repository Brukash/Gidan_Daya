import { z } from 'zod';

export const MIN_UNITS = 1;
export const MAX_UNITS_PER_SUBSCRIPTION = 50;

/**
 * Single source of truth for subscription validation, used by the form and the
 * tests alike so the rule cannot drift between them.
 */
export function subscriptionProblem(units: number, remaining: number): string | null {
  if (!Number.isFinite(units)) return 'Enter a number of units.';
  if (!Number.isInteger(units)) return 'Enter a whole number of units.';
  if (units < MIN_UNITS) return 'Subscribe for at least one unit.';
  // Capacity is the constraint the member is reading about, so it is reported
  // before the generic per-subscription cap.
  if (units > remaining) {
    return remaining === 0
      ? 'This project is fully subscribed.'
      : `Only ${remaining} ${remaining === 1 ? 'unit is' : 'units are'} left on this project.`;
  }
  if (units > MAX_UNITS_PER_SUBSCRIPTION) {
    return `A single subscription is capped at ${MAX_UNITS_PER_SUBSCRIPTION} units.`;
  }
  return null;
}

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export function subscribeSchema(remaining: number) {
  return z.object({
    units: z
      .number({ error: 'Enter a number of units.' })
      .int('Enter a whole number of units.')
      .min(MIN_UNITS, 'Subscribe for at least one unit.')
      .max(MAX_UNITS_PER_SUBSCRIPTION, `A single subscription is capped at ${MAX_UNITS_PER_SUBSCRIPTION} units.`)
      .refine((units) => units <= remaining, {
        message:
          remaining === 0
            ? 'This project is fully subscribed.'
            : `Only ${remaining} ${remaining === 1 ? 'unit is' : 'units are'} left on this project.`,
      }),
  });
}

export type SubscribeValues = z.infer<ReturnType<typeof subscribeSchema>>;
