import type {
  AllocationPolicy,
  Application,
  Member,
  MemberCategory,
  PaymentEvidence,
  PlotTier,
  Scheme,
  SchemeContent,
  SchemeSettings,
  SiteVisit,
} from './types';
import { TERMS_CLAUSES, TERMS_VERSION } from './terms';

/**
 * Figures taken from the cooperative's "Call for Indication of Interest —
 * Gidan Daya" (plot sizes, 102 plots, ₦27,000/sqm, ₦20,000 fee, the payment
 * dates and the 30 December 2026 closing date).
 */
export const SCHEME: Scheme = {
  name: 'Gidan Daya residential plots',
  estate: 'CBN Staff Multipurpose Cooperative Society Estate',
  location: 'Gidan Daya, near Loyola Jesuit College, FCT Abuja',
  pricePerSqm: 27_000,
  applicationFee: 20_000,
  opensOn: '2026-11-03',
  closesOn: '2026-12-30',
  depositDueOn: '2027-01-30',
  balanceDueOn: '2027-06-30',
  notice: '',
};

export const SITE_VISIT: SiteVisit = {
  time: '10:00 am',
  meetingPoint:
    'The National Ecumenical Centre, opposite CBN Head Office back entrance, CBD, FCT Abuja',
  dates: ['2026-11-28', '2026-12-05'],
};

/**
 * The published content as the cooperative issued it. The secretariat edits a
 * copy of this through the admin portal; nothing below is rewritten in place.
 */
export const DEFAULT_CONTENT: SchemeContent = { scheme: SCHEME, siteVisit: SITE_VISIT };

/**
 * Default reading of the allocation rule: payment date decides, and within the
 * same date the lower cadres rank first. The secretariat can change it.
 */
export const DEFAULT_SETTINGS: SchemeSettings = { allocationPolicy: 'cadre-priority-same-day' };

/** Recorded on every application created in sample mode. */
const ACCEPTED = {
  termsVersion: TERMS_VERSION,
  acceptedClauses: TERMS_CLAUSES.map((clause) => clause.id),
};

/**
 * Plot inventory from the call: 4 x 200sqm, 44 x 300sqm, 44 x 400sqm, 10 x
 * 500sqm = 102 plots. `allocated` is sample data so the screens have something
 * to show; it is not a claim about how many plots have actually gone.
 */
export const SAMPLE_TIERS: PlotTier[] = [
  { id: 'tier-200', sizeSqm: 200, totalPlots: 4, allocated: 1 },
  { id: 'tier-300', sizeSqm: 300, totalPlots: 44, allocated: 17 },
  { id: 'tier-400', sizeSqm: 400, totalPlots: 44, allocated: 23 },
  { id: 'tier-500', sizeSqm: 500, totalPlots: 10, allocated: 4 },
];

const SAMPLE_CATEGORIES: MemberCategory[] = ['active', 'retiree', 'pensioner', 'coop-staff'];

const SAMPLE_MEMBER_ROWS: Omit<Member, 'memberCategory'>[] = [
  {
    id: 'm-001',
    name: 'Aisha Bello',
    email: 'aisha.bello@coop.example',
    memberNumber: 'CBN/2019/0417',
    cadre: 'Assistant Manager',
    role: 'admin',
    joinedOn: '2019-03-04',
    plots: 1,
    committed: 8_100_000,
  },
  {
    id: 'm-002',
    name: 'Emeka Obi',
    email: 'emeka.obi@coop.example',
    memberNumber: 'CBN/2020/1183',
    cadre: 'Manager',
    role: 'member',
    joinedOn: '2020-07-19',
    plots: 1,
    committed: 10_800_000,
  },
  {
    id: 'm-003',
    name: 'Fatima Sule',
    email: 'fatima.sule@coop.example',
    memberNumber: 'CBN/2021/2045',
    cadre: 'Clerk',
    role: 'member',
    joinedOn: '2021-01-11',
    plots: 1,
    committed: 5_400_000,
  },
  {
    id: 'm-004',
    name: 'Tunde Ajayi',
    email: 'tunde.ajayi@coop.example',
    memberNumber: 'CBN/2018/0088',
    cadre: 'Senior Manager',
    role: 'admin',
    joinedOn: '2018-05-22',
    plots: 1,
    committed: 13_500_000,
  },
  {
    id: 'm-005',
    name: 'Ngozi Eze',
    email: 'ngozi.eze@coop.example',
    memberNumber: 'CBN/2022/3011',
    cadre: 'Supervisor',
    role: 'member',
    joinedOn: '2022-02-08',
    plots: 1,
    committed: 8_100_000,
  },
  {
    id: 'm-006',
    name: 'Musa Danjuma',
    email: 'musa.danjuma@coop.example',
    memberNumber: 'CBN/2020/1276',
    cadre: 'Assistant Manager',
    role: 'member',
    joinedOn: '2020-11-30',
    plots: 1,
    committed: 10_800_000,
  },
  {
    id: 'm-007',
    name: 'Rukayat Lawal',
    email: 'rukayat.lawal@coop.example',
    memberNumber: 'CBN/2023/4102',
    cadre: 'Clerk',
    role: 'member',
    joinedOn: '2023-04-17',
    plots: 1,
    committed: 5_400_000,
  },
  {
    id: 'm-008',
    name: 'Chinedu Nwosu',
    email: 'chinedu.nwosu@coop.example',
    memberNumber: 'CBN/2021/2190',
    cadre: 'Manager',
    role: 'member',
    joinedOn: '2021-09-06',
    plots: 1,
    committed: 8_100_000,
  },
];

