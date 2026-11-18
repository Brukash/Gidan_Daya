import type {
  AllocationPolicy,
  Application,
  AuditEvent,
  Cadre,
  HouseDesign,
  Member,
  PaymentEvidence,
  PaymentKind,
  PlotTier,
  ReviewDecision,
  SchemeSettings,
} from './types';
import { supabase } from '../lib/supabase';
import { depositFor, priceForPlot } from '../lib/allocations';
import {
  DEFAULT_SETTINGS,
  SCHEME,
  SAMPLE_APPLICATIONS,
  SAMPLE_AUDIT,
  SAMPLE_EVIDENCE,
  SAMPLE_MEMBERS,
  SAMPLE_TIERS,
} from './seed';
import { TERMS_CLAUSES, TERMS_VERSION } from './terms';

const KEYS = {
  applications: 'gidan-daya:applications',
  settings: 'gidan-daya:settings',
  evidence: 'gidan-daya:evidence',
  audit: 'gidan-daya:audit',
} as const;

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full; the session still works, figures just do not persist.
  }
}

/** Local rows shadow seeded rows with the same id, so edits to samples stick. */
function merged<T extends { id: string }>(seeded: readonly T[], key: string, sort: (a: T, b: T) => number): T[] {
  const map = new Map(seeded.map((item) => [item.id, item] as const));
  for (const item of readLocal<T[]>(key, [])) map.set(item.id, item);
  return [...map.values()].sort(sort);
}

function localRows<T>(key: string): T[] {
  return readLocal<T[]>(key, []);
}

function upsertLocal<T extends { id: string }>(key: string, row: T): void {
  const rows = localRows<T>(key).filter((item) => item.id !== row.id);
  writeLocal(key, [...rows, row]);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

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
  confirmed_on: string | null;
  terms_version: string;
  accepted_at: string;
  accepted_clauses: string[];
}

interface MemberRow {
  id: string;
  full_name: string;
  member_number: string;
  cadre: Cadre;
  role: Member['role'];
  joined_on: string;
}

