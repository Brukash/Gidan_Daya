import type { Application, Member, PlotTier, Scheme } from './types';

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
};

export const SITE_VISIT = {
  time: '10:00',
  meetingPoint:
    'The National Ecumenical Centre, opposite CBN Head Office back entrance, CBD, FCT Abuja',
  dates: ['2026-11-28', '2026-12-05'],
} as const;

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

export const SAMPLE_MEMBERS: Member[] = [
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
    cadre: 'Executive Officer',
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

/** Sample applications. Invented applicants, so the register and reports have content. */
export const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: 'a-2001',
    reference: 'GD-300-0012',
    memberId: 'm-001',
    memberName: 'Aisha Bello',
    memberNumber: 'CBN/2019/0417',
    cadre: 'Assistant Manager',
    sizeSqm: 300,
    houseDesign: 'semi-detached',
    amount: 8_100_000,
    paid: 4_050_000,
    feePaid: true,
    status: 'deposit-paid',
    createdAt: '2026-11-09',
  },
  {
    id: 'a-2002',
    reference: 'GD-400-0007',
    memberId: 'm-002',
    memberName: 'Emeka Obi',
    memberNumber: 'CBN/2020/1183',
    cadre: 'Manager',
    sizeSqm: 400,
    houseDesign: 'detached',
    amount: 10_800_000,
    paid: 10_800_000,
    feePaid: true,
    status: 'fully-paid',
    createdAt: '2026-11-06',
  },
  {
    id: 'a-2003',
    reference: 'GD-200-0002',
    memberId: 'm-003',
    memberName: 'Fatima Sule',
    memberNumber: 'CBN/2021/2045',
    cadre: 'Clerk',
    sizeSqm: 200,
    houseDesign: 'semi-detached',
    amount: 5_400_000,
    paid: 0,
    feePaid: true,
    status: 'reserved',
    createdAt: '2026-11-12',
  },
  {
    id: 'a-2004',
    reference: 'GD-500-0003',
    memberId: 'm-004',
    memberName: 'Tunde Ajayi',
    memberNumber: 'CBN/2018/0088',
    cadre: 'Senior Manager',
    sizeSqm: 500,
    houseDesign: 'detached',
    amount: 13_500_000,
    paid: 6_750_000,
    feePaid: true,
    status: 'deposit-paid',
    createdAt: '2026-11-04',
  },
  {
    id: 'a-2005',
    reference: 'GD-300-0014',
    memberId: 'm-005',
    memberName: 'Ngozi Eze',
    memberNumber: 'CBN/2022/3011',
    cadre: 'Executive Officer',
    sizeSqm: 300,
    houseDesign: 'detached',
    amount: 8_100_000,
    paid: 8_100_000,
    feePaid: true,
    status: 'allocated',
    createdAt: '2026-11-03',
  },
];
