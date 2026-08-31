import { describe, it, expect } from 'vitest';
import {
  computeTier,
  computeScores,
  identifyGaps,
  buildRecommendations,
  getApplicableModules,
  getQuestionsForAssessment,
  classifyToolsInUse,
  filterToolsForProfile,
  hasIndustryOverlay,
  computeConfidenceGap,
  GAP_THRESHOLD,
  scopeSubject,
  describeScope,
  applyScopeFraming,
  describeRole,
  roleVisibilityCaveat,
  applyRoleFraming,
  getVisibilityTagsForDepartment
} from '../src/logic.js';
import { REC_TITLES, REC_BODIES, FRAMEWORK, BASE_QUESTIONS, NONPROFIT_QUESTIONS, YOUTH_QUESTIONS, DEPARTMENTS, VISIBILITY_TAGS } from '../src/data.js';

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

describe('getApplicableModules', () => {
  it('returns only the base module for a for-profit organization that does not serve youth', () => {
    const modules = getApplicableModules({ orgType: 'for-profit', servesYouth: false });
    expect(modules).toEqual(['base']);
  });

  it("adds the nonprofit module when orgType is 'nonprofit'", () => {
    const modules = getApplicableModules({ orgType: 'nonprofit', servesYouth: false });
    expect(modules).toEqual(['base', 'nonprofit']);
  });

  it('adds the youth module when servesYouth is true', () => {
    const modules = getApplicableModules({ orgType: 'for-profit', servesYouth: true });
    expect(modules).toEqual(['base', 'youth']);
  });

  it('adds both the nonprofit and youth modules, in that order, when both conditions are true', () => {
    const modules = getApplicableModules({ orgType: 'nonprofit', servesYouth: true });
    expect(modules).toEqual(['base', 'nonprofit', 'youth']);
  });

  it('returns only the base module when orgType and servesYouth are both null', () => {
    const modules = getApplicableModules({ orgType: null, servesYouth: null });
    expect(modules).toEqual(['base']);
  });

  it('does not add the youth module when servesYouth is a truthy non-boolean value, since the check is strict equality to true', () => {
    const modules = getApplicableModules({ orgType: 'for-profit', servesYouth: 'true' });
    expect(modules).toEqual(['base']);
  });

  it("does not add the nonprofit module when orgType has different casing than the literal string 'nonprofit'", () => {
    const modules = getApplicableModules({ orgType: 'Nonprofit', servesYouth: false });
    expect(modules).toEqual(['base']);
  });
});

