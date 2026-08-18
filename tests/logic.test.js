import { describe, it, expect } from 'vitest';
import { computeTier, computeScores, identifyGaps, buildRecommendations } from '../src/logic.js';
import { REC_TITLES, REC_BODIES, FRAMEWORK } from '../src/data.js';

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

describe('identifyGaps', () => {
  it('returns no gaps when there are no questions', () => {
    expect(identifyGaps([], {})).toEqual([]);
  });

  it('returns no gaps when no questions have been answered', () => {
    const questions = [{ id: 'g1', fn: 'govern', module: 'base' }];
    expect(identifyGaps(questions, {})).toEqual([]);
  });

  it('treats an unanswered question as not a gap, distinguishing it from an answered value of 0', () => {
    const questions = [
      { id: 'g1', fn: 'govern', module: 'base' },
      { id: 'g2', fn: 'govern', module: 'base' }
    ];
    const gaps = identifyGaps(questions, { g1: 0 });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].q.id).toBe('g1');
  });

  it('flags an answer of 0 as a high-priority gap', () => {
    const questions = [{ id: 'g1', fn: 'govern', module: 'base' }];
    const gaps = identifyGaps(questions, { g1: 0 });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].priority).toBe('high');
    expect(gaps[0].v).toBe(0);
  });

  it('flags an answer of 1 as a medium-priority gap', () => {
    const questions = [{ id: 'g1', fn: 'govern', module: 'base' }];
    const gaps = identifyGaps(questions, { g1: 1 });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].priority).toBe('medium');
    expect(gaps[0].v).toBe(1);
  });

  it('does not flag an answer of 2 as a gap, just above the gap threshold', () => {
    const questions = [{ id: 'g1', fn: 'govern', module: 'base' }];
    expect(identifyGaps(questions, { g1: 2 })).toEqual([]);
  });

  it('does not flag an answer of 3 as a gap', () => {
    const questions = [{ id: 'g1', fn: 'govern', module: 'base' }];
    expect(identifyGaps(questions, { g1: 3 })).toEqual([]);
  });

  it('preserves the function, module, and original question on each gap', () => {
    const question = { id: 'np1', fn: 'govern', module: 'nonprofit', extra: 'field' };
    const gaps = identifyGaps([question], { np1: 1 });
    expect(gaps[0].fn).toBe('govern');
    expect(gaps[0].module).toBe('nonprofit');
    expect(gaps[0].q).toBe(question);
  });

  it('returns gaps in the same order as the input questions, not grouped or sorted', () => {
    const questions = [
      { id: 'g1', fn: 'govern', module: 'base' },
      { id: 'm1', fn: 'map', module: 'base' },
      { id: 'me1', fn: 'measure', module: 'base' }
    ];
    const answers = { g1: 1, m1: 3, me1: 0 };
    const gaps = identifyGaps(questions, answers);
    expect(gaps.map(g => g.q.id)).toEqual(['g1', 'me1']);
  });
});

describe('buildRecommendations', () => {
  it('returns no recommendations when there are no gaps', () => {
    expect(buildRecommendations([])).toEqual([]);
  });

  it('orders high-priority recommendations before medium-priority ones regardless of input order', () => {
    const gaps = [
      { fn: 'govern', v: 1, priority: 'medium', q: { id: 'g1', module: 'base' } },
      { fn: 'map', v: 0, priority: 'high', q: { id: 'm1', module: 'base' } }
    ];
    const recs = buildRecommendations(gaps);
    expect(recs.map(r => r.priority)).toEqual(['high', 'medium']);
  });

  it('deduplicates recommendations by question id, keeping only the first occurrence', () => {
    const gaps = [
      { fn: 'govern', v: 0, priority: 'high', q: { id: 'g1', module: 'base' } },
      { fn: 'govern', v: 0, priority: 'high', q: { id: 'g1', module: 'base' } }
    ];
    const recs = buildRecommendations(gaps);
    expect(recs).toHaveLength(1);
  });

  it('prioritizes the high-priority version of a duplicated question over its medium-priority duplicate', () => {
    const gaps = [
      { fn: 'govern', v: 1, priority: 'medium', q: { id: 'g1', module: 'base' } },
      { fn: 'govern', v: 0, priority: 'high', q: { id: 'g1', module: 'base' } }
    ];
    const recs = buildRecommendations(gaps);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe('high');
  });

  it('uses the REC_TITLES entry for a known question id', () => {
    const gaps = [{ fn: 'govern', v: 0, priority: 'high', q: { id: 'g1', module: 'base' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].title).toBe(REC_TITLES.g1);
  });

  it('falls back to a generic title when the question id has no entry in REC_TITLES', () => {
    const gaps = [{ fn: 'govern', v: 0, priority: 'high', q: { id: 'unknown-id', module: 'base' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].title).toBe('Address this gap');
  });

  it('uses the REC_BODIES entry for a known question id instead of the generated fallback body', () => {
    const gaps = [{ fn: 'govern', v: 0, priority: 'high', q: { id: 'np1', module: 'nonprofit' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].body).toBe(REC_BODIES.np1);
  });

  it('generates a fallback body stating no baseline is in place when the answer value is 0', () => {
    const gaps = [{ fn: 'govern', v: 0, priority: 'high', q: { id: 'unknown-id', module: 'base' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].body).toMatch(/^No baseline in place today\./);
  });

  it('generates a fallback body stating a partial baseline exists when the answer value is nonzero', () => {
    const gaps = [{ fn: 'govern', v: 1, priority: 'medium', q: { id: 'unknown-id', module: 'base' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].body).toMatch(/^A partial baseline exists\./);
  });

  it('includes the NIST function display name in the generated fallback body', () => {
    const gaps = [{ fn: 'manage', v: 0, priority: 'high', q: { id: 'unknown-id', module: 'base' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].body).toContain(FRAMEWORK.functions.manage.name);
  });

  it("takes the recommendation's module from the nested question object, not the gap's own module field", () => {
    const gaps = [{ fn: 'govern', module: 'base', v: 0, priority: 'high', q: { id: 'np1', module: 'nonprofit' } }];
    const recs = buildRecommendations(gaps);
    expect(recs[0].module).toBe('nonprofit');
  });
});
