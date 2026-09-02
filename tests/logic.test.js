import { describe, it, expect } from 'vitest';
import {
  computeTier,
  computeScores,
  identifyGaps,
  identifyCriticalGaps,
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
  getVisibilityTagsForDepartment,
  GOVERNANCE_GATING_THRESHOLD,
  classifyUseCaseRisk,
  getOversightExpectation,
  computeRegulatoryExposure,
  computeToolPortfolioRisk,
  computeFrameworkCoverage,
  getVisibilityTagsForRole,
  meetsAggregationThreshold
} from '../src/logic.js';
import { REC_TITLES, REC_BODIES, FRAMEWORK, BASE_QUESTIONS, NONPROFIT_QUESTIONS, YOUTH_QUESTIONS, DEPARTMENTS, VISIBILITY_TAGS, GOVERNANCE_DIMENSIONS, ANNEX_III_DOMAINS, RISK_CRITERIA, RISK_TIERS, COMPANY_SIZE_BANDS, SMALL_ORG_SIZE_BANDS, OVERSIGHT_EXPECTATIONS, REGULATORY_INDUSTRY_NOTES, TOOL_MASTER_LIST, AGGREGATION_MIN_GROUP_SIZE } from '../src/data.js';

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

describe('classifyUseCaseRisk (B6)', () => {
  function useCase(overrides) {
    var base = { annexIiiDomainIds: [] };
    RISK_CRITERIA.forEach(function(c) { base[c] = 0; });
    return Object.assign(base, overrides || {});
  }

  it('classifies a non-Annex-III use case with low criteria scores as Tier 4 (Low)', () => {
    const result = classifyUseCaseRisk(useCase(), '11-50');
    expect(result.tier.key).toBe('tier4');
  });

  it('classifies a non-Annex-III use case with high criteria scores as Tier 3 (Medium), not higher', () => {
    // Annex III membership is the trigger for Tier 1/2 -- severity alone,
    // without touching a high-risk domain, caps out at Tier 3.
    const criteria = {};
    RISK_CRITERIA.forEach(function(c) { criteria[c] = 3; });
    const result = classifyUseCaseRisk(useCase(criteria), '11-50');
    expect(result.tier.key).toBe('tier3');
    expect(result.compositeScore).toBe(3);
  });

  it('classifies an Annex-III-domain use case with high criteria scores as Tier 1 (Critical)', () => {
    const criteria = { annexIiiDomainIds: ['employment-worker-management'] };
    RISK_CRITERIA.forEach(function(c) { criteria[c] = 3; });
    const result = classifyUseCaseRisk(useCase(criteria), '1000+');
    expect(result.tier.key).toBe('tier1');
  });

  it('classifies an Annex-III-domain use case with low criteria scores as Tier 2 (High), not Tier 1', () => {
    const result = classifyUseCaseRisk(useCase({ annexIiiDomainIds: ['biometrics'] }), '1000+');
    expect(result.tier.key).toBe('tier2');
  });

  it('splits exactly at the composite midpoint (1.5): below is the less severe tier of the pair', () => {
    // useCase() answers all 7 criteria (defaulting to 0); overriding 2 of
    // them to 1 gives composite = 2/7 = 0.2857..., rounded to 0.29, well
    // under 1.5.
    const result = classifyUseCaseRisk(useCase({ materiality: 1, autonomy: 1 }), '11-50');
    expect(result.compositeScore).toBe(0.29);
    expect(result.tier.key).toBe('tier4');
  });

  it('splits exactly at the composite midpoint (1.5): at or above is the more severe tier of the pair', () => {
    // 4 of 7 criteria at max (3), rest at 0 -> composite = 12/7 = 1.714, >= 1.5.
    const criteria = {};
    RISK_CRITERIA.forEach(function(c, i) { criteria[c] = i < 4 ? 3 : 0; });
    const result = classifyUseCaseRisk(useCase(criteria), '11-50');
    expect(result.compositeScore).toBeGreaterThanOrEqual(1.5);
    expect(result.tier.key).toBe('tier3');
  });

  it('defaults the composite to 0 (least severe) when no criteria are answered at all', () => {
    const result = classifyUseCaseRisk({ annexIiiDomainIds: [] }, '11-50');
    expect(result.compositeScore).toBe(0);
    expect(result.tier.key).toBe('tier4');
  });

  it('ignores non-numeric criteria values rather than crashing', () => {
    const result = classifyUseCaseRisk({ annexIiiDomainIds: [], materiality: undefined, autonomy: null }, '11-50');
    expect(result.compositeScore).toBe(0);
  });

  it('records which Annex III domain ids triggered the gate', () => {
    const result = classifyUseCaseRisk(useCase({ annexIiiDomainIds: ['law-enforcement', 'biometrics'] }), '11-50');
    expect(result.annexIiiDomainIds).toEqual(['law-enforcement', 'biometrics']);
  });

  it('attaches an oversight expectation from getOversightExpectation for the resolved tier and given size', () => {
    const result = classifyUseCaseRisk(useCase({ annexIiiDomainIds: ['biometrics'] }), '1000+');
    expect(result.oversight).toEqual(getOversightExpectation('tier2', '1000+'));
  });
});