describe('getQuestionsForAssessment', () => {
  const forProfit = { orgType: 'for-profit', servesYouth: false };
  const nonprofitOnly = { orgType: 'nonprofit', servesYouth: false };
  const youthOnly = { orgType: 'for-profit', servesYouth: true };
  const nonprofitAndYouth = { orgType: 'nonprofit', servesYouth: true };

  function idsOf(questions) { return questions.map(q => q.id); }
  function atDepth(pool, depth) { return pool.filter(q => q.depths.indexOf(depth) !== -1); }

  it('returns only base questions for a for-profit organization that does not serve youth', () => {
    const result = getQuestionsForAssessment(forProfit, 'standard');
    expect(idsOf(result)).toEqual(idsOf(atDepth(BASE_QUESTIONS, 'standard')));
  });

  it('returns base and nonprofit questions, but no youth questions, for a nonprofit org that does not serve youth', () => {
    const result = getQuestionsForAssessment(nonprofitOnly, 'comprehensive');
    const expected = idsOf(atDepth(BASE_QUESTIONS, 'comprehensive')).concat(idsOf(atDepth(NONPROFIT_QUESTIONS, 'comprehensive')));
    expect(idsOf(result)).toEqual(expected);
    expect(result.some(q => q.module === 'youth')).toBe(false);
  });

  it('returns base and youth questions, but no nonprofit questions, for a for-profit org that serves youth', () => {
    const result = getQuestionsForAssessment(youthOnly, 'comprehensive');
    const expected = idsOf(atDepth(BASE_QUESTIONS, 'comprehensive')).concat(idsOf(atDepth(YOUTH_QUESTIONS, 'comprehensive')));
    expect(idsOf(result)).toEqual(expected);
    expect(result.some(q => q.module === 'nonprofit')).toBe(false);
  });

  it('returns questions from all three pools for a nonprofit org that also serves youth', () => {
    const result = getQuestionsForAssessment(nonprofitAndYouth, 'comprehensive');
    const expected = idsOf(atDepth(BASE_QUESTIONS, 'comprehensive'))
      .concat(idsOf(atDepth(NONPROFIT_QUESTIONS, 'comprehensive')))
      .concat(idsOf(atDepth(YOUTH_QUESTIONS, 'comprehensive')));
    expect(idsOf(result)).toEqual(expected);
  });

  it('returns fewer questions at quick depth than at comprehensive depth for the same profile', () => {
    const quickCount = getQuestionsForAssessment(forProfit, 'quick').length;
    const comprehensiveCount = getQuestionsForAssessment(forProfit, 'comprehensive').length;
    expect(quickCount).toBeLessThan(comprehensiveCount);
  });

  it('returns an empty array when the depth does not match any question', () => {
    const result = getQuestionsForAssessment(nonprofitAndYouth, 'nonexistent-depth');
    expect(result).toEqual([]);
  });

  it('orders the returned questions as base first, then nonprofit, then youth', () => {
    const result = getQuestionsForAssessment(nonprofitAndYouth, 'quick');
    const modules = result.map(q => q.module);
    const firstNonprofitIndex = modules.indexOf('nonprofit');
    const firstYouthIndex = modules.indexOf('youth');
    const lastBaseIndex = modules.lastIndexOf('base');
    expect(lastBaseIndex).toBeLessThan(firstNonprofitIndex);
    expect(modules.lastIndexOf('nonprofit')).toBeLessThan(firstYouthIndex);
  });
});

describe('classifyToolsInUse', () => {
  it('returns empty buckets and passes through otherTools unchanged when no tools are selected', () => {
    const result = classifyToolsInUse([], ['Some Custom Tool']);
    expect(result.flagged['high-risk']).toEqual([]);
    expect(result.flagged['caution']).toEqual([]);
    expect(result.flagged['lower-risk']).toEqual([]);
    expect(result.otherTools).toEqual(['Some Custom Tool']);
  });

  it('buckets tools of different classifications into their respective arrays', () => {
    const result = classifyToolsInUse(['t-grok', 't-chatgpt', 't-canva'], []);
    expect(result.flagged['high-risk'].map(t => t.id)).toEqual(['t-grok']);
    expect(result.flagged['caution'].map(t => t.id)).toEqual(['t-chatgpt']);
    expect(result.flagged['lower-risk'].map(t => t.id)).toEqual(['t-canva']);
  });

  it('silently excludes a selected id that does not exist in TOOL_MASTER_LIST, rather than producing undefined or throwing', () => {
    expect(() => classifyToolsInUse(['does-not-exist'], [])).not.toThrow();
    const result = classifyToolsInUse(['does-not-exist'], []);
    expect(result.flagged['high-risk']).toEqual([]);
    expect(result.flagged['caution']).toEqual([]);
    expect(result.flagged['lower-risk']).toEqual([]);
  });

  it('includes a tool twice in its bucket when its id appears twice in selectedToolIds, since no deduplication is applied', () => {
    const result = classifyToolsInUse(['t-canva', 't-canva'], []);
    expect(result.flagged['lower-risk']).toHaveLength(2);
  });
});

