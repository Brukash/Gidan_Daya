import type { Cadre } from './grades';

/** The cooperative's grades, ranks 01–17; see `grades.ts`. */
export type { Cadre };

/** Where a member stands with the cooperative, as the secretariat records it. */
export type MemberCategory = 'active' | 'retiree' | 'pensioner' | 'coop-staff';

export type HouseDesign = 'semi-detached' | 'detached';

export type ApplicationStatus = 'reserved' | 'deposit-paid' | 'fully-paid' | 'allocated';

export type MemberRole = 'member' | 'admin';

/**
 * How the queue is ordered. The call says allocation is first-come by payment
 * confirmation, and also that lower cadres get priority; these settings are the
 * three readings of that, chosen by the secretariat.
 */
export type AllocationPolicy = 'first-come' | 'cadre-priority-same-day' | 'cadre-priority';

export type PaymentKind = 'application-fee' | 'deposit' | 'balance';

export type EvidenceStatus = 'pending' | 'verified' | 'rejected';

export type ReviewDecision = 'verified' | 'rejected';

export interface Scheme {
  name: string;
  estate: string;
  location: string;
  /** Naira per square metre, infrastructure inclusive. */
  pricePerSqm: number;
  /** Non-refundable application fee, in naira. */
  applicationFee: number;
  opensOn: string;
  closesOn: string;
  depositDueOn: string;
  balanceDueOn: string;
  /** One line the secretariat publishes above the pages; an empty string hides it. */
  notice: string;
}

/** The inspection dates, published from the same place as the scheme figures. */
export interface SiteVisit {
  dates: string[];
  time: string;
  meetingPoint: string;
}

/** Everything the secretariat publishes: the scheme's figures and the site visits. */
export interface SchemeContent {
  scheme: Scheme;
  siteVisit: SiteVisit;
}

export interface SchemeSettings {
  allocationPolicy: AllocationPolicy;
}

export interface PlotTier {
  id: string;
  sizeSqm: number;
  totalPlots: number;
  allocated: number;
}

export interface Application {
  id: string;
  reference: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  cadre: Cadre;
  memberCategory: MemberCategory;
  sizeSqm: number;
  houseDesign: HouseDesign;
  /** sizeSqm x pricePerSqm at the time of application. */
  amount: number;
  paid: number;
  feePaid: boolean;
  status: ApplicationStatus;
  createdAt: string;
  /** Date the deposit or full payment was confirmed; null until then. */
  confirmedOn: string | null;
  /** Version of the acceptance text the applicant agreed to. */
  termsVersion: string;
  acceptedAt: string;
  /** Clause ids the applicant acknowledged, one by one. */
  acceptedClauses: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  memberNumber: string;
  cadre: Cadre;
  memberCategory: MemberCategory;
  role: MemberRole;
  joinedOn: string;
  plots: number;
  committed: number;
}

/** A receipt or bank evidence file attached to an application. */
export interface PaymentEvidence {
  id: string;
  applicationId: string;
  applicationReference: string;
  kind: PaymentKind;
  amount: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  /** Data URL in sample mode; null when the file lives in storage. */
  preview: string | null;
  status: EvidenceStatus;
  uploadedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

/** Append-only record of who did what, so a decision can be defended later. */
export interface AuditEvent {
  id: string;
  applicationId: string | null;
  actor: string;
  action: string;
  note: string;
  at: string;
}

export type DataMode = 'supabase' | 'sample';