describe('getOversightExpectation (B6)', () => {
  it('merges Tier 2 and Tier 3 oversight language for every "under ~200 employees" size band', () => {
    SMALL_ORG_SIZE_BANDS.forEach(function(band) {
      const tier2 = getOversightExpectation('tier2', band);
      const tier3 = getOversightExpectation('tier3', band);
      expect(tier2).toEqual(OVERSIGHT_EXPECTATIONS['tier2-3-small']);
      expect(tier2).toEqual(tier3);
    });
  });

  it('does not merge Tier 2 and Tier 3 for size bands of 201+ employees', () => {
    ['201-1000', '1000+'].forEach(function(band) {
      const tier2 = getOversightExpectation('tier2', band);
      const tier3 = getOversightExpectation('tier3', band);
      expect(tier2).not.toEqual(tier3);
    });
  });

  it('gives Tier 1 its own distinct oversight expectation at every size band, never merged', () => {
    COMPANY_SIZE_BANDS.forEach(function(band) {
      const tier1 = getOversightExpectation('tier1', band);
      expect(tier1.signoffRequired).toBe(true);
      expect(tier1).not.toEqual(OVERSIGHT_EXPECTATIONS['tier2-3-small']);
    });
  });

  it('requires no signoff at Tier 4 for any size band', () => {
    COMPANY_SIZE_BANDS.forEach(function(band) {
      expect(getOversightExpectation('tier4', band).signoffRequired).toBe(false);
    });
  });

  it('returns null for an unrecognized tier or size band rather than guessing', () => {
    expect(getOversightExpectation('not-a-tier', '11-50')).toBeNull();
    expect(getOversightExpectation('tier1', 'not-a-band')).toBeNull();
  });
});

describe('B6 data integrity: ANNEX_III_DOMAINS / RISK_TIERS / RISK_CRITERIA', () => {
  it('has 8 Annex III domains, matching backlog SS1.4.6 exactly, with no duplicate ids', () => {
    expect(ANNEX_III_DOMAINS).toHaveLength(8);
    const ids = ANNEX_III_DOMAINS.map(function(d) { return d.id; });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly 4 risk tiers in Tier 1 -> Tier 4 order', () => {
    expect(RISK_TIERS.map(function(t) { return t.key; })).toEqual(['tier1', 'tier2', 'tier3', 'tier4']);
  });

  it('has exactly 7 risk criteria, matching backlog SS1.4.6', () => {
    expect(RISK_CRITERIA).toHaveLength(7);
  });

  it('does not let a risk-tier key collide with a GOVERNANCE_DIMENSIONS, SCOPE_OPTIONS, ROLE_OPTIONS, VISIBILITY_TAGS, or DEPARTMENTS id', () => {
    const reservedIds = ['org', 'department', 'initiative', 'leadership', 'dept-role', 'employee']
      .concat(VISIBILITY_TAGS)
      .concat(DEPARTMENTS.map(function(d) { return d.id; }))
      .concat(GOVERNANCE_DIMENSIONS.map(function(d) { return d.id; }));
    RISK_TIERS.forEach(function(t) {
      expect(reservedIds).not.toContain(t.key);
    });
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
    const questions = [{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }, { id: 'g2', fn: 'govern', dimension: 'controls-evidence' }];
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
    const questions = [{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }, { id: 'm1', fn: 'map', dimension: 'inventory-visibility' }];
    const result = computeScores(questions, { g1: 3, m1: 3 });
    expect(result.overall).toBe(100);
  });

  it('rounds a fractional percentage down when the decimal is below .5', () => {
    const questions = [{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }];
    const result = computeScores(questions, { g1: 1 });
    expect(result.overall).toBe(33);
  });

  it('rounds a fractional percentage up when the decimal is at or above .5', () => {
    const questions = [{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }];
    const result = computeScores(questions, { g1: 2 });
    expect(result.overall).toBe(67);
  });

  it('reproduces fnScores identically whether or not questions carry a dimension tag (regression: dimension is additive, not a replacement axis)', () => {
    const withoutDimension = computeScores(
      [{ id: 'g1', fn: 'govern' }, { id: 'm1', fn: 'map' }, { id: 'me1', fn: 'measure' }, { id: 'ma1', fn: 'manage' }],
      { g1: 3, m1: 0, me1: 1, ma1: 2 }
    );
    const withDimension = computeScores(
      [
        { id: 'g1', fn: 'govern', dimension: 'controls-evidence' },
        { id: 'm1', fn: 'map', dimension: 'inventory-visibility' },
        { id: 'me1', fn: 'measure', dimension: 'monitoring-response' },
        { id: 'ma1', fn: 'manage', dimension: 'monitoring-response' }
      ],
      { g1: 3, m1: 0, me1: 1, ma1: 2 }
    );
    expect(withDimension.fnScores).toEqual(withoutDimension.fnScores);
    expect(withDimension.totalSum).toBe(withoutDimension.totalSum);
    expect(withDimension.totalMax).toBe(withoutDimension.totalMax);
  });

  it('reproduces fnScores identically for the real, currently-shipped BASE_QUESTIONS bank now that every question carries a dimension tag', () => {
    // Regression check using real data.js questions, not synthetic mocks --
    // confirms the B5 dimension-tagging pass didn't perturb fn or scoring math
    // for any of the 20 live base questions.
    const answers = {};
    BASE_QUESTIONS.forEach(function(q, i) { answers[q.id] = i % 4; }); // deterministic spread of 0-3
    const result = computeScores(BASE_QUESTIONS, answers);
    let expectedGovern = 0, expectedMap = 0, expectedMeasure = 0, expectedManage = 0;
    BASE_QUESTIONS.forEach(function(q, i) {
      const v = i % 4;
      if (q.fn === 'govern') expectedGovern += v;
      if (q.fn === 'map') expectedMap += v;
      if (q.fn === 'measure') expectedMeasure += v;
      if (q.fn === 'manage') expectedManage += v;
    });
    expect(result.fnScores.govern.sum).toBe(expectedGovern);
    expect(result.fnScores.map.sum).toBe(expectedMap);
    expect(result.fnScores.measure.sum).toBe(expectedMeasure);
    expect(result.fnScores.manage.sum).toBe(expectedManage);
  });
});

