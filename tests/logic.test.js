import { describe, it, expect } from 'vitest';
import { computeTier, computeScores } from '../src/logic.js';

describe('computeTier', () => {
  it('classifies a score of exactly 70 as low risk (lower boundary of the low tier)', () => {
    expect(computeTier(70).key).toBe('low');
  });

  it('classifies a score of exactly 69 as medium risk (just below the low tier boundary)', () => {
    expect(computeTier(69).key).toBe('medium');
  });

  it('classifies a score of exactly 40 as medium risk (lower boundary of the medium tier)', () => {
    expect(computeTier(40).key).toBe('medium');
  });

  it('classifies a score of exactly 39 as high risk (just below the medium tier boundary)', () => {
    expect(computeTier(39).key).toBe('high');
  });

  it('classifies a score of 0 as high risk (minimum extreme)', () => {
    expect(computeTier(0).key).toBe('high');
  });

  it('classifies a score of 100 as low risk (maximum extreme)', () => {
    expect(computeTier(100).key).toBe('low');
  });
});

describe('computeScores', () => {
  it('returns an overall score of 0 with zero totals when given no questions', () => {
    const result = computeScores([], {});
    expect(result.overall).toBe(0);
    expect(result.totalSum).toBe(0);
    expect(result.totalMax).toBe(0);
  });

  it('returns an overall score of 0 with zero totals when questions exist but none have been answered', () => {
    const questions = [{ id: 'g1', fn: 'govern' }, { id: 'm1', fn: 'map' }];
    const result = computeScores(questions, {});
    expect(result.overall).toBe(0);
    expect(result.totalSum).toBe(0);
    expect(result.totalMax).toBe(0);
  });

  it('counts an answer value of 0 toward the max, distinguishing it from an unanswered question', () => {
    const questions = [{ id: 'g1', fn: 'govern' }];
    const result = computeScores(questions, { g1: 0 });
    expect(result.totalMax).toBe(3);
    expect(result.totalSum).toBe(0);
    expect(result.overall).toBe(0);
  });

  it('excludes unanswered questions from both the sum and the max, rather than scoring them as zero', () => {
    const questions = [{ id: 'g1', fn: 'govern' }, { id: 'g2', fn: 'govern' }];
    const result = computeScores(questions, { g1: 3 });
    expect(result.totalMax).toBe(3);
    expect(result.totalSum).toBe(3);
    expect(result.overall).toBe(100);
  });

  it('always includes all four NIST functions in fnScores, even ones with no answered questions', () => {
    const questions = [{ id: 'g1', fn: 'govern' }];
    const result = computeScores(questions, { g1: 2 });
    expect(Object.keys(result.fnScores).sort()).toEqual(['govern', 'manage', 'map', 'measure']);
    expect(result.fnScores.map).toEqual({ sum: 0, max: 0 });
    expect(result.fnScores.measure).toEqual({ sum: 0, max: 0 });
    expect(result.fnScores.manage).toEqual({ sum: 0, max: 0 });
  });

  it('buckets answered questions into their own NIST function without mixing scores across functions', () => {
    const questions = [
      { id: 'g1', fn: 'govern' },
      { id: 'm1', fn: 'map' },
      { id: 'me1', fn: 'measure' },
      { id: 'ma1', fn: 'manage' }
    ];
    const answers = { g1: 3, m1: 0, me1: 1, ma1: 2 };
    const result = computeScores(questions, answers);
    expect(result.fnScores.govern).toEqual({ sum: 3, max: 3 });
    expect(result.fnScores.map).toEqual({ sum: 0, max: 3 });
    expect(result.fnScores.measure).toEqual({ sum: 1, max: 3 });
    expect(result.fnScores.manage).toEqual({ sum: 2, max: 3 });
  });

  it('returns an overall score of 100 when every answered question scores the maximum', () => {
    const questions = [{ id: 'g1', fn: 'govern' }, { id: 'm1', fn: 'map' }];
    const result = computeScores(questions, { g1: 3, m1: 3 });
    expect(result.overall).toBe(100);
  });

  it('rounds a fractional percentage down when the decimal is below .5', () => {
    const questions = [{ id: 'g1', fn: 'govern' }];
    const result = computeScores(questions, { g1: 1 });
    expect(result.overall).toBe(33);
  });

  it('rounds a fractional percentage up when the decimal is at or above .5', () => {
    const questions = [{ id: 'g1', fn: 'govern' }];
    const result = computeScores(questions, { g1: 2 });
    expect(result.overall).toBe(67);
  });
});
