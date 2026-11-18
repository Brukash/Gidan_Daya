import type { Cadre, HouseDesign } from './types';
import { supabase } from '../lib/supabase';
import { priceForPlot } from '../lib/allocations';
import { SCHEME, SAMPLE_APPLICATIONS, SAMPLE_MEMBERS, SAMPLE_TIERS } from './seed';
import type { Application, Member, PlotTier } from './types';

const LOCAL_KEY = 'gidan-daya:applications';

function readLocal(): Application[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Application[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Application[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // Storage can be blocked; the session still works, figures just do not persist.
  }
}

interface TierRow {
  id: string;
  size_sqm: number;
  total_plots: number;
  allocated: number;
}

interface ApplicationRow {
  id: string;
  reference: string;
  member_id: string;
  member_number: string;
  cadre: Cadre;
  size_sqm: number;
  house_design: HouseDesign;
  amount: number;
  paid: number;
  fee_paid: boolean;
  status: Application['status'];
  created_at: string;
}

interface MemberRow {
  id: string;
  full_name: string;
  member_number: string;
  cadre: Cadre;
  role: Member['role'];
  joined_on: string;
}

export const isSampleMode = supabase === null;

/**
 * In sample mode the seed is the register; applications created in this browser
 * are counted back into the tier so availability moves when you apply. Nothing
 * here is presented as live cooperative data.
 */
function applyLocalAllocations(tiers: PlotTier[], local: Application[]): PlotTier[] {
  return tiers.map((tier) => {
    const extra = local.filter((item) => item.sizeSqm === tier.sizeSqm).length;
    return { ...tier, allocated: Math.min(tier.totalPlots, tier.allocated + extra) };
  });
}

export async function listTiers(): Promise<PlotTier[]> {
  if (!supabase) return applyLocalAllocations(SAMPLE_TIERS, readLocal());

  const { data, error } = await supabase.from('plot_tiers').select('*').order('size_sqm');
  if (error) throw new Error(error.message);
  return ((data ?? []) as TierRow[]).map((row) => ({
    id: row.id,
    sizeSqm: row.size_sqm,
    totalPlots: row.total_plots,
    allocated: row.allocated,
  }));
}

export async function listApplications(memberId?: string): Promise<Application[]> {
  if (!supabase) {
    const all = [...readLocal(), ...SAMPLE_APPLICATIONS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return memberId ? all.filter((item) => item.memberId === memberId) : all;
  }

  let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ApplicationRow[];
  const members = await listMembers();
  const names = new Map(members.map((member) => [member.id, member.name] as const));

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    memberId: row.member_id,
    memberName: names.get(row.member_id) ?? '',
    memberNumber: row.member_number,
    cadre: row.cadre,
    sizeSqm: row.size_sqm,
    houseDesign: row.house_design,
    amount: Number(row.amount),
    paid: Number(row.paid),
    feePaid: row.fee_paid,
    status: row.status,
    createdAt: row.created_at.slice(0, 10),
  }));
}

export async function listMembers(): Promise<Member[]> {
  if (!supabase) return SAMPLE_MEMBERS;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, member_number, cadre, role, joined_on')
    .order('full_name');
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MemberRow[];
  const applications = await listApplications();

  return rows.map((row) => {
    const own = applications.filter((item) => item.memberId === row.id);
    return {
      id: row.id,
      name: row.full_name,
      email: '',
      memberNumber: row.member_number,
      cadre: row.cadre,
      role: row.role,
      joinedOn: row.joined_on,
      plots: own.length,
      committed: own.reduce((sum, item) => sum + item.amount, 0),
    };
  });
}

export interface NewApplication {
  memberId: string;
  memberName: string;
  memberNumber: string;
  cadre: Cadre;
  sizeSqm: number;
  houseDesign: HouseDesign;
}

/** Creates an application. The amount always comes from the published rate per sqm. */
export async function createApplication(input: NewApplication): Promise<Application> {
  const amount = priceForPlot(input.sizeSqm, SCHEME.pricePerSqm);

  if (supabase) {
    const { data, error } = await supabase.rpc('create_plot_application', {
      p_size_sqm: input.sizeSqm,
      p_house_design: input.houseDesign,
      p_member_number: input.memberNumber,
      p_cadre: input.cadre,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as ApplicationRow | null;
    if (!row) throw new Error('The application was created but no record was returned.');
    return {
      id: row.id,
      reference: row.reference,
      memberId: row.member_id,
      memberName: input.memberName,
      memberNumber: row.member_number,
      cadre: row.cadre,
      sizeSqm: row.size_sqm,
      houseDesign: row.house_design,
      amount: Number(row.amount),
      paid: Number(row.paid),
      feePaid: row.fee_paid,
      status: row.status,
      createdAt: row.created_at.slice(0, 10),
    };
  }

  const local = readLocal();
  const sequence =
    SAMPLE_APPLICATIONS.filter((item) => item.sizeSqm === input.sizeSqm).length +
    local.filter((item) => item.sizeSqm === input.sizeSqm).length +
    1;

  const created: Application = {
    id: `local-${Date.now()}`,
    reference: `GD-${input.sizeSqm}-${String(sequence).padStart(4, '0')}`,
    memberId: input.memberId,
    memberName: input.memberName,
    memberNumber: input.memberNumber,
    cadre: input.cadre,
    sizeSqm: input.sizeSqm,
    houseDesign: input.houseDesign,
    amount,
    paid: 0,
    feePaid: true,
    status: 'reserved',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  writeLocal([...local, created]);
  return created;
}

/** Records the 50% deposit or the balance; used by the demo and by the secretariat. */
export async function recordPayment(application: Application, amount: number): Promise<Application> {
  const paid = Math.min(application.amount, application.paid + amount);
  const status: Application['status'] =
    paid >= application.amount ? 'fully-paid' : paid > 0 ? 'deposit-paid' : 'reserved';

  if (supabase) {
    const { error } = await supabase
      .from('applications')
      .update({ paid, status })
      .eq('id', application.id);
    if (error) throw new Error(error.message);
    return { ...application, paid, status };
  }

  const local = readLocal();
  const updated = { ...application, paid, status };
  const next = local.some((item) => item.id === application.id)
    ? local.map((item) => (item.id === application.id ? updated : item))
    : [...local, updated];
  writeLocal(next);
  return updated;
}
