import { describe, expect, it } from 'vitest';
import {
  GRADE_NAMES,
  MEMBER_GRADES,
  PRIORITY_FROM_RANK,
  gradeLabel,
  gradeRank,
  hasPriorityGrade,
  isGrade,
} from './grades';

describe('member grades', () => {
  it('holds the 17 grades of the cooperative table, in rank order', () => {
    expect(GRADE_NAMES).toHaveLength(17);
    expect(new Set(GRADE_NAMES).size).toBe(17);
    expect(MEMBER_GRADES.map((grade) => grade.rank).at(-1)).toBe(17);
  });

  it('ranks Deputy Governor first and Drivers last', () => {
    expect(gradeRank('Deputy Governor')).toBe(1);
    expect(gradeRank('Drivers')).toBe(17);
  });

  it('treats Assistant Manager and below as the priority band', () => {
    expect(PRIORITY_FROM_RANK).toBe(9);
    expect(hasPriorityGrade('Assistant Manager')).toBe(true);
    expect(hasPriorityGrade('Clerk')).toBe(true);
    expect(hasPriorityGrade('Deputy Manager')).toBe(false);
  });

  it('labels a grade with its two-digit rank', () => {
    expect(gradeLabel('Assistant Manager')).toBe('09 · Assistant Manager');
    expect(gradeLabel('Deputy Governor')).toBe('01 · Deputy Governor');
  });

  it('rejects a name that is not a grade', () => {
    expect(isGrade('Executive Officer')).toBe(false);
    expect(hasPriorityGrade('Executive Officer')).toBe(false);
    expect(gradeLabel('Executive Officer')).toBe('Executive Officer');
  });
});
