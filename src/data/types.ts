export type Cadre = 'Clerk' | 'Executive Officer' | 'Assistant Manager' | 'Manager' | 'Senior Manager';

export type HouseDesign = 'semi-detached' | 'detached';

export type ApplicationStatus = 'reserved' | 'deposit-paid' | 'fully-paid' | 'allocated';

export type MemberRole = 'member' | 'admin';

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
  sizeSqm: number;
  houseDesign: HouseDesign;
  /** sizeSqm x pricePerSqm at the time of application. */
  amount: number;
  paid: number;
  feePaid: boolean;
  status: ApplicationStatus;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  memberNumber: string;
  cadre: Cadre;
  role: MemberRole;
  joinedOn: string;
  plots: number;
  committed: number;
}

export type DataMode = 'supabase' | 'sample';
