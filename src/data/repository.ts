import { supabase } from '../lib/supabase';
import { SAMPLE_MEMBERS, SAMPLE_PROJECTS, SAMPLE_SUBSCRIPTIONS } from './seed';
import type { Member, Project, Subscription } from './types';

const LOCAL_KEY = 'gidan-daya:subscriptions';

function readLocal(): Subscription[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Subscription[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Subscription[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // Storage can be blocked; the session still works, figures just do not persist.
  }
}

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  summary: string;
  category: Project['category'];
  unit_price: number;
  total_units: number;
  units_taken: number;
  opens_on: string;
  closes_on: string;
}

interface SubscriptionRow {
  id: string;
  reference: string;
  project_id: string;
  member_id: string;
  units: number;
  amount: number;
  paid: number;
  status: Subscription['status'];
  next_due_on: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  full_name: string;
  role: Member['role'];
  joined_on: string;
}

export const isSampleMode = supabase === null;

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    summary: row.summary,
    category: row.category,
    unitPrice: Number(row.unit_price),
    totalUnits: row.total_units,
    unitsTaken: row.units_taken,
    opensOn: row.opens_on,
    closesOn: row.closes_on,
  };
}

/**
 * In sample mode the seed is the ledger; local subscriptions created in this
 * browser are folded back into units taken so the meter moves when you
 * subscribe. Nothing here is presented as live cooperative data.
 */
function applyLocalUnits(projects: Project[], local: Subscription[]): Project[] {
  return projects.map((project) => {
    const extra = local.filter((item) => item.projectId === project.id).reduce((sum, item) => sum + item.units, 0);
    return { ...project, unitsTaken: Math.min(project.totalUnits, project.unitsTaken + extra) };
  });
}

export async function listProjects(): Promise<Project[]> {
  if (!supabase) return applyLocalUnits(SAMPLE_PROJECTS, readLocal());

  const { data, error } = await supabase.from('projects').select('*').order('code');
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProjectRow[]).map(toProject);
}

export async function listSubscriptions(memberId?: string): Promise<Subscription[]> {
  if (!supabase) {
    const all = [...readLocal(), ...SAMPLE_SUBSCRIPTIONS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return memberId ? all.filter((item) => item.memberId === memberId) : all;
  }

  let query = supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SubscriptionRow[];
  const projects = await listProjects();
  const names = new Map(projects.map((project) => [project.id, project.name] as const));

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    projectId: row.project_id,
    projectName: names.get(row.project_id) ?? 'Project',
    memberId: row.member_id,
    memberName: '',
    units: row.units,
    amount: Number(row.amount),
    paid: Number(row.paid),
    status: row.status,
    nextDueOn: row.next_due_on,
    createdAt: row.created_at.slice(0, 10),
  }));
}

export async function listMembers(): Promise<Member[]> {
  if (!supabase) return SAMPLE_MEMBERS;

  const { data, error } = await supabase.from('profiles').select('id, full_name, role, joined_on').order('full_name');
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MemberRow[];
  const subscriptions = await listSubscriptions();

  return rows.map((row) => {
    const own = subscriptions.filter((item) => item.memberId === row.id);
    return {
      id: row.id,
      name: row.full_name,
      email: '',
      role: row.role,
      joinedOn: row.joined_on,
      units: own.reduce((sum, item) => sum + item.units, 0),
      committed: own.reduce((sum, item) => sum + item.amount, 0),
    };
  });
}

export interface NewSubscription {
  project: Project;
  memberId: string;
  memberName: string;
  units: number;
}

/** Creates a subscription. The amount is always derived from the project's unit price. */
export async function createSubscription(input: NewSubscription): Promise<Subscription> {
  const { project, memberId, memberName, units } = input;
  const amount = project.unitPrice * units;

  if (supabase) {
    const { data, error } = await supabase.rpc('subscribe_to_project', {
      p_project_id: project.id,
      p_units: units,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as SubscriptionRow | null;
    if (!row) throw new Error('The subscription was created but no record was returned.');
    return {
      id: row.id,
      reference: row.reference,
      projectId: row.project_id,
      projectName: project.name,
      memberId: row.member_id,
      memberName,
      units: row.units,
      amount: Number(row.amount),
      paid: Number(row.paid),
      status: row.status,
      nextDueOn: row.next_due_on,
      createdAt: row.created_at.slice(0, 10),
    };
  }

  const local = readLocal();
  const sequence = SAMPLE_SUBSCRIPTIONS.filter((item) => item.projectId === project.id).length + local.filter((item) => item.projectId === project.id).length + 1;
  const created: Subscription = {
    id: `local-${Date.now()}`,
    reference: `${project.code}-${String(sequence).padStart(4, '0')}`,
    projectId: project.id,
    projectName: project.name,
    memberId,
    memberName,
    units,
    amount,
    paid: 0,
    status: 'active',
    nextDueOn: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  writeLocal([...local, created]);
  return created;
}

export function clearLocalSubscriptions(): void {
  writeLocal([]);
}