/** The sample register spreads the four categories so each one appears. */
export const SAMPLE_MEMBERS: Member[] = SAMPLE_MEMBER_ROWS.map((member, index) => ({
  ...member,
  memberCategory: SAMPLE_CATEGORIES[index % SAMPLE_CATEGORIES.length] ?? 'active',
}));

/** Sample applications. Invented applicants, so the register and reports have content. */
const SAMPLE_APPLICATION_ROWS: Omit<Application, 'memberCategory'>[] = [
  {
    id: 'a-2001',
    reference: 'GD-300-0012',
    memberId: 'm-001',
    memberName: 'Aisha Bello',
    applicantEmail: 'aisha.bello@coop.example',
    memberNumber: 'CBN/2019/0417',
    cadre: 'Assistant Manager',
    sizeSqm: 300,
    houseDesign: 'semi-detached',
    amount: 8_100_000,
    paid: 4_050_000,
    feePaid: true,
    status: 'deposit-paid',
    createdAt: '2026-11-09',
    confirmedOn: '2026-11-13',
    acceptedAt: '2026-11-09T11:20:00.000Z',
    ...ACCEPTED,
  },
  {
    id: 'a-2002',
    reference: 'GD-400-0007',
    memberId: 'm-002',
    memberName: 'Emeka Obi',
    applicantEmail: 'emeka.obi@coop.example',
    memberNumber: 'CBN/2020/1183',
    cadre: 'Manager',
    sizeSqm: 400,
    houseDesign: 'detached',
    amount: 10_800_000,
    paid: 10_800_000,
    feePaid: true,
    status: 'fully-paid',
    createdAt: '2026-11-06',
    confirmedOn: '2026-11-08',
    acceptedAt: '2026-11-06T09:05:00.000Z',
    ...ACCEPTED,
  },
  {
    id: 'a-2003',
    reference: 'GD-200-0002',
    memberId: 'm-003',
    memberName: 'Fatima Sule',
    applicantEmail: 'fatima.sule@coop.example',
    memberNumber: 'CBN/2021/2045',
    cadre: 'Clerk',
    sizeSqm: 200,
    houseDesign: 'semi-detached',
    amount: 5_400_000,
    paid: 0,
    feePaid: true,
    status: 'reserved',
    createdAt: '2026-11-12',
    confirmedOn: null,
    acceptedAt: '2026-11-12T15:40:00.000Z',
    ...ACCEPTED,
  },
  {
    id: 'a-2004',
    reference: 'GD-500-0003',
    memberId: 'm-004',
    memberName: 'Tunde Ajayi',
    applicantEmail: 'tunde.ajayi@coop.example',
    memberNumber: 'CBN/2018/0088',
    cadre: 'Senior Manager',
    sizeSqm: 500,
    houseDesign: 'detached',
    amount: 13_500_000,
    paid: 6_750_000,
    feePaid: true,
    status: 'deposit-paid',
    createdAt: '2026-11-04',
    confirmedOn: '2026-11-10',
    acceptedAt: '2026-11-04T08:55:00.000Z',
    ...ACCEPTED,
  },
  {
    id: 'a-2005',
    reference: 'GD-300-0014',
    memberId: 'm-005',
    memberName: 'Ngozi Eze',
    applicantEmail: 'ngozi.eze@coop.example',
    memberNumber: 'CBN/2022/3011',
    cadre: 'Supervisor',
    sizeSqm: 300,
    houseDesign: 'detached',
    amount: 8_100_000,
    paid: 8_100_000,
    feePaid: true,
    status: 'allocated',
    createdAt: '2026-11-03',
    confirmedOn: '2026-11-05',
    acceptedAt: '2026-11-03T10:30:00.000Z',
    ...ACCEPTED,
  },
];

