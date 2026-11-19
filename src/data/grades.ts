/**
 * The cooperative's grade structure: ranks 01–17, taken from the secretariat's
 * "All grades" table supplied on 19 November 2026. Rank 01 is the most senior
 * grade, so a larger rank means a more junior member.
 *
 * The same table carries Pensioner, Retiree, Coop Staff and Undefined as rows
 * 18–21. They are not grades here: the application already records those as the
 * member category, and listing them again would ask the same question twice.
 *
 * Only the ranks and names come from that table. Its credit limit, minimum
 * contribution, global limit and annual limit columns are not part of this
 * scheme and are deliberately not copied.
 */
export const GRADE_NAMES = [
  'Deputy Governor',
  'Director',
  'Deputy Director',
  'Assistant Director',
  'Principal Manager',
  'Senior Manager',
  'Manager',
  'Deputy Manager',
  'Assistant Manager',
  'Senior Supervisor 1',
  'Senior Supervisor 2',
  'Supervisor',
  'Senior Clerk',
  'Treasury Assistant',
  'Clerk',
  'Treasury Assistant 1',
  'Drivers',
] as const;

export type Cadre = (typeof GRADE_NAMES)[number];

export interface MemberGrade {
  rank: number;
  name: Cadre;
}

/** The table in rank order; the position in GRADE_NAMES is the rank. */
export const MEMBER_GRADES: MemberGrade[] = GRADE_NAMES.map((name, index) => ({
  rank: index + 1,
  name,
}));

/**
 * Ranks 09 and below are the lower grades the call gives priority to: Assistant
 * Manager down to Drivers. Deputy Manager (08) and above are the senior grades.
 */
export const PRIORITY_FROM_RANK = 9;

export const PRIORITY_BAND_LABEL = 'Assistant Manager to Drivers';
export const SENIOR_BAND_LABEL = 'Deputy Manager and above';

export function gradeRank(name: string): number | null {
  return MEMBER_GRADES.find((grade) => grade.name === name)?.rank ?? null;
}

export function isGrade(name: string): name is Cadre {
  return gradeRank(name) !== null;
}

/** "09 · Assistant Manager", for menus and receipts where the rank helps. */
export function gradeLabel(name: string): string {
  const rank = gradeRank(name);
  return rank === null ? name : `${String(rank).padStart(2, '0')} · ${name}`;
}

export function hasPriorityGrade(name: string): boolean {
  const rank = gradeRank(name);
  return rank !== null && rank >= PRIORITY_FROM_RANK;
}