describe('filterToolsForProfile', () => {
  it("includes tools tagged 'all' regardless of the profile's industry", () => {
    const result = filterToolsForProfile({ industry: 'healthcare' });
    expect(result.some(t => t.id === 't-grammarly')).toBe(true);
  });

  it("includes an industry-specific tool when it matches the profile's industry", () => {
    const result = filterToolsForProfile({ industry: 'healthcare' });
    expect(result.some(t => t.id === 't-abridge')).toBe(true);
  });

  it("excludes an industry-specific tool that doesn't match the profile's industry and isn't tagged 'all'", () => {
    const result = filterToolsForProfile({ industry: 'healthcare' });
    expect(result.some(t => t.id === 't-github-copilot')).toBe(false);
  });

  it('includes a tool tagged with multiple specific industries when the profile matches any one of them', () => {
    expect(filterToolsForProfile({ industry: 'financial' }).some(t => t.id === 't-hebbia')).toBe(true);
    expect(filterToolsForProfile({ industry: 'professional' }).some(t => t.id === 't-hebbia')).toBe(true);
    expect(filterToolsForProfile({ industry: 'retail' }).some(t => t.id === 't-hebbia')).toBe(false);
  });

  it("returns only 'all'-tagged tools when profile.industry is null", () => {
    const result = filterToolsForProfile({ industry: null });
    expect(result.every(t => t.industries.indexOf('all') !== -1)).toBe(true);
    expect(result.some(t => t.id === 't-abridge')).toBe(false);
  });

  it("returns only 'all'-tagged tools when profile.industry doesn't match any tool's industry list", () => {
    const result = filterToolsForProfile({ industry: 'not-a-real-industry' });
    expect(result.every(t => t.industries.indexOf('all') !== -1)).toBe(true);
  });
});

describe('hasIndustryOverlay', () => {
  it('returns false for a nonprofit/youth-serving profile, since overlays are handled via independent modules instead', () => {
    expect(hasIndustryOverlay({ orgType: 'nonprofit', servesYouth: true, industry: 'nonprofit-social' })).toBe(false);
  });

  it('returns false for a healthcare profile, documenting that no industry-specific overlay is implemented yet in v2', () => {
    expect(hasIndustryOverlay({ orgType: 'for-profit', servesYouth: false, industry: 'healthcare' })).toBe(false);
  });

  it('returns false when called with no argument at all', () => {
    expect(hasIndustryOverlay()).toBe(false);
  });
});

