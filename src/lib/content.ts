import { z } from 'zod';
import type { SchemeContent } from '../data/types';
import { formatDate, formatNaira } from './format';

export const NOTICE_MAX = 240;
export const MAX_SITE_VISITS = 4;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateField(label: string) {
  return z
    .string()
    .trim()
    .regex(DATE, `${label}: use the date picker, or a date like 2026-12-30.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} is not a real date.`);
}

/**
 * The published content a secretariat can change. Everything else in the app
 * reads these figures, so the rules that keep them coherent live here rather
 * than in the form: a closing date after the opening, a balance after the
 * deposit, whole naira amounts.
 */
export function schemeContentSchema() {
  return z
    .object({
      pricePerSqm: z
        .number({ error: 'Enter the rate per square metre.' })
        .int('Use a whole naira amount.')
        .min(1_000, 'The rate must be at least ₦1,000 per sqm.')
        .max(1_000_000, 'That rate is above ₦1,000,000 per sqm.'),
      applicationFee: z
        .number({ error: 'Enter the application fee, or 0 for no fee.' })
        .int('Use a whole naira amount.')
        .min(0, 'The fee cannot be negative.')
        .max(10_000_000, 'That fee looks wrong.'),
      opensOn: dateField('Opening date'),
      closesOn: dateField('Closing date'),
      depositDueOn: dateField('Deposit date'),
      balanceDueOn: dateField('Balance date'),
      siteVisitDates: z
        .array(dateField('Visit date'))
        .max(MAX_SITE_VISITS, `Keep the list to ${MAX_SITE_VISITS} dates.`),
      siteVisitTime: z
        .string()
        .trim()
        .min(3, 'Say what time the buses leave.')
        .max(40, 'Keep the time under 40 characters.'),
      siteVisitMeetingPoint: z
        .string()
        .trim()
        .min(3, 'Say where the buses leave from.')
        .max(200, 'Keep the meeting point under 200 characters.'),
      notice: z.string().trim().max(NOTICE_MAX, `Keep the notice under ${NOTICE_MAX} characters.`),
    })
    .superRefine((value, ctx) => {
      if (value.closesOn <= value.opensOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['closesOn'],
          message: 'Applications have to close after they open.',
        });
      }
      if (value.depositDueOn < value.opensOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['depositDueOn'],
          message: 'The deposit cannot fall due before applications open.',
        });
      }
      if (value.balanceDueOn <= value.depositDueOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['balanceDueOn'],
          message: 'The balance has to fall due after the deposit.',
        });
      }
    });
}

export type SchemeContentValues = z.infer<ReturnType<typeof schemeContentSchema>>;

/** The editor works in strings so a field can be cleared while it is typed. */
export interface ContentForm {
  pricePerSqm: string;
  applicationFee: string;
  opensOn: string;
  closesOn: string;
  depositDueOn: string;
  balanceDueOn: string;
  siteVisitDates: string[];
  siteVisitTime: string;
  siteVisitMeetingPoint: string;
  notice: string;
}

export function formFromContent(content: SchemeContent): ContentForm {
  return {
    pricePerSqm: String(content.scheme.pricePerSqm),
    applicationFee: String(content.scheme.applicationFee),
    opensOn: content.scheme.opensOn,
    closesOn: content.scheme.closesOn,
    depositDueOn: content.scheme.depositDueOn,
    balanceDueOn: content.scheme.balanceDueOn,
    siteVisitDates: [...content.siteVisit.dates],
    siteVisitTime: content.siteVisit.time,
    siteVisitMeetingPoint: content.siteVisit.meetingPoint,
    notice: content.scheme.notice,
  };
}

function toNumber(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

export function parseContentForm(form: ContentForm) {
  return schemeContentSchema().safeParse({
    pricePerSqm: toNumber(form.pricePerSqm),
    applicationFee: toNumber(form.applicationFee),
    opensOn: form.opensOn,
    closesOn: form.closesOn,
    depositDueOn: form.depositDueOn,
    balanceDueOn: form.balanceDueOn,
    siteVisitDates: form.siteVisitDates.filter((date) => date.trim() !== ''),
    siteVisitTime: form.siteVisitTime,
    siteVisitMeetingPoint: form.siteVisitMeetingPoint,
    notice: form.notice,
  });
}

export function contentFromValues(values: SchemeContentValues, base: SchemeContent): SchemeContent {
  return {
    scheme: {
      ...base.scheme,
      pricePerSqm: values.pricePerSqm,
      applicationFee: values.applicationFee,
      opensOn: values.opensOn,
      closesOn: values.closesOn,
      depositDueOn: values.depositDueOn,
      balanceDueOn: values.balanceDueOn,
      notice: values.notice,
    },
    siteVisit: {
      dates: [...values.siteVisitDates],
      time: values.siteVisitTime,
      meetingPoint: values.siteVisitMeetingPoint,
    },
  };
}

/** The rate behind the form, or the live one while the field is unreadable. */
export function draftRate(form: ContentForm, fallback: number): number {
  const value = toNumber(form.pricePerSqm);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Plain-language list of what a draft would change, for the confirmation panel. */
export function describeContentChanges(before: SchemeContent, after: SchemeContent): string[] {
  const changes: string[] = [];
  const a = before.scheme;
  const b = after.scheme;

  if (a.pricePerSqm !== b.pricePerSqm) {
    changes.push(`Rate ${formatNaira(a.pricePerSqm)} → ${formatNaira(b.pricePerSqm)} per sqm`);
  }
  if (a.applicationFee !== b.applicationFee) {
    changes.push(`Application fee ${formatNaira(a.applicationFee)} → ${formatNaira(b.applicationFee)}`);
  }

  const dates: [string, string, string][] = [
    ['Applications open', a.opensOn, b.opensOn],
    ['Applications close', a.closesOn, b.closesOn],
    ['Deposit due', a.depositDueOn, b.depositDueOn],
    ['Balance due', a.balanceDueOn, b.balanceDueOn],
  ];
  for (const [label, from, to] of dates) {
    if (from !== to) changes.push(`${label} ${formatDate(from)} → ${formatDate(to)}`);
  }

  if (before.siteVisit.time !== after.siteVisit.time) {
    changes.push(`Visit time ${before.siteVisit.time} → ${after.siteVisit.time}`);
  }
  if (before.siteVisit.meetingPoint !== after.siteVisit.meetingPoint) {
    changes.push('Meeting point changed');
  }
  if (before.siteVisit.dates.join('|') !== after.siteVisit.dates.join('|')) {
    const from = before.siteVisit.dates.map((date) => formatDate(date)).join(', ');
    const to = after.siteVisit.dates.map((date) => formatDate(date)).join(', ');
    changes.push(`Visit dates ${from || 'none'} → ${to || 'none'}`);
  }

  if (a.notice !== b.notice) {
    changes.push(b.notice ? 'Notice published' : 'Notice cleared');
  }

  return changes;
}

export function tierTotalsProblem(total: number, allocated: number): string | null {
  if (!Number.isFinite(total) || !Number.isInteger(total)) return 'Enter a whole number of plots.';
  if (total < 0) return 'The count cannot be negative.';
  if (total > 1000) return 'Keep the count at 1,000 or below.';
  if (total < allocated) return `${allocated} already allocated, so the total cannot be lower.`;
  return null;
}