/** An application takes its category from the member it belongs to. */
export const SAMPLE_APPLICATIONS: Application[] = SAMPLE_APPLICATION_ROWS.map((application) => ({
  ...application,
  memberCategory:
    SAMPLE_MEMBERS.find((member) => member.id === application.memberId)?.memberCategory ?? 'active',
}));

/** Sample payment evidence, so the verification step has something to review. */
export const SAMPLE_EVIDENCE: PaymentEvidence[] = [
  {
    id: 'ev-1001',
    applicationId: 'a-2001',
    applicationReference: 'GD-300-0012',
    kind: 'deposit',
    amount: 4_050_000,
    fileName: 'uba-credit-alert-13nov.pdf',
    fileType: 'application/pdf',
    fileSize: 184_320,
    preview: null,
    status: 'verified',
    uploadedAt: '2026-11-12T09:14:00.000Z',
    reviewedBy: 'Tunde Ajayi',
    reviewedAt: '2026-11-13T10:05:00.000Z',
    reviewNote: 'UBA credit alert matches the deposit; narration carries CBN/2019/0417.',
  },
  {
    id: 'ev-1002',
    applicationId: 'a-2002',
    applicationReference: 'GD-400-0007',
    kind: 'balance',
    amount: 5_400_000,
    fileName: 'final-transfer-receipt.jpg',
    fileType: 'image/jpeg',
    fileSize: 742_100,
    preview: null,
    status: 'verified',
    uploadedAt: '2026-11-07T16:22:00.000Z',
    reviewedBy: 'Aisha Bello',
    reviewedAt: '2026-11-08T09:12:00.000Z',
    reviewNote: 'Balance cleared in two transfers; both narrations quote the ID number.',
  },
  {
    id: 'ev-1003',
    applicationId: 'a-2004',
    applicationReference: 'GD-500-0003',
    kind: 'balance',
    amount: 6_750_000,
    fileName: 'gtb-transfer-16nov.jpg',
    fileType: 'image/jpeg',
    fileSize: 512_900,
    preview: null,
    status: 'pending',
    uploadedAt: '2026-11-16T11:48:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  },
];

/** Sample audit trail: what the register would show for the first applications. */
export const SAMPLE_AUDIT = [
  {
    id: 'au-1001',
    applicationId: 'a-2001',
    actor: 'Aisha Bello',
    action: 'Payment evidence verified',
    note: 'Deposit of ₦4,050,000 confirmed against the UBA project account.',
    at: '2026-11-13T10:05:00.000Z',
  },
  {
    id: 'au-1002',
    applicationId: 'a-2001',
    actor: 'Aisha Bello',
    action: 'Terms accepted',
    note: `${TERMS_VERSION} — refunds, default, plot-size variation and title costs acknowledged.`,
    at: '2026-11-09T11:20:00.000Z',
  },
  {
    id: 'au-1003',
    applicationId: 'a-2004',
    actor: 'Tunde Ajayi',
    action: 'Terms accepted',
    note: `${TERMS_VERSION} — refunds, default, plot-size variation and title costs acknowledged.`,
    at: '2026-11-04T08:55:00.000Z',
  },
  {
    id: 'au-1004',
    applicationId: null,
    actor: 'Tunde Ajayi',
    action: 'Allocation rule set',
    note: 'Payment date decides; lower cadre ranks first on the same date.',
    at: '2026-11-06T08:40:00.000Z',
  },
];

/** Kept for typing convenience in the repository. */
export const SAMPLE_POLICY: AllocationPolicy = DEFAULT_SETTINGS.allocationPolicy;