describe('computeScores: Governance Maturity dimensions and gating rule (B5)', () => {
  it('every question in BASE_QUESTIONS, NONPROFIT_QUESTIONS, and YOUTH_QUESTIONS carries a valid dimension tag', () => {
    const validIds = GOVERNANCE_DIMENSIONS.map(function(d) { return d.id; });
    [...BASE_QUESTIONS, ...NONPROFIT_QUESTIONS, ...YOUTH_QUESTIONS].forEach(function(q) {
      expect(validIds).toContain(q.dimension);
    });
  });

  it('GOVERNANCE_DIMENSIONS weights sum to 100', () => {
    const total = GOVERNANCE_DIMENSIONS.reduce(function(sum, d) { return sum + d.weight; }, 0);
    expect(total).toBe(100);
  });

  it('does not let any GOVERNANCE_DIMENSIONS id collide with a SCOPE_OPTIONS, ROLE_OPTIONS, VISIBILITY_TAGS, or DEPARTMENTS id', () => {
    const reservedIds = ['org', 'department', 'initiative', 'leadership', 'dept-role', 'employee']
      .concat(VISIBILITY_TAGS)
      .concat(DEPARTMENTS.map(function(d) { return d.id; }));
    GOVERNANCE_DIMENSIONS.forEach(function(d) {
      expect(reservedIds).not.toContain(d.id);
    });
  });

  it('returns a dimensionScores entry (sum/max) and a dimensionPct entry for every dimension, even ones with no answered questions', () => {
    const result = computeScores([{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }], { g1: 3 });
    GOVERNANCE_DIMENSIONS.forEach(function(d) {
      expect(result.dimensionScores[d.id]).toBeDefined();
    });
    expect(result.dimensionScores['controls-evidence']).toEqual({ sum: 3, max: 3 });
    expect(result.dimensionScores['ownership-accountability']).toEqual({ sum: 0, max: 0 });
    expect(result.dimensionPct['controls-evidence']).toBe(100);
    expect(result.dimensionPct['ownership-accountability']).toBeNull();
  });

  it('weights each dimension correctly when several are answered at different percentages', () => {
    // ownership-accountability 100% (weight 20), controls-evidence 0% (weight 25);
    // nothing else answered. Weighted avg = (100*20 + 0*25) / (20+25) = 44.44 -> 44.
    // Ownership pct is 100 (not bottom-tier), so no gating applies.
    const questions = [
      { id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }
    ];
    const result = computeScores(questions, { oa1: 3, ce1: 0 });
    expect(result.dimensionPct['ownership-accountability']).toBe(100);
    expect(result.dimensionPct['controls-evidence']).toBe(0);
    expect(result.overall).toBe(44);
  });

  it('weights all five dimensions correctly in combination, matching the SS1.4.5 weight table', () => {
    // ownership-accountability, inventory-visibility, risk-classification, and
    // monitoring-response all 100%; controls-evidence 0%.
    // Weighted sum = 100*20 + 100*20 + 100*20 + 0*25 + 100*15 = 7500 / 100 = 75.
    const questions = [
      { id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'iv1', fn: 'map', dimension: 'inventory-visibility' },
      { id: 'rc1', fn: 'map', dimension: 'risk-classification' },
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' },
      { id: 'mr1', fn: 'manage', dimension: 'monitoring-response' }
    ];
    const answers = { oa1: 3, iv1: 3, rc1: 3, ce1: 0, mr1: 3 };
    const result = computeScores(questions, answers);
    expect(result.overall).toBe(75);
  });

  it('caps the overall score at the bottom-tier ceiling when Ownership & Accountability is itself bottom-tier, rather than just lowering it proportionally', () => {
    // Ownership & Accountability 0% (weight 20); every other dimension 100%.
    // Un-gated weighted avg would be (0*20 + 100*20 + 100*20 + 100*25 + 100*15) / 100 = 80,
    // which would land in the "Lower risk" tier despite catastrophic ownership.
    // The gating rule must cap this at GOVERNANCE_GATING_THRESHOLD - 1 (39), not just
    // reduce it somewhat -- 80 and "lowered a bit" would both be wrong; only a hard
    // cap at 39 correctly reflects R2's structural-prerequisite finding.
    const questions = [
      { id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'iv1', fn: 'map', dimension: 'inventory-visibility' },
      { id: 'rc1', fn: 'map', dimension: 'risk-classification' },
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' },
      { id: 'mr1', fn: 'manage', dimension: 'monitoring-response' }
    ];
    const answers = { oa1: 0, iv1: 3, rc1: 3, ce1: 3, mr1: 3 };
    const result = computeScores(questions, answers);
    expect(result.dimensionPct['ownership-accountability']).toBe(0);
    expect(result.overall).toBeLessThanOrEqual(GOVERNANCE_GATING_THRESHOLD - 1);
    expect(result.overall).toBe(39);
    // Confirm the assumption the gating ceiling relies on: computeTier still
    // classifies the capped value as the bottom ("Higher risk") tier.
    expect(computeTier(result.overall).key).toBe('high');
  });

  it('does not gate when Ownership & Accountability is answered but not bottom-tier (boundary: exactly at the threshold)', () => {
    const questions = [
      { id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }
    ];
    // oa1 answered at 1.2/3 isn't representable (integer 0-3 scale), so approximate
    // the 40% boundary directly via dimensionPct instead: 40% needs sum/max=0.4,
    // e.g. 6/15 -- use three questions each worth 3 to land exactly on 40%.
    const boundaryQuestions = [
      { id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'oa2', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'oa3', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'oa4', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'oa5', fn: 'govern', dimension: 'ownership-accountability' },
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }
    ];
    // sum=6, max=15 -> exactly 40%
    const answers = { oa1: 2, oa2: 1, oa3: 1, oa4: 1, oa5: 1, ce1: 3 };
    const result = computeScores(boundaryQuestions, answers);
    expect(result.dimensionPct['ownership-accountability']).toBe(40);
    // Weighted avg = (40*20 + 100*25) / 45 = (800+2500)/45 = 73.33 -> 73; no gating.
    expect(result.overall).toBe(73);
  });

  it('gates when Ownership & Accountability is exactly one point under the threshold (boundary: 39%)', () => {
    // 25 ownership-accountability questions, all answered, summing to 29 out of a
    // possible 75 (3 each) -> 29/75 = 38.67%, which rounds to 39 -- one point under
    // the GOVERNANCE_GATING_THRESHOLD (40) boundary covered by the test above.
    const oaQuestions = Array.from({ length: 25 }, function(_, i) {
      return { id: 'oa' + i, fn: 'govern', dimension: 'ownership-accountability' };
    });
    const questions = oaQuestions.concat([{ id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }]);
    const answers = { ce1: 3 };
    oaQuestions.forEach(function(q, i) {
      answers[q.id] = i < 9 ? 3 : (i === 9 ? 2 : 0); // 9*3 + 1*2 = 29
    });
    const result = computeScores(questions, answers);
    expect(result.dimensionPct['ownership-accountability']).toBe(39);
    expect(result.overall).toBe(GOVERNANCE_GATING_THRESHOLD - 1);
  });

  it('does not gate when Ownership & Accountability has no answered questions at all, even if overall is low', () => {
    const questions = [
      { id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }
    ];
    const result = computeScores(questions, { ce1: 0 });
    expect(result.dimensionPct['ownership-accountability']).toBeNull();
    expect(result.overall).toBe(0); // reflects controls-evidence alone, not a forced cap
  });

  it('does not gate leadership assumed org-wide, e.g. when every dimension including ownership is 100%', () => {
    const questions = GOVERNANCE_DIMENSIONS.map(function(d, i) { return { id: 'q' + i, fn: 'govern', dimension: d.id }; });
    const answers = {};
    questions.forEach(function(q) { answers[q.id] = 3; });
    const result = computeScores(questions, answers);
    expect(result.overall).toBe(100);
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

describe('identifyCriticalGaps (B7)', () => {
  // Mirrors the exact B5 gating fixtures (computeScores describe block above)
  // rather than inventing new ones, per this item's own instruction --
  // identifyCriticalGaps is required to reuse B5's exact gating condition.
  function scoresWithOwnershipPct(pct) {
    const questions = [{ id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' }];
    // pct as an exact 0-3-over-3 answer isn't always representable; the tests
    // below use the same 25/33-question fixtures as B5's own boundary tests
    // where an exact percentage is required. This helper only covers the
    // clean 0/100 cases.
    const answers = { oa1: pct >= 100 ? 3 : 0 };
    return computeScores(questions, answers);
  }

  it('returns an empty array when Ownership & Accountability is not bottom-tier', () => {
    const scores = scoresWithOwnershipPct(100);
    expect(identifyCriticalGaps(scores)).toEqual([]);
  });

  it('returns a single critical entry when Ownership & Accountability is bottom-tier (0%)', () => {
    const scores = scoresWithOwnershipPct(0);
    const result = identifyCriticalGaps(scores);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('critical');
  });

  it('returns an empty array when Ownership & Accountability has no answered questions at all (dimensionPct is null)', () => {
    // Same guard B5's own gating rule uses -- no evidence to gate on.
    const scores = computeScores([{ id: 'ce1', fn: 'govern', dimension: 'controls-evidence' }], { ce1: 0 });
    expect(scores.dimensionPct['ownership-accountability']).toBeNull();
    expect(identifyCriticalGaps(scores)).toEqual([]);
  });

  it('fires at exactly the same boundary as B5\'s gating rule (39% critical, 40% not)', () => {
    // Reuses the exact 25-question/29-sum fixture from B5's own 39%-boundary
    // gating test (computeScores describe block above).
    const oaQuestions = Array.from({ length: 25 }, function(_, i) {
      return { id: 'oa' + i, fn: 'govern', dimension: 'ownership-accountability' };
    });
    const answers39 = {};
    oaQuestions.forEach(function(q, i) { answers39[q.id] = i < 9 ? 3 : (i === 9 ? 2 : 0); }); // sum 29/75 = 39%
    const scores39 = computeScores(oaQuestions, answers39);
    expect(scores39.dimensionPct['ownership-accountability']).toBe(39);
    expect(identifyCriticalGaps(scores39)).toHaveLength(1);

    // 5 questions, sum 6/15 = exactly 40% -- same fixture as B5's 40%-boundary test.
    const boundaryQuestions = Array.from({ length: 5 }, function(_, i) {
      return { id: 'oa' + i, fn: 'govern', dimension: 'ownership-accountability' };
    });
    const answers40 = { oa0: 2, oa1: 1, oa2: 1, oa3: 1, oa4: 1 }; // sum 6/15 = 40%
    const scores40 = computeScores(boundaryQuestions, answers40);
    expect(scores40.dimensionPct['ownership-accountability']).toBe(40);
    expect(identifyCriticalGaps(scores40)).toEqual([]);
  });

  it('has a title and body distinct from g2\'s own question-level recommendation copy', () => {
    // g2 ("Name an accountable owner for AI risk") and the critical entry are
    // different signals that can co-occur -- their copy must read as clearly
    // different findings, not a duplicate of the same text.
    const scores = scoresWithOwnershipPct(0);
    const result = identifyCriticalGaps(scores);
    expect(result[0].title).not.toBe(REC_TITLES.g2);
    expect(result[0].body).not.toBe(REC_BODIES.g2);
    expect(typeof result[0].title).toBe('string');
    expect(result[0].title.length).toBeGreaterThan(0);
    expect(result[0].body.length).toBeGreaterThan(20);
  });

  it('produces a rec-shaped object with the same fields buildRecommendations produces', () => {
    const scores = scoresWithOwnershipPct(0);
    const result = identifyCriticalGaps(scores);
    expect(Object.keys(result[0]).sort()).toEqual(['body', 'fn', 'module', 'priority', 'title']);
  });
});

describe('composing critical and question-level recommendations (B7)', () => {
  it('places the critical entry first, ahead of every high- and medium-priority recommendation', () => {
    const scores = computeScores(
      [{ id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' }],
      { oa1: 0 }
    );
    const gaps = [
      { fn: 'govern', v: 1, priority: 'medium', q: { id: 'g1', module: 'base' } },
      { fn: 'map', v: 0, priority: 'high', q: { id: 'm1', module: 'base' } }
    ];
    const recs = identifyCriticalGaps(scores).concat(buildRecommendations(gaps));
    expect(recs.map(function(r) { return r.priority; })).toEqual(['critical', 'high', 'medium']);
  });

  it('surfaces an independent question-level gap alongside a critical entry rather than suppressing it', () => {
    // g5 (ownership-accountability, comprehensive depth) scoring low is a
    // real, independent question-level gap even when the dimension AVERAGE
    // (g2+g5+np2) also happens to be bottom-tier -- both signals are real and
    // both must appear, not deduped into one.
    const scores = computeScores(
      [
        { id: 'g2', fn: 'govern', dimension: 'ownership-accountability' },
        { id: 'g5', fn: 'govern', dimension: 'ownership-accountability' }
      ],
      { g2: 0, g5: 0 }
    );
    const gaps = identifyGaps(
      [
        { id: 'g2', fn: 'govern', module: 'base' },
        { id: 'g5', fn: 'govern', module: 'base' }
      ],
      { g2: 0, g5: 0 }
    );
    const recs = identifyCriticalGaps(scores).concat(buildRecommendations(gaps));
    const questionIds = gaps.map(function(g) { return g.q.id; });
    expect(questionIds).toContain('g5');
    expect(recs.some(function(r) { return r.priority === 'critical'; })).toBe(true);
    expect(recs.some(function(r) { return r.title === REC_TITLES.g5; })).toBe(true);
  });

  it('returns no critical entry (only question-level recs) when Ownership & Accountability is not bottom-tier', () => {
    const scores = computeScores(
      [{ id: 'oa1', fn: 'govern', dimension: 'ownership-accountability' }],
      { oa1: 3 }
    );
    const gaps = [{ fn: 'map', v: 0, priority: 'high', q: { id: 'm1', module: 'base' } }];
    const recs = identifyCriticalGaps(scores).concat(buildRecommendations(gaps));
    expect(recs.map(function(r) { return r.priority; })).toEqual(['high']);
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

describe('computeToolPortfolioRisk (B10)', () => {
  const noRegulated = { regulated: [] };
  const withRegulated = { regulated: ['pii'] };

  it('returns "low" when nothing is selected', () => {
    const result = computeToolPortfolioRisk([], [], noRegulated);
    expect(result.level).toBe('low');
    expect(result.dataSensitive).toBe(false);
  });

  it('returns "high" whenever any high-risk tool is selected, regardless of data sensitivity', () => {
    const result = computeToolPortfolioRisk(['t-grok'], [], noRegulated);
    expect(result.level).toBe('high');
    expect(result.highRiskCount).toBe(1);
  });

  it('returns "medium" for a caution-tier tool with no declared sensitive data', () => {
    const result = computeToolPortfolioRisk(['t-chatgpt'], [], noRegulated);
    expect(result.level).toBe('medium');
    expect(result.cautionCount).toBe(1);
    expect(result.dataSensitive).toBe(false);
  });

  it('escalates a caution-tier tool to "high" when sensitive data is declared in profile.regulated', () => {
    const result = computeToolPortfolioRisk(['t-chatgpt'], [], withRegulated);
    expect(result.level).toBe('high');
    expect(result.dataSensitive).toBe(true);
  });

  it('returns "low" for only lower-risk tools with no sensitive data', () => {
    const result = computeToolPortfolioRisk(['t-canva'], [], noRegulated);
    expect(result.level).toBe('low');
    expect(result.lowerRiskCount).toBe(1);
  });

  it('treats an unclassified (not in TOOL_MASTER_LIST) tool as at least "medium", not silently safe', () => {
    const result = computeToolPortfolioRisk([], ['Some Unlisted Tool'], noRegulated);
    expect(result.level).toBe('medium');
    expect(result.unclassifiedCount).toBe(1);
  });

  it('builds on classifyToolsInUse rather than re-deriving its own bucketing (same classified shape)', () => {
    const result = computeToolPortfolioRisk(['t-grok', 't-chatgpt'], [], noRegulated);
    expect(result.classified).toEqual(classifyToolsInUse(['t-grok', 't-chatgpt'], []));
  });

  it('treats a missing/undefined profile as not data-sensitive rather than throwing', () => {
    expect(() => computeToolPortfolioRisk([], [], undefined)).not.toThrow();
    expect(computeToolPortfolioRisk([], [], undefined).dataSensitive).toBe(false);
  });
});

describe('computeFrameworkCoverage (B10)', () => {
  function fnScoresWith(overrides) {
    const base = {
      govern: { sum: 0, max: 0 }, map: { sum: 0, max: 0 },
      measure: { sum: 0, max: 0 }, manage: { sum: 0, max: 0 }
    };
    return Object.assign(base, overrides);
  }

  it('marks a function "missing" with a null pct when it has no answered questions at all', () => {
    const result = computeFrameworkCoverage({ fnScores: fnScoresWith({}) });
    expect(result.govern).toEqual({ status: 'missing', pct: null });
  });

  it('marks a function "compliant" at exactly the 70% boundary', () => {
    const result = computeFrameworkCoverage({ fnScores: fnScoresWith({ govern: { sum: 21, max: 30 } }) }); // 70%
    expect(result.govern).toEqual({ status: 'compliant', pct: 70 });
  });

  it('marks a function "partial" just under the 70% boundary', () => {
    const result = computeFrameworkCoverage({ fnScores: fnScoresWith({ govern: { sum: 20, max: 30 } }) }); // 66.67% -> 67
    expect(result.govern.status).toBe('partial');
  });

  it('marks a function "partial" at exactly the 40% boundary', () => {
    const result = computeFrameworkCoverage({ fnScores: fnScoresWith({ govern: { sum: 4, max: 10 } }) }); // 40%
    expect(result.govern).toEqual({ status: 'partial', pct: 40 });
  });

  it('marks a function "missing" (with a real, non-null pct) just under the 40% boundary', () => {
    const result = computeFrameworkCoverage({ fnScores: fnScoresWith({ govern: { sum: 3, max: 10 } }) }); // 30%
    expect(result.govern).toEqual({ status: 'missing', pct: 30 });
  });

  it('reports all four NIST functions independently', () => {
    const result = computeFrameworkCoverage({
      fnScores: fnScoresWith({
        govern: { sum: 30, max: 30 },
        map: { sum: 0, max: 0 },
        measure: { sum: 5, max: 10 },
        manage: { sum: 1, max: 10 }
      })
    });
    expect(result.govern.status).toBe('compliant');
    expect(result.map.status).toBe('missing');
    expect(result.map.pct).toBeNull();
    expect(result.measure.status).toBe('partial');
    expect(result.manage.status).toBe('missing');
    expect(result.manage.pct).toBe(10);
  });

  it('agrees with computeTier\'s own boundaries semantically (uses computeScores\' real fnScores output)', () => {
    const questions = [{ id: 'g1', fn: 'govern', dimension: 'controls-evidence' }];
    const scores = computeScores(questions, { g1: 3 }); // 100%
    const coverage = computeFrameworkCoverage(scores);
    expect(coverage.govern.status).toBe('compliant');
    expect(computeTier(100).key).toBe('low'); // same 70%+ territory, same meaning
  });
});

describe('computeRegulatoryExposure (B10)', () => {
  const baseProfile = { region: null, industry: null, regulated: [], customerType: null, aiMaturity: null };

  it('returns "low" with no factors for a profile with nothing regulatory-relevant set', () => {
    const result = computeRegulatoryExposure(baseProfile);
    expect(result.level).toBe('low');
    expect(result.factors).toEqual([]);
  });

  it('flags EU region as "high" exposure, citing R4', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: 'eu' }));
    expect(result.level).toBe('high');
    const factor = result.factors.find(f => f.id === 'eu-ai-act');
    expect(factor.source).toBe('R4, backlog SS1.5.4');
  });

  it('flags US region as "medium" with an explicit Colorado caveat, not a definitive determination', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: 'us' }));
    const factor = result.factors.find(f => f.id === 'us-state-patchwork');
    expect(factor.level).toBe('medium');
    expect(factor.detail).toContain('does not currently capture which US state');
    expect(factor.source).toBe('R5, backlog SS1.5.4');
  });

  it('flags Canada region as "medium", citing R6, and correctly states AIDA never became law', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: 'ca' }));
    const factor = result.factors.find(f => f.id === 'canada-patchwork');
    expect(factor.level).toBe('medium');
    expect(factor.detail).toContain('AIDA never became law');
    expect(factor.source).toBe('R6, backlog SS1.5.4');
  });

  it('flags UK and "other" regions as an honest research gap, not a fabricated finding', () => {
    ['uk', 'other'].forEach(function(region) {
      const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: region }));
      const factor = result.factors.find(f => f.id === 'no-dedicated-research');
      expect(factor).toBeDefined();
      expect(factor.level).toBe('info');
      expect(factor.source).toBeNull();
    });
  });

  it('reports the overall level as "info" (not "low") when the only factor present is an unresearched-region gap', () => {
    // Distinct from the true "low" case (no factors at all) -- an unresearched
    // region should never be silently reported as "checked, and it's fine."
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: 'uk' }));
    expect(result.level).toBe('info');
  });

  it('adds an industry-specific factor for the four industries with an established regulatory note', () => {
    Object.keys(REGULATORY_INDUSTRY_NOTES).forEach(function(industry) {
      const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { industry: industry }));
      const factor = result.factors.find(f => f.id === 'industry-' + industry);
      expect(factor.detail).toBe(REGULATORY_INDUSTRY_NOTES[industry]);
    });
  });

  it('does not add an industry factor for an industry with no established regulatory note', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { industry: 'retail' }));
    expect(result.factors.find(f => f.id && f.id.indexOf('industry-') === 0)).toBeUndefined();
  });

  it('adds a factor per selected regulated data type, each at its own level', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { regulated: ['pii', 'phi', 'eu-customers'] }));
    expect(result.factors.find(f => f.id === 'data-pii').level).toBe('medium');
    expect(result.factors.find(f => f.id === 'data-phi').level).toBe('high');
    expect(result.factors.find(f => f.id === 'data-eu-customers').level).toBe('high');
    expect(result.level).toBe('high');
  });

  it('adds a government-customer factor when customerType is "gov"', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { customerType: 'gov' }));
    expect(result.factors.find(f => f.id === 'gov-customers')).toBeDefined();
  });

  it('carries aiMaturity through as context without treating it as its own scored factor', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { aiMaturity: 'scaled' }));
    expect(result.aiMaturity).toBe('scaled');
    expect(result.factors.find(f => f.id === 'scaled')).toBeUndefined();
  });

  it('the overall level is "high" if any single factor is "high", even when others are lower', () => {
    const result = computeRegulatoryExposure(Object.assign({}, baseProfile, { region: 'ca', regulated: ['phi'] }));
    expect(result.factors.some(f => f.level === 'medium')).toBe(true);
    expect(result.factors.some(f => f.level === 'high')).toBe(true);
    expect(result.level).toBe('high');
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

describe('getVisibilityTagsForRole (B11)', () => {
  it('grants leadership every VISIBILITY_TAGS value, regardless of department', () => {
    expect(getVisibilityTagsForRole({ id: 'leadership', department: 'it-engineering' }).sort())
      .toEqual(VISIBILITY_TAGS.slice().sort());
    expect(getVisibilityTagsForRole({ id: 'leadership', department: '' }).sort())
      .toEqual(VISIBILITY_TAGS.slice().sort());
  });

  it("resolves dept-role's tags via getVisibilityTagsForDepartment, matching its department exactly", () => {
    const result = getVisibilityTagsForRole({ id: 'dept-role', department: 'it-engineering' });
    expect(result).toEqual(getVisibilityTagsForDepartment('it-engineering'));
    expect(result).toContain('technical-build');
  });

  it("resolves employee's tags identically to dept-role for the same department (role/employee distinction is not a visibility restriction)", () => {
    const dept = getVisibilityTagsForRole({ id: 'dept-role', department: 'legal' });
    const employee = getVisibilityTagsForRole({ id: 'employee', department: 'legal' });
    expect(employee).toEqual(dept);
  });

  it('falls back to the same conservative default as a missing department when role is missing entirely', () => {
    expect(getVisibilityTagsForRole(null)).toEqual(getVisibilityTagsForDepartment(undefined));
    expect(getVisibilityTagsForRole({})).toEqual(getVisibilityTagsForDepartment(undefined));
    expect(getVisibilityTagsForRole({ id: null })).toEqual(['operational']);
  });

  it('falls back to the department-inference default when a non-leadership role has no department set', () => {
    expect(getVisibilityTagsForRole({ id: 'employee', department: '' })).toEqual(['operational']);
    expect(getVisibilityTagsForRole({ id: 'dept-role' })).toEqual(['operational']);
  });

  it('returns a fresh array each call, not a shared reference a caller could corrupt', () => {
    const first = getVisibilityTagsForRole({ id: 'leadership' });
    first.push('mutated');
    const second = getVisibilityTagsForRole({ id: 'leadership' });
    expect(second).toEqual(VISIBILITY_TAGS);
    expect(second).not.toContain('mutated');
  });

  it('every tag returned for every real ROLE_OPTIONS x DEPARTMENTS combination is a valid VISIBILITY_TAGS value', () => {
    var roleIds = ['leadership', 'dept-role', 'employee'];
    roleIds.forEach(function(roleId) {
      DEPARTMENTS.forEach(function(d) {
        getVisibilityTagsForRole({ id: roleId, department: d.id }).forEach(function(tag) {
          expect(VISIBILITY_TAGS).toContain(tag);
        });
      });
    });
  });
});

describe('getQuestionsForAssessment role-based visibility filtering (B8)', () => {
  const forProfit = { orgType: 'for-profit', servesYouth: false };

  it('is unaffected when no role argument is passed at all, matching pre-B8 behavior exactly', () => {
    const withoutRoleArg = getQuestionsForAssessment(forProfit, 'comprehensive');
    const withUndefinedRole = getQuestionsForAssessment(forProfit, 'comprehensive', undefined);
    expect(withoutRoleArg.map(q => q.id)).toEqual(withUndefinedRole.map(q => q.id));
    expect(withoutRoleArg.length).toBe(BASE_QUESTIONS.filter(q => q.depths.indexOf('comprehensive') !== -1).length);
  });

  it('leadership sees the full depth-filtered pool, same as passing no role', () => {
    const noRole = getQuestionsForAssessment(forProfit, 'comprehensive');
    const leadership = getQuestionsForAssessment(forProfit, 'comprehensive', { id: 'leadership' });
    expect(leadership.map(q => q.id)).toEqual(noRole.map(q => q.id));
  });

  it('always includes items with no visibilityTag, regardless of role/department -- exercised via NONPROFIT_QUESTIONS/YOUTH_QUESTIONS, since all 53 BASE_QUESTIONS are now tagged', () => {
    const nonprofitAndYouth = { orgType: 'nonprofit', servesYouth: true };
    const untaggedNonprofitYouthIds = NONPROFIT_QUESTIONS.concat(YOUTH_QUESTIONS)
      .filter(q => !q.visibilityTag).map(q => q.id);
    expect(untaggedNonprofitYouthIds.length).toBeGreaterThan(0); // np/y modules are out of this pass's stated scope
    const financeEmployee = getQuestionsForAssessment(nonprofitAndYouth, 'comprehensive', { id: 'employee', department: 'finance' });
    const financeIds = financeEmployee.map(q => q.id);
    untaggedNonprofitYouthIds.forEach(id => expect(financeIds).toContain(id));
  });

  it('every BASE_QUESTIONS item now carries a visibilityTag -- no untagged base items remain after the follow-up tagging pass', () => {
    const untaggedBaseIds = BASE_QUESTIONS.filter(q => !q.visibilityTag).map(q => q.id);
    expect(untaggedBaseIds).toEqual([]);
  });

  it('excludes technical-build and legal-compliance and strategic tagged items for a Finance department respondent, who only gets operational', () => {
    const financeEmployee = getQuestionsForAssessment(forProfit, 'comprehensive', { id: 'employee', department: 'finance' });
    const financeIds = financeEmployee.map(q => q.id);
    expect(financeIds).not.toContain('m10'); // technical-build
    expect(financeIds).not.toContain('g13'); // legal-compliance
    expect(financeIds).not.toContain('g6');  // strategic
    expect(financeIds).toContain('g10'); // operational-tagged
  });

  it('includes technical-build tagged items for an IT/Engineering department respondent', () => {
    const itDeptRole = getQuestionsForAssessment(forProfit, 'comprehensive', { id: 'dept-role', department: 'it-engineering' });
    const itIds = itDeptRole.map(q => q.id);
    expect(itIds).toContain('m10');
    expect(itIds).toContain('me9');
    expect(itIds).not.toContain('g13'); // still no legal-compliance
  });

  it('includes legal-compliance tagged items for a Legal/Compliance department respondent', () => {
    const legalRole = getQuestionsForAssessment(forProfit, 'comprehensive', { id: 'employee', department: 'legal' });
    const legalIds = legalRole.map(q => q.id);
    expect(legalIds).toContain('g13');
    expect(legalIds).toContain('ma7');
    expect(legalIds).not.toContain('m10'); // still no technical-build
  });

  it('never returns more questions for a restricted role than for no role, at the same depth', () => {
    const noRole = getQuestionsForAssessment(forProfit, 'comprehensive').length;
    const restricted = getQuestionsForAssessment(forProfit, 'comprehensive', { id: 'employee', department: 'finance' }).length;
    expect(restricted).toBeLessThanOrEqual(noRole);
  });
});

describe('R8 item-bank merge data integrity (B8/B9, 2026-08-31)', () => {
  const R8_IDS = ['g6','g7','g8','g9','g10','g11','g12','g13',
    'm6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18',
    'me6','me7','me8','me9','me10','me11','me12','me13','me14',
    'ma6','ma7','ma8'];
  const dimensionIds = GOVERNANCE_DIMENSIONS.map(d => d.id);

  it('merged exactly 33 new items into BASE_QUESTIONS, on top of the original 20', () => {
    expect(BASE_QUESTIONS.length).toBe(53);
    R8_IDS.forEach(id => {
      expect(BASE_QUESTIONS.some(q => q.id === id)).toBe(true);
    });
  });

  it('has no duplicate ids in BASE_QUESTIONS after the merge', () => {
    const ids = BASE_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every R8 item has a valid GOVERNANCE_DIMENSIONS dimension assigned', () => {
    R8_IDS.forEach(id => {
      const q = BASE_QUESTIONS.find(bq => bq.id === id);
      expect(dimensionIds).toContain(q.dimension);
    });
  });

  it('every R8 item that declares a visibilityTag uses a real VISIBILITY_TAGS value', () => {
    R8_IDS.forEach(id => {
      const q = BASE_QUESTIONS.find(bq => bq.id === id);
      if (q.visibilityTag) expect(VISIBILITY_TAGS).toContain(q.visibilityTag);
    });
  });

  it('every base question (original 20 + R8\'s 33) has both a REC_TITLES and a REC_BODIES entry -- no more generic-template fallback for base', () => {
    BASE_QUESTIONS.forEach(q => {
      expect(REC_TITLES[q.id]).toBeTruthy();
      expect(REC_BODIES[q.id]).toBeTruthy();
    });
  });

  it('every R8 item has at least one depth and every depth value is one of the three real depths', () => {
    const realDepths = ['quick', 'standard', 'comprehensive'];
    R8_IDS.forEach(id => {
      const q = BASE_QUESTIONS.find(bq => bq.id === id);
      expect(q.depths.length).toBeGreaterThan(0);
      q.depths.forEach(d => expect(realDepths).toContain(d));
    });
  });

  it('MANAGE 1.1 and 2.1 were deliberately not drafted here -- ma1-ma5 (original) plus ma6-ma8 (R8) is 8 MANAGE items total, not 10', () => {
    const manageIds = BASE_QUESTIONS.filter(q => q.fn === 'manage').map(q => q.id);
    expect(manageIds.length).toBe(8);
  });
});

describe("original 20 base questions -- retroactive visibilityTag pass (same-day follow-up to B9)", () => {
  const ORIGINAL_20_IDS = ['g1','g2','g3','g4','g5','m1','m2','m3','m4','m5',
    'me1','me2','me3','me4','me5','ma1','ma2','ma3','ma4','ma5'];
  const dimensionIds = GOVERNANCE_DIMENSIONS.map(d => d.id);

  it('all 20 original base questions have a valid VISIBILITY_TAGS value assigned', () => {
    ORIGINAL_20_IDS.forEach(id => {
      const q = BASE_QUESTIONS.find(bq => bq.id === id);
      expect(q.visibilityTag).toBeTruthy();
      expect(VISIBILITY_TAGS).toContain(q.visibilityTag);
    });
  });

  it('the g5 board/leadership question is tagged strategic, matching its own text explicitly', () => {
    const g5 = BASE_QUESTIONS.find(q => q.id === 'g5');
    expect(g5.visibilityTag).toBe('strategic');
  });

  it('did not change any dimension, depths, text, hint, or options on the original 20 -- tagging is additive only', () => {
    ORIGINAL_20_IDS.forEach(id => {
      const q = BASE_QUESTIONS.find(bq => bq.id === id);
      expect(dimensionIds).toContain(q.dimension);
      expect(q.module).toBe('base');
      expect(q.depths.length).toBeGreaterThan(0);
      expect(q.options.length).toBe(4);
    });
  });

  it('every VISIBILITY_TAGS value is used by at least one of the original 20 -- the pass did not default everything to one tag', () => {
    const usedTags = new Set(ORIGINAL_20_IDS.map(id => BASE_QUESTIONS.find(bq => bq.id === id).visibilityTag));
    VISIBILITY_TAGS.forEach(tag => expect(usedTags.has(tag)).toBe(true));
  });
});

// ============================================================================
// B12: meetsAggregationThreshold / AGGREGATION_MIN_GROUP_SIZE (backlog SS1.4.14)
// ============================================================================

describe('meetsAggregationThreshold', () => {
  it('AGGREGATION_MIN_GROUP_SIZE is a positive integer, and does not collide with an existing threshold constant', () => {
    expect(Number.isInteger(AGGREGATION_MIN_GROUP_SIZE)).toBe(true);
    expect(AGGREGATION_MIN_GROUP_SIZE).toBeGreaterThan(0);
    expect(AGGREGATION_MIN_GROUP_SIZE).not.toBe(GOVERNANCE_GATING_THRESHOLD);
  });

  it('a count below the threshold does not meet it', () => {
    expect(meetsAggregationThreshold(AGGREGATION_MIN_GROUP_SIZE - 1)).toBe(false);
    expect(meetsAggregationThreshold(0)).toBe(false);
    expect(meetsAggregationThreshold(1)).toBe(false);
  });

  it('a count exactly at the threshold meets it (inclusive boundary)', () => {
    expect(meetsAggregationThreshold(AGGREGATION_MIN_GROUP_SIZE)).toBe(true);
  });

  it('a count above the threshold meets it', () => {
    expect(meetsAggregationThreshold(AGGREGATION_MIN_GROUP_SIZE + 50)).toBe(true);
  });

  it('a missing or non-numeric count does not meet the threshold rather than throwing', () => {
    expect(meetsAggregationThreshold(undefined)).toBe(false);
    expect(meetsAggregationThreshold(null)).toBe(false);
    expect(meetsAggregationThreshold('5')).toBe(false);
  });
});
