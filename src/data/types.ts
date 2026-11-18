export type ProjectCategory = 'Housing' | 'Agro' | 'Energy' | 'Transport' | 'Property' | 'Education';

export interface Project {
  id: string;
  code: string;
  name: string;
  summary: string;
  category: ProjectCategory;
  unitPrice: number;
  totalUnits: number;
  unitsTaken: number;
  opensOn: string;
  closesOn: string;
}

export type SubscriptionStatus = 'active' | 'due' | 'completed';

export interface Subscription {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
  units: number;
  amount: number;
  paid: number;
  status: SubscriptionStatus;
  nextDueOn: string | null;
  createdAt: string;
}

export type MemberRole = 'member' | 'admin';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedOn: string;
  units: number;
  committed: number;
}

export interface Cycle {
  label: string;
  opensOn: string;
  closesOn: string;
}

export interface MonthlyCommitted {
  month: string;
  amount: number;
}

export type DataMode = 'supabase' | 'sample';