interface EvidenceRow {
  id: string;
  application_id: string;
  application_reference: string;
  kind: PaymentKind;
  amount: number;
  file_name: string;
  file_type: string;
  file_size: number;
  preview: string | null;
  status: PaymentEvidence['status'];
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface AuditRow {
  id: string;
  application_id: string | null;
  actor: string;
  action: string;
  note: string;
  at: string;
}

export const isSampleMode = supabase === null;

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

function mapApplication(row: ApplicationRow, memberName: string): Application {
  return {
    id: row.id,
    reference: row.reference,
    memberId: row.member_id,
    memberName,
    memberNumber: row.member_number,
    cadre: row.cadre,
    sizeSqm: row.size_sqm,
    houseDesign: row.house_design,
    amount: Number(row.amount),
    paid: Number(row.paid),
    feePaid: row.fee_paid,
    status: row.status,
    createdAt: row.created_at.slice(0, 10),
    confirmedOn: row.confirmed_on,
    termsVersion: row.terms_version,
    acceptedAt: row.accepted_at,
    acceptedClauses: row.accepted_clauses ?? [],
  };
}

function sampleApplications(): Application[] {
  return merged(SAMPLE_APPLICATIONS, KEYS.applications, (a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * In sample mode the seeded register is the base; rows written in this browser
 * shadow it, so availability moves when you apply or a payment is confirmed.
 */
function applyLocalAllocations(tiers: PlotTier[]): PlotTier[] {
  const added = localRows<Application>(KEYS.applications).filter(
    (item) => !SAMPLE_APPLICATIONS.some((sample) => sample.id === item.id),
  );

  return tiers.map((tier) => {
    const extra = added.filter((item) => item.sizeSqm === tier.sizeSqm).length;
    return { ...tier, allocated: Math.min(tier.totalPlots, tier.allocated + extra) };
  });
}

export async function listTiers(): Promise<PlotTier[]> {
  if (!supabase) return applyLocalAllocations(SAMPLE_TIERS);

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
    const all = sampleApplications();
    return memberId ? all.filter((item) => item.memberId === memberId) : all;
  }

  let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ApplicationRow[];
  const members = await listMembers();
  const names = new Map(members.map((member) => [member.id, member.name] as const));

  return rows.map((row) => mapApplication(row, names.get(row.member_id) ?? ''));
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
  acceptedClauses: string[];
}

/** Creates an application. The amount always comes from the published rate per sqm. */
export async function createApplication(input: NewApplication): Promise<Application> {
  const amount = priceForPlot(input.sizeSqm, SCHEME.pricePerSqm);
  const acceptedAt = new Date().toISOString();

  if (supabase) {
    const { data, error } = await supabase.rpc('create_plot_application', {
      p_size_sqm: input.sizeSqm,
      p_house_design: input.houseDesign,
      p_member_number: input.memberNumber,
      p_cadre: input.cadre,
      p_accepted_clauses: input.acceptedClauses,
      p_terms_version: TERMS_VERSION,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as ApplicationRow | null;
    if (!row) throw new Error('The application was created but no record was returned.');
    return mapApplication(row, input.memberName);
  }

  const existing = localRows<Application>(KEYS.applications);
  const sequence =
    SAMPLE_APPLICATIONS.filter((item) => item.sizeSqm === input.sizeSqm).length +
    existing.filter(
      (item) =>
        item.sizeSqm === input.sizeSqm && !SAMPLE_APPLICATIONS.some((sample) => sample.id === item.id),
    ).length +
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
    createdAt: today(),
    confirmedOn: null,
    termsVersion: TERMS_VERSION,
    acceptedAt,
    acceptedClauses: input.acceptedClauses,
  };

  upsertLocal(KEYS.applications, created);
  await addAudit({
    applicationId: created.id,
    actor: input.memberName,
    action: 'Application submitted',
    note: `${TERMS_VERSION} accepted — ${input.acceptedClauses.length} of ${TERMS_CLAUSES.length} conditions acknowledged.`,
  });

  return created;
}

/** Records the 50% deposit or the balance, and audits who did it. */
export async function recordPayment(
  application: Application,
  amount: number,
  actor: string,
  note = '',
): Promise<Application> {
  const paid = Math.min(application.amount, application.paid + amount);
  const status: Application['status'] =
    paid >= application.amount ? 'fully-paid' : paid > 0 ? 'deposit-paid' : 'reserved';
  const confirmedOn = application.confirmedOn ?? (paid >= depositFor(application.amount) ? today() : null);

  const updated: Application = { ...application, paid, status, confirmedOn };

  if (supabase) {
    const { error } = await supabase
      .from('applications')
      .update({ paid, status, confirmed_on: confirmedOn })
      .eq('id', application.id);
    if (error) throw new Error(error.message);
  } else {
    upsertLocal(KEYS.applications, updated);
  }

  await addAudit({
    applicationId: application.id,
    actor,
    action: 'Payment recorded',
    note: `₦${amount.toLocaleString('en-NG')} on ${application.reference}.${note ? ` ${note}` : ''}`,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<SchemeSettings> {
  if (!supabase) {
    const stored = readLocal<SchemeSettings>(KEYS.settings, DEFAULT_SETTINGS);
    return stored.allocationPolicy ? stored : DEFAULT_SETTINGS;
  }

  const { data, error } = await supabase
    .from('scheme')
    .select('allocation_policy')
    .maybeSingle<{ allocation_policy: AllocationPolicy }>();
  if (error) throw new Error(error.message);
  return { allocationPolicy: data?.allocation_policy ?? DEFAULT_SETTINGS.allocationPolicy };
}

/** Changes the allocation rule and records the reason in the audit trail. */
export async function saveSettings(
  policy: AllocationPolicy,
  actor: string,
  note: string,
): Promise<SchemeSettings> {
  if (supabase) {
    const { error } = await supabase.from('scheme').update({ allocation_policy: policy }).eq('id', true);
    if (error) throw new Error(error.message);
  } else {
    writeLocal(KEYS.settings, { allocationPolicy: policy });
  }

  await addAudit({ applicationId: null, actor, action: 'Allocation rule set', note });
  return { allocationPolicy: policy };
}

// ---------------------------------------------------------------------------
// Payment evidence
// ---------------------------------------------------------------------------

function sampleEvidence(): PaymentEvidence[] {
  return merged(SAMPLE_EVIDENCE, KEYS.evidence, (a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function listEvidence(applicationId?: string): Promise<PaymentEvidence[]> {
  if (!supabase) {
    const all = sampleEvidence();
    return applicationId ? all.filter((item) => item.applicationId === applicationId) : all;
  }

  let query = supabase.from('payment_evidence').select('*').order('uploaded_at', { ascending: false });
  if (applicationId) query = query.eq('application_id', applicationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as EvidenceRow[]).map(mapEvidence);
}

function mapEvidence(row: EvidenceRow): PaymentEvidence {
  return {
    id: row.id,
    applicationId: row.application_id,
    applicationReference: row.application_reference,
    kind: row.kind,
    amount: Number(row.amount),
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    preview: row.preview,
    status: row.status,
    uploadedAt: row.uploaded_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export interface NewEvidence {
  application: Application;
  kind: PaymentKind;
  amount: number;
  file: File;
  actor: string;
}

export async function addEvidence(input: NewEvidence): Promise<PaymentEvidence> {
  const { application, kind, amount, file, actor } = input;

  if (supabase) {
    const path = `${application.id}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    const upload = await supabase.storage.from('payment-evidence').upload(path, file, { upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    const { data, error } = await supabase
      .from('payment_evidence')
      .insert({
        application_id: application.id,
        application_reference: application.reference,
        kind,
        amount,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: path,
        status: 'pending',
      })
      .select('*')
      .single<EvidenceRow>();
    if (error) throw new Error(error.message);

    await addAudit({
      applicationId: application.id,
      actor,
      action: 'Payment evidence uploaded',
      note: `${file.name} for ${application.reference}, pending verification.`,
    });
    return mapEvidence(data);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const evidence: PaymentEvidence = {
    id: `ev-local-${Date.now()}`,
    applicationId: application.id,
    applicationReference: application.reference,
    kind,
    amount,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    // Local storage holds roughly 5 MB in total, so keep the preview only when it fits.
    preview: dataUrl && dataUrl.length <= 1_500_000 ? dataUrl : null,
    status: 'pending',
    uploadedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  };

  upsertLocal(KEYS.evidence, evidence);
  await addAudit({
    applicationId: application.id,
    actor,
    action: 'Payment evidence uploaded',
    note: `${file.name} for ${application.reference}, pending verification.`,
  });
  return evidence;
}

export interface EvidenceReview {
  evidence: PaymentEvidence;
  application: Application;
  decision: ReviewDecision;
  note: string;
  actor: string;
}

/**
 * The secretariat's verification step. Verifying records the payment and, with
 * it, the date that fixes the application's place in the queue.
 */
export async function reviewEvidence(input: EvidenceReview): Promise<PaymentEvidence> {
  const { evidence, application, decision, note, actor } = input;

  if (supabase) {
    const { data, error } = await supabase.rpc('review_payment_evidence', {
      p_evidence_id: evidence.id,
      p_decision: decision,
      p_note: note.trim(),
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as EvidenceRow | null;
    if (!row) throw new Error('The review was saved but no record was returned.');
    return mapEvidence(row);
  }

  const updated: PaymentEvidence = {
    ...evidence,
    status: decision,
    reviewedBy: actor,
    reviewedAt: new Date().toISOString(),
    reviewNote: note.trim() || null,
  };
  upsertLocal(KEYS.evidence, updated);

  await addAudit({
    applicationId: application.id,
    actor,
    action: decision === 'verified' ? 'Payment evidence verified' : 'Payment evidence rejected',
    note: note.trim() || `${evidence.fileName} for ${application.reference}.`,
  });

  if (decision === 'verified') {
    await recordPayment(application, evidence.amount, actor, `Evidence ${evidence.fileName}.`);
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export async function listAudit(applicationId?: string): Promise<AuditEvent[]> {
  if (!supabase) {
    const all = merged(SAMPLE_AUDIT, KEYS.audit, (a, b) => b.at.localeCompare(a.at));
    return applicationId
      ? all.filter((item) => item.applicationId === applicationId || item.applicationId === null)
      : all;
  }

  let query = supabase.from('audit_events').select('*').order('at', { ascending: false }).limit(200);
  if (applicationId) query = query.or(`application_id.eq.${applicationId},application_id.is.null`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as AuditRow[]).map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    actor: row.actor,
    action: row.action,
    note: row.note,
    at: row.at,
  }));
}

export async function addAudit(event: Omit<AuditEvent, 'id' | 'at'> & { at?: string }): Promise<void> {
  const record: AuditEvent = {
    id: `au-local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    applicationId: event.applicationId,
    actor: event.actor,
    action: event.action,
    note: event.note,
    at: event.at ?? new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from('audit_events').insert({
      application_id: record.applicationId,
      actor: record.actor,
      action: record.action,
      note: record.note,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const rows = localRows<AuditEvent>(KEYS.audit).filter((item) => item.id !== record.id);
  writeLocal(KEYS.audit, [...rows, record]);
}