describe('computeConfidenceGap', () => {
  // Two questions per function so evidence percentages land on clean numbers (0/50/100).
  const questions = [
    { id: 'g1', fn: 'govern' }, { id: 'g2', fn: 'govern' },
    { id: 'm1', fn: 'map' }, { id: 'm2', fn: 'map' },
    { id: 'me1', fn: 'measure' }, { id: 'me2', fn: 'measure' },
    { id: 'ma1', fn: 'manage' }, { id: 'ma2', fn: 'manage' }
  ];

  it('flags overconfident when self-reported confidence exceeds evidence by at least GAP_THRESHOLD', () => {
    // govern evidence: 0/6 = 0%. confidence: 5 -> (5-1)/4*100 = 100%. gap = 100, well over threshold.
    const scores = computeScores(questions, { g1: 0, g2: 0 });
    const result = computeConfidenceGap(scores, { govern: 5 });
    expect(result.govern.evidencePct).toBe(0);
    expect(result.govern.confidencePct).toBe(100);
    expect(result.govern.gap).toBe(100);
    expect(result.govern.status).toBe('overconfident');
  });

  it('flags underconfident when evidence exceeds self-reported confidence by at least GAP_THRESHOLD', () => {
    // map evidence: 6/6 = 100%. confidence: 1 -> 0%. gap = -100.
    const scores = computeScores(questions, { m1: 3, m2: 3 });
    const result = computeConfidenceGap(scores, { map: 1 });
    expect(result.map.evidencePct).toBe(100);
    expect(result.map.confidencePct).toBe(0);
    expect(result.map.gap).toBe(-100);
    expect(result.map.status).toBe('underconfident');
  });

  it('treats a gap within GAP_THRESHOLD as aligned', () => {
    // measure evidence: 3/6 = 50%. confidence: 3 -> 50%. gap = 0.
    const scores = computeScores(questions, { me1: 3, me2: 0 });
    const result = computeConfidenceGap(scores, { measure: 3 });
    expect(result.measure.evidencePct).toBe(50);
    expect(result.measure.confidencePct).toBe(50);
    expect(result.measure.gap).toBe(0);
    expect(result.measure.status).toBe('aligned');
  });

  it('treats a gap just under GAP_THRESHOLD as aligned, not overconfident', () => {
    const boundaryScores = { fnScores: { govern: { sum: 0, max: 0 }, map: { sum: 0, max: 0 }, measure: { sum: 0, max: 0 }, manage: { sum: 60, max: 100 } } };
    const result = computeConfidenceGap(boundaryScores, { manage: 4 }); // confidence 75%, evidence 60%, gap = 15
    expect(result.manage.gap).toBe(15);
    expect(result.manage.status).toBe('aligned');
  });

  it('treats a gap of exactly +GAP_THRESHOLD as overconfident (inclusive boundary)', () => {
    // evidence 55%, confidence 75% (v=4) -> gap = 20 = GAP_THRESHOLD exactly.
    const scores = { fnScores: { govern: { sum: 0, max: 0 }, map: { sum: 0, max: 0 }, measure: { sum: 0, max: 0 }, manage: { sum: 55, max: 100 } } };
    const result = computeConfidenceGap(scores, { manage: 4 });
    expect(result.manage.evidencePct).toBe(55);
    expect(result.manage.confidencePct).toBe(75);
    expect(result.manage.gap).toBe(GAP_THRESHOLD);
    expect(result.manage.status).toBe('overconfident');
  });

  it('treats a gap of exactly -GAP_THRESHOLD as underconfident (inclusive boundary)', () => {
    // evidence 70%, confidence 50% (v=3) -> gap = -20 = -GAP_THRESHOLD exactly.
    const scores = { fnScores: { govern: { sum: 0, max: 0 }, map: { sum: 0, max: 0 }, measure: { sum: 0, max: 0 }, manage: { sum: 70, max: 100 } } };
    const result = computeConfidenceGap(scores, { manage: 3 });
    expect(result.manage.evidencePct).toBe(70);
    expect(result.manage.confidencePct).toBe(50);
    expect(result.manage.gap).toBe(-GAP_THRESHOLD);
    expect(result.manage.status).toBe('underconfident');
  });

  it('returns status "unknown" with a null confidencePct when a function has no self-reported answer', () => {
    const scores = computeScores(questions, { g1: 2, g2: 2 });
    const result = computeConfidenceGap(scores, {}); // no confidence answers at all
    expect(result.govern.confidencePct).toBeNull();
    expect(result.govern.gap).toBeNull();
    expect(result.govern.status).toBe('unknown');
  });

  it('always returns all four NIST functions, even ones with no evidence questions answered', () => {
    const scores = computeScores(questions, {});
    const result = computeConfidenceGap(scores, { govern: 3, map: 3, measure: 3, manage: 3 });
    expect(Object.keys(result).sort()).toEqual(['govern', 'manage', 'map', 'measure']);
  });
});


describe('scopeSubject', () => {
  it('returns "your department" for department scope', () => {
    expect(scopeSubject('department')).toBe('your department');
  });

  it('returns "this initiative" for initiative scope', () => {
    expect(scopeSubject('initiative')).toBe('this initiative');
  });

  it('returns "your organization" for org scope', () => {
    expect(scopeSubject('org')).toBe('your organization');
  });

  it('defaults to "your organization" for an unrecognized or missing scope id', () => {
    expect(scopeSubject(undefined)).toBe('your organization');
    expect(scopeSubject('something-else')).toBe('your organization');
  });
});

