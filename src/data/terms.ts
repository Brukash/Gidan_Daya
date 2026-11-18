/**
 * The acceptance text an applicant must acknowledge before an application is
 * created. Each clause is acknowledged separately and the accepted ids are
 * stored on the application, so the record shows exactly what was agreed.
 */
export const TERMS_VERSION = 'Gidan Daya acceptance v1';

export const TERMS_EFFECTIVE_ON = '2026-11-03';

export interface TermsClause {
  id: 'refunds' | 'default' | 'variation' | 'title';
  title: string;
  /** One line the applicant must be able to repeat back. */
  headline: string;
  body: string;
  /** Where in the call the condition comes from. */
  source: string;
}

export const TERMS_CLAUSES: TermsClause[] = [
  {
    id: 'refunds',
    title: 'Refunds and resale',
    headline: 'Money is only returned after the plot is resold, and not in full.',
    body: 'Refunds are made only on written request, and only after the plot has been resold. Penalties and administrative charges of up to 5% of the amount paid are deducted, and infrastructure funds already applied to site works are not refundable. Resale depends on demand and can take months, so a refund is not a short-notice exit.',
    source: 'Call for indication of interest — refunds and cancellation',
  },
  {
    id: 'default',
    title: 'Default and late payment',
    headline: 'Missing an instalment costs money and can cost the plot.',
    body: 'If a scheduled payment is missed, the cooperative may apply administrative charges and interest at the prevailing project loan rate. A member who stays in default may have the plot reallocated without further notice, and reallocation does not create an entitlement to the plot price back.',
    source: 'Call for indication of interest — payment terms',
  },
  {
    id: 'variation',
    title: 'Plot size after survey',
    headline: 'The surveyed size decides what you pay, up or down.',
    body: 'Plot sizes are subject to the size allocated after survey. Where the surveyed plot is larger, the additional square metres are payable by the subscriber at the published rate of ₦27,000 per sqm. Where it is smaller, the excess already paid is refunded unconditionally.',
    source: 'Call for indication of interest — plot size and variation',
  },
  {
    id: 'title',
    title: 'Title perfection costs',
    headline: 'The subscriber pays to perfect title; the cooperative issues the letters.',
    body: 'A temporary allocation letter is issued after full payment, and permanent allocation follows completion of the building to 100%. File opening, survey fees, ground rent, stamp duty, registration, governor\'s consent and all FCTA charges connected with perfecting title are borne by the subscriber, not the cooperative.',
    source: 'Call for indication of interest — allocation and title',
  },
];

export function acceptedAllClauses(accepted: readonly string[]): boolean {
  return TERMS_CLAUSES.every((clause) => accepted.includes(clause.id));
}
