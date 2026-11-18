const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
  currencyDisplay: 'narrowSymbol',
});

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-NG', {
  day: '2-digit',
  month: 'short',
});

/** ₦1,280,000 */
export function formatNaira(value: number): string {
  return nairaFormatter.format(value);
}

/** ₦1.3m — for KPI figures where the exact naira would not be read anyway. */
export function formatCompactNaira(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}b`;
  if (abs >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 10_000) return `₦${Math.round(value / 1_000)}k`;
  return formatNaira(value);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function plural(count: number, singular: string, pluralLabel?: string): string {
  return count === 1 ? singular : (pluralLabel ?? `${singular}s`);
}