describe('describeScope', () => {
  it('describes a null/missing scope as whole organization', () => {
    expect(describeScope(null)).toBe('Whole organization');
    expect(describeScope({})).toBe('Whole organization');
  });

  it('describes org scope as whole organization regardless of a stray name', () => {
    expect(describeScope({ id: 'org', name: 'Marketing' })).toBe('Whole organization');
  });

  it('describes a named department scope', () => {
    expect(describeScope({ id: 'department', name: 'Marketing' })).toBe('Marketing department');
  });

  it('describes an unnamed department scope', () => {
    expect(describeScope({ id: 'department', name: '' })).toBe('A specific department (unnamed)');
    expect(describeScope({ id: 'department', name: '   ' })).toBe('A specific department (unnamed)');
  });

  it('describes a named initiative scope', () => {
    expect(describeScope({ id: 'initiative', name: 'Customer-support chatbot' })).toBe('Customer-support chatbot (AI initiative)');
  });

  it('describes an unnamed initiative scope', () => {
    expect(describeScope({ id: 'initiative', name: undefined })).toBe('A specific AI initiative (unnamed)');
  });
});

describe('applyScopeFraming', () => {
  const baseRecs = [
    { priority: 'high', fn: 'govern', module: 'base', title: 'Write a basic AI use policy', body: 'No baseline in place today.' }
  ];

  it('returns the same recs unchanged for org scope', () => {
    const result = applyScopeFraming(baseRecs, { id: 'org', name: '' });
    expect(result).toEqual(baseRecs);
  });

  it('returns the same recs unchanged when scope is missing entirely', () => {
    expect(applyScopeFraming(baseRecs, null)).toEqual(baseRecs);
    expect(applyScopeFraming(baseRecs, undefined)).toEqual(baseRecs);
  });

  it('appends a department-scoped note without mutating the original recs', () => {
    const result = applyScopeFraming(baseRecs, { id: 'department', name: 'Marketing' });
    expect(result[0].body).toContain('Scoped to Marketing');
    expect(result[0].body).toContain('Organization-wide AI governance may already exist above this level');
    expect(baseRecs[0].body).toBe('No baseline in place today.'); // original untouched
  });

  it('falls back to a generic department name when none is given', () => {
    const result = applyScopeFraming(baseRecs, { id: 'department', name: '' });
    expect(result[0].body).toContain('Scoped to this department');
  });

  it('appends an initiative-scoped note framed as a pre-deployment review', () => {
    const result = applyScopeFraming(baseRecs, { id: 'initiative', name: 'Customer-support chatbot' });
    expect(result[0].body).toContain('Scoped to Customer-support chatbot');
    expect(result[0].body).toContain('pre-deployment review');
  });

  it('falls back to a generic initiative name when none is given', () => {
    const result = applyScopeFraming(baseRecs, { id: 'initiative', name: null });
    expect(result[0].body).toContain('Scoped to this AI initiative');
  });

  it('preserves every other field on each recommendation unchanged', () => {
    const result = applyScopeFraming(baseRecs, { id: 'department', name: 'Ops' });
    expect(result[0].priority).toBe(baseRecs[0].priority);
    expect(result[0].fn).toBe(baseRecs[0].fn);
    expect(result[0].module).toBe(baseRecs[0].module);
    expect(result[0].title).toBe(baseRecs[0].title);
  });

  it('handles an empty recs array', () => {
    expect(applyScopeFraming([], { id: 'department', name: 'Ops' })).toEqual([]);
  });
});

