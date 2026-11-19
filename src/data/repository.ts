import type {
  AllocationPolicy,
  Application,
  AuditEvent,
  Cadre,
  HouseDesign,
  Member,
  MemberCategory,
  PaymentEvidence,
  PaymentKind,
  PlotTier,
  ReviewDecision,
  Scheme,
  SchemeContent,
  SchemeSettings,
} from './types';
import { supabase } from '../lib/supabase';
import { depositFor, priceForPlot } from '../lib/allocations';
import {
  DEFAULT_CONTENT,
  DEFAULT_SETTINGS,
  SCHEME,
  SAMPLE_APPLICATIONS,
  SAMPLE_AUDIT,
  SAMPLE_EVIDENCE,
  SAMPLE_MEMBERS,
  SAMPLE_TIERS,
  SITE_VISIT,
} from './seed';
import { TERMS_CLAUSES, TERMS_VERSION } from './terms';

const KEYS = {
  applications: 'gidan-daya:applications',
  settings: 'gidan-daya:settings',
  evidence: 'gidan-daya:evidence',
  audit: 'gidan-daya:audit',
  content: 'gidan-daya:scheme-content',
  tierTotals: 'gidan-daya:tier-totals',
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
  applicant_name?: string | null;
  member_id: string | null;
  member_number: string;
  cadre: Cadre;
  member_category: MemberCategory;
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
  member_category: MemberCategory;
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
  storage_path: string;
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
    memberId: row.member_id ?? `guest:${row.member_number}`,
    memberName: memberName || row.applicant_name || '',
    memberNumber: row.member_number,
    cadre: row.cadre,
    memberCategory: row.member_category,
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

function sampleTiers(): PlotTier[] {
  const saved = readLocal<Record<string, number>>(KEYS.tierTotals, {});
  const base = SAMPLE_TIERS.map((tier) => {
    const total = saved[tier.id];
    return typeof total === 'number'
      ? { ...tier, totalPlots: Math.max(tier.allocated, total) }
      : tier;
  });
  return applyLocalAllocations(base);
}

export async function listTiers(): Promise<PlotTier[]> {
  if (!supabase) return sampleTiers();

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

  // The row already carries the applicant's name. Reading the member register
  // here would loop straight back into this function, which is why the page
  // used to sit on "Reading the register…" forever.
  return rows.map((row) => mapApplication(row, row.applicant_name ?? ''));
}

/**
 * Opens an application with the two things its applicant already knows: the
 * reference and the cooperative ID. Used by the public receipt page.
 */
export async function getApplicationByReference(
  reference: string,
  memberNumber: string,
): Promise<Application | null> {
  const ref = reference.trim().toUpperCase();
  const id = memberNumber.trim().toUpperCase();
  if (!ref || !id) return null;

  if (!supabase) {
    return (
      sampleApplications().find(
        (item) => item.reference.toUpperCase() === ref && item.memberNumber.toUpperCase() === id,
      ) ?? null
    );
  }

  const { data, error } = await supabase.rpc('get_public_application', {
    p_reference: ref,
    p_member_number: id,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as ApplicationRow | null;
  return row ? mapApplication(row, row.applicant_name ?? '') : null;
}

export async function listMembers(): Promise<Member[]> {
  if (!supabase) {
    // Applications made without an account still appear in the secretariat's
    // register, grouped by the cooperative ID the applicant supplied.
    const guests = new Map<string, Member>();
    for (const application of sampleApplications()) {
      if (!application.memberId.startsWith('guest:')) continue;
      const key = application.memberNumber.toUpperCase();
      if (SAMPLE_MEMBERS.some((member) => member.memberNumber.toUpperCase() === key)) continue;

      const existing = guests.get(key);
      if (existing) {
        existing.plots += 1;
        existing.committed += application.amount;
      } else {
        guests.set(key, {
          id: application.memberId,
          name: application.memberName,
          email: '',
          memberNumber: application.memberNumber,
          cadre: application.cadre,
          memberCategory: application.memberCategory,
          role: 'member',
          joinedOn: application.createdAt,
          plots: 1,
          committed: application.amount,
        });
      }
    }
    return [...SAMPLE_MEMBERS, ...guests.values()];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, member_number, cadre, member_category, role, joined_on')
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
      memberCategory: row.member_category,
      role: row.role,
      joinedOn: row.joined_on,
      plots: own.length,
      committed: own.reduce((sum, item) => sum + item.amount, 0),
    };
  });
}

export interface NewApplication {
  /** Null for an application made without an account. */
  memberId: string | null;
  memberName: string;
  memberNumber: string;
  cadre: Cadre;
  memberCategory: MemberCategory;
  sizeSqm: number;
  houseDesign: HouseDesign;
  acceptedClauses: string[];
}

/** Creates an application. The amount always comes from the published rate per sqm. */
export async function createApplication(input: NewApplication): Promise<Application> {
  const acceptedAt = new Date().toISOString();

  if (supabase) {
    const { data, error } = input.memberId
      ? await supabase.rpc('create_plot_application', {
          p_size_sqm: input.sizeSqm,
          p_house_design: input.houseDesign,
          p_member_number: input.memberNumber,
          p_cadre: input.cadre,
          p_member_category: input.memberCategory,
          p_accepted_clauses: input.acceptedClauses,
          p_terms_version: TERMS_VERSION,
        })
      : await supabase.rpc('create_public_application', {
          p_size_sqm: input.sizeSqm,
          p_house_design: input.houseDesign,
          p_member_number: input.memberNumber,
          p_cadre: input.cadre,
          p_member_category: input.memberCategory,
          p_applicant_name: input.memberName,
          p_accepted_clauses: input.acceptedClauses,
          p_terms_version: TERMS_VERSION,
        });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as ApplicationRow | null;
    if (!row) throw new Error('The application was created but no record was returned.');
    return mapApplication(row, input.memberName);
  }

  const existing = localRows<Application>(KEYS.applications);
  const sameSize = [...SAMPLE_APPLICATIONS, ...existing].filter((item) => item.sizeSqm === input.sizeSqm);
  const highestUsed = sameSize.reduce((max, item) => {
    const parsed = Number(item.reference.split('-').pop());
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  const tier = applyLocalAllocations(SAMPLE_TIERS).find((item) => item.sizeSqm === input.sizeSqm);
  // The reference continues the plot numbering, so a new application cannot
  // reuse a number already used on that tier.
  const sequence = Math.max(highestUsed, tier?.allocated ?? 0) + 1;

  // Sample mode prices the plot here; the Supabase branch prices it in the RPC,
  // from the same published rate.
  const content = await getSchemeContent();
  const amount = priceForPlot(input.sizeSqm, content.scheme.pricePerSqm);

  const created: Application = {
    id: `local-${Date.now()}`,
    reference: `GD-${input.sizeSqm}-${String(sequence).padStart(4, '0')}`,
    memberId: input.memberId ?? `guest:${input.memberNumber}`,
    memberName: input.memberName,
    memberNumber: input.memberNumber,
    cadre: input.cadre,
    memberCategory: input.memberCategory,
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
// Published content (rate, fee, dates, site visits, notice)
// ---------------------------------------------------------------------------

interface SchemeRow {
  name: string;
  price_per_sqm: number;
  application_fee: number;
  opens_on: string;
  closes_on: string;
  deposit_due_on: string;
  balance_due_on: string;
  site_visit_dates: string[] | null;
  site_visit_time: string | null;
  site_visit_meeting_point: string | null;
  notice: string | null;
}

function mapSchemeRow(row: SchemeRow): SchemeContent {
  const scheme: Scheme = {
    ...SCHEME,
    name: row.name || SCHEME.name,
    pricePerSqm: Number(row.price_per_sqm),
    applicationFee: Number(row.application_fee),
    opensOn: row.opens_on,
    closesOn: row.closes_on,
    depositDueOn: row.deposit_due_on,
    balanceDueOn: row.balance_due_on,
    notice: row.notice ?? '',
  };
  const dates = (row.site_visit_dates ?? []).map((date) => String(date).slice(0, 10));
  return {
    scheme,
    siteVisit: {
      dates: dates.length > 0 ? dates : [...SITE_VISIT.dates],
      time: row.site_visit_time || SITE_VISIT.time,
      meetingPoint: row.site_visit_meeting_point || SITE_VISIT.meetingPoint,
    },
  };
}

/**
 * What the secretariat has published. Falls back to the seeded constants in
 * sample mode and when the scheme row is missing, so a page never renders
 * empty prices.
 */
export async function getSchemeContent(): Promise<SchemeContent> {
  if (!supabase) {
    const stored = readLocal<SchemeContent | null>(KEYS.content, null);
    if (!stored) {
      return { scheme: { ...SCHEME }, siteVisit: { ...SITE_VISIT, dates: [...SITE_VISIT.dates] } };
    }
    return {
      scheme: { ...SCHEME, ...stored.scheme },
      siteVisit: {
        ...SITE_VISIT,
        ...stored.siteVisit,
        dates:
          stored.siteVisit?.dates && stored.siteVisit.dates.length > 0
            ? [...stored.siteVisit.dates]
            : [...SITE_VISIT.dates],
      },
    };
  }

  const { data, error } = await supabase
    .from('scheme')
    .select(
      'name, price_per_sqm, application_fee, opens_on, closes_on, deposit_due_on, balance_due_on, site_visit_dates, site_visit_time, site_visit_meeting_point, notice',
    )
    .maybeSingle<SchemeRow>();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_CONTENT;
  return mapSchemeRow(data);
}

/** Publishes the content and records it, with the reason, in the audit trail. */
export async function saveSchemeContent(
  content: SchemeContent,
  actor: string,
  note: string,
): Promise<SchemeContent> {
  if (supabase) {
    const { error } = await supabase
      .from('scheme')
      .update({
        price_per_sqm: content.scheme.pricePerSqm,
        application_fee: content.scheme.applicationFee,
        opens_on: content.scheme.opensOn,
        closes_on: content.scheme.closesOn,
        deposit_due_on: content.scheme.depositDueOn,
        balance_due_on: content.scheme.balanceDueOn,
        site_visit_dates: content.siteVisit.dates,
        site_visit_time: content.siteVisit.time,
        site_visit_meeting_point: content.siteVisit.meetingPoint,
        notice: content.scheme.notice,
      })
      .eq('id', true);
    if (error) throw new Error(error.message);
  } else {
    writeLocal(KEYS.content, content);
  }

  await addAudit({ applicationId: null, actor, action: 'Scheme content updated', note });
  return content;
}

/** Changes how many plots a tier holds. Capacity already allocated cannot be cut. */
export async function saveTierTotals(
  tiers: readonly PlotTier[],
  actor: string,
  note: string,
): Promise<void> {
  if (supabase) {
    for (const tier of tiers) {
      const { error } = await supabase
        .from('plot_tiers')
        .update({ total_plots: tier.totalPlots })
        .eq('id', tier.id);
      if (error) throw new Error(error.message);
    }
  } else {
    const saved = readLocal<Record<string, number>>(KEYS.tierTotals, {});
    for (const tier of tiers) saved[tier.id] = tier.totalPlots;
    writeLocal(KEYS.tierTotals, saved);
  }

  await addAudit({ applicationId: null, actor, action: 'Plot inventory updated', note });
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

  const rows = (data ?? []) as EvidenceRow[];
  if (rows.length === 0) return [];

  // The bucket is private, so a reader opens a file through a short-lived
  // signed link. The storage policy decides who may mint one: the applicant who
  // owns the application, or any secretariat account. Uploads made from the
  // public form sit under `public/`, and only the secretariat can read those.
  const { data: links } = await supabase.storage
    .from('payment-evidence')
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      60 * 60,
    );
  const byPath = new Map((links ?? []).map((link) => [link.path, link.signedUrl] as const));

  return rows.map((row) => mapEvidence({ ...row, preview: byPath.get(row.storage_path) ?? null }));
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

/**
 * Evidence attached from the public application form, where the applicant has no
 * account. The file goes to the `public/<reference>/` prefix the anonymous
 * storage policy allows, and `record_public_fee_evidence` writes the record
 * only for the matching reference and member ID, with the fee taken from the
 * scheme row rather than from the browser.
 */
export async function addPublicEvidence(input: {
  application: Application;
  file: File;
}): Promise<PaymentEvidence> {
  const { application, file } = input;

  if (supabase) {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    const path = `public/${application.reference}/${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from('payment-evidence').upload(path, file, { upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    const { data, error } = await supabase.rpc('record_public_fee_evidence', {
      p_reference: application.reference,
      p_member_number: application.memberNumber,
      p_file_name: file.name,
      p_file_type: file.type,
      p_file_size: file.size,
      p_storage_path: path,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as EvidenceRow | null;
    if (!row) throw new Error('The evidence could not be recorded.');
    return mapEvidence(row);
  }

  const content = await getSchemeContent();
  const dataUrl = await readFileAsDataUrl(file);
  const evidence: PaymentEvidence = {
    id: `ev-local-${Date.now()}`,
    applicationId: application.id,
    applicationReference: application.reference,
    kind: 'application-fee',
    amount: content.scheme.applicationFee,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
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
    actor: application.memberName,
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