describe('describeRole', () => {
  it('returns null for a missing or empty role', () => {
    expect(describeRole(null)).toBeNull();
    expect(describeRole({})).toBeNull();
  });

  it('describes the leadership role', () => {
    expect(describeRole({ id: 'leadership' })).toBe('Leadership / executive');
  });

  it('describes the department-role respondent type', () => {
    expect(describeRole({ id: 'dept-role' })).toBe('Department / function');
  });

  it('describes an employee role without a department', () => {
    expect(describeRole({ id: 'employee', department: '' })).toBe('Individual employee');
    expect(describeRole({ id: 'employee' })).toBe('Individual employee');
  });

  it('describes an employee role with a department, trimmed', () => {
    expect(describeRole({ id: 'employee', department: '  Marketing  ' })).toBe('Individual employee (Marketing)');
  });

  it('returns null for an unrecognized role id', () => {
    expect(describeRole({ id: 'something-else' })).toBeNull();
  });
});

describe('roleVisibilityCaveat', () => {
  it('returns null when role is missing entirely', () => {
    expect(roleVisibilityCaveat(null, { id: 'org' })).toBeNull();
    expect(roleVisibilityCaveat({}, { id: 'org' })).toBeNull();
  });

  it('returns null for leadership regardless of scope', () => {
    expect(roleVisibilityCaveat({ id: 'leadership' }, { id: 'org' })).toBeNull();
    expect(roleVisibilityCaveat({ id: 'leadership' }, { id: 'department' })).toBeNull();
  });

  it('flags an individual employee assessing the whole organization', () => {
    const caveat = roleVisibilityCaveat({ id: 'employee' }, { id: 'org' });
    expect(caveat).toContain('individual employee');
    expect(caveat).toContain('whole organization');
  });

  it('flags a department-role respondent assessing the whole organization', () => {
    const caveat = roleVisibilityCaveat({ id: 'dept-role' }, { id: 'org' });
    expect(caveat).toContain('single department/function');
  });

  it('treats a missing scope the same as org scope', () => {
    expect(roleVisibilityCaveat({ id: 'employee' }, null)).toContain('whole organization');
    expect(roleVisibilityCaveat({ id: 'employee' }, undefined)).toContain('whole organization');
  });

  it('returns null when a narrower role matches a narrower scope', () => {
    expect(roleVisibilityCaveat({ id: 'employee' }, { id: 'department' })).toBeNull();
    expect(roleVisibilityCaveat({ id: 'dept-role' }, { id: 'initiative' })).toBeNull();
  });

  it('returns null for an unrecognized role id', () => {
    expect(roleVisibilityCaveat({ id: 'something-else' }, { id: 'org' })).toBeNull();
  });
});

describe('applyRoleFraming', () => {
  const baseRecs = [
    { priority: 'high', fn: 'govern', module: 'base', title: 'Write a basic AI use policy', body: 'No baseline in place today.' }
  ];

  it('returns the same recs unchanged when no caveat applies', () => {
    const result = applyRoleFraming(baseRecs, { id: 'leadership' }, { id: 'org' });
    expect(result).toEqual(baseRecs);
  });

  it('returns the same recs unchanged when role is missing', () => {
    expect(applyRoleFraming(baseRecs, null, { id: 'org' })).toEqual(baseRecs);
  });

  it('appends the role caveat without mutating the original recs', () => {
    const result = applyRoleFraming(baseRecs, { id: 'employee' }, { id: 'org' });
    expect(result[0].body).toContain('No baseline in place today.');
    expect(result[0].body).toContain('individual employee');
    expect(baseRecs[0].body).toBe('No baseline in place today.'); // original untouched
  });

  it('preserves every other field on each recommendation unchanged', () => {
    const result = applyRoleFraming(baseRecs, { id: 'dept-role' }, { id: 'org' });
    expect(result[0].priority).toBe(baseRecs[0].priority);
    expect(result[0].fn).toBe(baseRecs[0].fn);
    expect(result[0].module).toBe(baseRecs[0].module);
    expect(result[0].title).toBe(baseRecs[0].title);
  });

  it('handles an empty recs array', () => {
    expect(applyRoleFraming([], { id: 'employee' }, { id: 'org' })).toEqual([]);
  });

  it('composes cleanly after applyScopeFraming (both notes present)', () => {
    const scoped = applyScopeFraming(baseRecs, { id: 'org', name: '' });
    const result = applyRoleFraming(scoped, { id: 'employee' }, { id: 'org' });
    expect(result[0].body).toContain('individual employee');
  });
});

describe('getVisibilityTagsForDepartment (B4)', () => {
  it('grants every recognized department at least operational visibility', () => {
    DEPARTMENTS.forEach(function(d) {
      expect(getVisibilityTagsForDepartment(d.id)).toContain('operational');
    });
  });

  it('grants strategic visibility only to the executive department', () => {
    expect(getVisibilityTagsForDepartment('executive')).toContain('strategic');
    DEPARTMENTS.filter(function(d) { return d.id !== 'executive'; }).forEach(function(d) {
      expect(getVisibilityTagsForDepartment(d.id)).not.toContain('strategic');
    });
  });

  it('grants technical-build visibility only to the IT/engineering department', () => {
    expect(getVisibilityTagsForDepartment('it-engineering')).toContain('technical-build');
    DEPARTMENTS.filter(function(d) { return d.id !== 'it-engineering'; }).forEach(function(d) {
      expect(getVisibilityTagsForDepartment(d.id)).not.toContain('technical-build');
    });
  });

  it('grants legal-compliance visibility only to the legal department', () => {
    expect(getVisibilityTagsForDepartment('legal')).toContain('legal-compliance');
    DEPARTMENTS.filter(function(d) { return d.id !== 'legal'; }).forEach(function(d) {
      expect(getVisibilityTagsForDepartment(d.id)).not.toContain('legal-compliance');
    });
  });

  it('every returned tag is a real VISIBILITY_TAGS value for every recognized department', () => {
    DEPARTMENTS.forEach(function(d) {
      getVisibilityTagsForDepartment(d.id).forEach(function(tag) {
        expect(VISIBILITY_TAGS).toContain(tag);
      });
    });
  });

  it('falls back to operational-only for an unrecognized department id', () => {
    expect(getVisibilityTagsForDepartment('not-a-real-department')).toEqual(['operational']);
  });

  it('falls back to operational-only for a missing department id', () => {
    expect(getVisibilityTagsForDepartment(undefined)).toEqual(['operational']);
    expect(getVisibilityTagsForDepartment(null)).toEqual(['operational']);
    expect(getVisibilityTagsForDepartment('')).toEqual(['operational']);
  });

  it('does not mutate its internal map across repeated calls', () => {
    const first = getVisibilityTagsForDepartment('executive');
    first.push('operational'); // caller mutating the returned array should not corrupt future calls
    const second = getVisibilityTagsForDepartment('executive');
    expect(second).toEqual(['strategic', 'operational']);
  });
});

describe('DEPARTMENTS and VISIBILITY_TAGS data integrity (B4)', () => {
  it('has no duplicate department ids', () => {
    const ids = DEPARTMENTS.map(function(d) { return d.id; });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate visibility tags', () => {
    expect(new Set(VISIBILITY_TAGS).size).toBe(VISIBILITY_TAGS.length);
  });

  it('does not let any department id collide with a SCOPE_OPTIONS or ROLE_OPTIONS id', () => {
    const reservedIds = ['org', 'department', 'initiative', 'leadership', 'dept-role', 'employee'];
    DEPARTMENTS.forEach(function(d) {
      expect(reservedIds).not.toContain(d.id);
    });
  });

  it('does not let any visibility tag collide with a SCOPE_OPTIONS or ROLE_OPTIONS id', () => {
    const reservedIds = ['org', 'department', 'initiative', 'leadership', 'dept-role', 'employee'];
    VISIBILITY_TAGS.forEach(function(tag) {
      expect(reservedIds).not.toContain(tag);
    });
  });
});
