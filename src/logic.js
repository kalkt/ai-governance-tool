// ============================================================================
// PURE LOGIC: Scoring, module selection, recommendation generation
// Extracted from index.html (Phase B) for unit testing at 90%+ coverage.
// ============================================================================

import {
  FRAMEWORK,
  BASE_QUESTIONS,
  NONPROFIT_QUESTIONS,
  YOUTH_QUESTIONS,
  REC_TITLES,
  REC_BODIES,
  TOOL_MASTER_LIST,
  GOVERNANCE_DIMENSIONS,
  RISK_CRITERIA,
  RISK_TIERS,
  SMALL_ORG_SIZE_BANDS,
  OVERSIGHT_EXPECTATIONS,
  REGULATORY_INDUSTRY_NOTES,
  VISIBILITY_TAGS,
  AGGREGATION_MIN_GROUP_SIZE,
  TOOL_ADOPTION_QUESTIONS,
  METHODOLOGY_NOTES
} from './data.js';

export function getApplicableModules(profile) {
  var modules = ['base'];
  if (profile.orgType === 'nonprofit') modules.push('nonprofit');
  if (profile.servesYouth === true) modules.push('youth');
  return modules;
}

// B8 (2026-08-31): role param added, optional and last, so every existing
// call site/test that only ever passed (profile, depth) keeps working
// unchanged -- an omitted role means no visibility filtering, exactly
// today's pre-B8 behavior. When role IS supplied, filtering happens by
// each item's optional visibilityTag (data.js, R9): an item with no tag
// (NONPROFIT_QUESTIONS/YOUTH_QUESTIONS only, as of the same-day follow-up
// pass that retroactively tagged all 53 BASE_QUESTIONS -- see the comment
// above R8's 33 items in data.js) stays visible to everyone regardless of
// role, since those modules were never reviewed for a specific
// vantage-point restriction. An item WITH a tag is included only if
// getVisibilityTagsForRole(role) (below) contains that tag -- e.g. a
// 'technical-build'-tagged item only reaches a leadership respondent or an
// IT/Engineering department respondent, not a
// Finance department respondent. Department -> tag inference, and
// leadership's unconditional full-pool access, are B4/B11's job
// (getVisibilityTagsForDepartment/getVisibilityTagsForRole below) -- this
// function only applies the resulting tag set as a filter.
export function getQuestionsForAssessment(profile, depth, role) {
  var modules = getApplicableModules(profile);
  var pool = [];
  // base is always present per getApplicableModules, this branch is defensive and intentionally untested
  if (modules.indexOf('base') !== -1) pool = pool.concat(BASE_QUESTIONS);
  if (modules.indexOf('nonprofit') !== -1) pool = pool.concat(NONPROFIT_QUESTIONS);
  if (modules.indexOf('youth') !== -1) pool = pool.concat(YOUTH_QUESTIONS);
  var byDepth = pool.filter(function(q) { return q.depths.indexOf(depth) !== -1; });
  if (!role) return byDepth;
  var allowedTags = getVisibilityTagsForRole(role);
  return byDepth.filter(function(q) {
    return !q.visibilityTag || allowedTags.indexOf(q.visibilityTag) !== -1;
  });
}

// Bottom-tier threshold for the Ownership & Accountability gating rule below.
// Intentionally the same value as computeTier()'s own >=40 "medium" boundary
// (this file) for consistency, per backlog SS1.4.5 -- kept as a separate,
// independently-exported constant here rather than refactoring computeTier
// to share one, since this item's scope explicitly leaves computeTier's own
// code untouched (its existing boundary tests -- 39/40/69/70 -- still pass
// unchanged, verifying that assumption rather than taking it on faith).
export var GOVERNANCE_GATING_THRESHOLD = 40;

export function computeScores(questions, answers) {
  var fnScores = {
    govern: { sum: 0, max: 0 },
    map: { sum: 0, max: 0 },
    measure: { sum: 0, max: 0 },
    manage: { sum: 0, max: 0 }
  };
  var dimensionScores = {};
  GOVERNANCE_DIMENSIONS.forEach(function(d) {
    dimensionScores[d.id] = { sum: 0, max: 0 };
  });

  questions.forEach(function(q) {
    if (answers[q.id] !== undefined) {
      fnScores[q.fn].sum += answers[q.id];
      fnScores[q.fn].max += 3;
      if (q.dimension && dimensionScores[q.dimension]) {
        dimensionScores[q.dimension].sum += answers[q.id];
        dimensionScores[q.dimension].max += 3;
      }
    }
  });

  var totalSum = 0, totalMax = 0;
  Object.keys(fnScores).forEach(function(k) {
    totalSum += fnScores[k].sum;
    totalMax += fnScores[k].max;
  });

  // Governance Maturity score (B5, backlog SS1.4.5): a weighted average of the
  // five sub-dimensions above, replacing the old flat totalSum/totalMax
  // percentage as `overall` -- totalSum/totalMax themselves are unchanged and
  // still returned below (still a real "points earned out of points possible"
  // figure), just no longer what `overall` reports. Only dimensions with at
  // least one answered question count toward the average, renormalized by
  // their combined weight -- mirrors how an unanswered question is already
  // excluded from fnScores' own sum/max above rather than scored as zero.
  var weightedSum = 0, weightUsed = 0;
  var dimensionPct = {};
  GOVERNANCE_DIMENSIONS.forEach(function(d) {
    var ds = dimensionScores[d.id];
    if (ds.max > 0) {
      dimensionPct[d.id] = Math.round((ds.sum / ds.max) * 100);
      weightedSum += (ds.sum / ds.max) * 100 * d.weight;
      weightUsed += d.weight;
    } else {
      dimensionPct[d.id] = null;
    }
  });
  var overall = weightUsed === 0 ? 0 : Math.round(weightedSum / weightUsed);

  // Gating rule (R2, backlog SS1.4.5): a bottom-tier Ownership & Accountability
  // score caps the overall score at the top of that same bottom tier
  // regardless of what the other four dimensions computed to -- CSA
  // whitepaper evidence (73% of orgs report internal ownership conflict; 96%
  // of CISOs get AI governance responsibility without authority) shows
  // ownership functions as a structural prerequisite the other four
  // dimensions depend on, not just one-fifth of a flat weighted average. Only
  // applies when Ownership & Accountability itself has at least one answered
  // question -- with none, there is no evidence to gate on.
  if (dimensionPct['ownership-accountability'] !== null && dimensionPct['ownership-accountability'] < GOVERNANCE_GATING_THRESHOLD) {
    overall = Math.min(overall, GOVERNANCE_GATING_THRESHOLD - 1);
  }

  return {
    fnScores: fnScores,
    overall: overall,
    totalSum: totalSum,
    totalMax: totalMax,
    dimensionScores: dimensionScores,
    dimensionPct: dimensionPct
  };
}

export function computeTier(overall) {
  if (overall >= 70) return {
    key: 'low', cssClass: 'tier-low', label: 'Lower risk',
    desc: 'Your governance is meaningfully ahead of most SMBs. Focus on maintaining rigor and closing the last gaps before a formal audit or vendor review.'
  };
  if (overall >= 40) return {
    key: 'medium', cssClass: 'tier-med', label: 'Moderate risk',
    desc: 'Reasonable foundations, but real gaps exist. You are exposed if a high-impact incident happens or a customer asks for evidence of governance.'
  };
  return {
    key: 'high', cssClass: 'tier-high', label: 'Higher risk',
    desc: 'Governance is largely informal or absent. Prioritize the basics before adopting more AI tools or expanding sensitive use cases.'
  };
}

// ============================================================================
// B6: per-USE-CASE risk tiering (backlog SS1.4.6). Distinct from computeTier()
// above -- that buckets the ORGANIZATION's overall readiness score into 3
// bands; this classifies one specific AI use case/tool into 4 tiers. Not
// wired into the wizard flow yet (no UI asks "describe a specific use case"
// today) -- deliberately scoped as a pure, well-tested function here, per
// this item's own instruction; wiring it into the assessment flow is B13's
// job (New AI Tool Adoption assessment type), which depends on this module
// existing first.
//
// Design (decide-and-document -- SS1.4.6 names the four tiers, the seven
// criteria, and the Annex III trigger, but not an exact combination formula):
// Annex III domain membership GATES which pair of tiers a use case is even
// eligible for -- touching any Annex III domain routes it into Tier 1/2
// territory; not touching one caps it at Tier 3/4, regardless of how severe
// the seven criteria look. This directly mirrors SS1.4.6's own framing
// ("does this tool's use touch any of these areas routes straight into
// Tier 1/2 scrutiny") rather than averaging Annex III membership in as an
// eighth criterion. WITHIN whichever pair the gate selects, the seven
// criteria's unweighted average (0-3 scale, risk-forward polarity -- see
// RISK_CRITERIA's own comment in data.js) splits it at the scale's midpoint
// (1.5): >=1.5 takes the more severe tier of the pair (Tier 1 or Tier 3),
// below it takes the less severe one (Tier 2 or Tier 4). Equal weighting
// across the seven criteria is a deliberate default in the absence of any
// specified differential weights (unlike GOVERNANCE_DIMENSIONS' explicit
// 20/20/20/25/15) -- flagged here as a reasonable starting point, not
// asserted as the only valid scheme.
export function classifyUseCaseRisk(useCaseAnswers, companySize) {
  var domainIds = (useCaseAnswers && useCaseAnswers.annexIiiDomainIds) || [];
  var inAnnexIIIDomain = domainIds.length > 0;

  var sum = 0, count = 0;
  RISK_CRITERIA.forEach(function(c) {
    var v = useCaseAnswers ? useCaseAnswers[c] : undefined;
    if (typeof v === 'number') {
      sum += v;
      count++;
    }
  });
  // No criteria answered at all defaults to the least-severe end (0) rather
  // than asserting risk from an absence of evidence -- mirrors B5's gating
  // rule skipping when there's no Ownership & Accountability data to act on.
  var composite = count === 0 ? 0 : sum / count;

  var tierKey;
  if (inAnnexIIIDomain) {
    tierKey = composite >= 1.5 ? 'tier1' : 'tier2';
  } else {
    tierKey = composite >= 1.5 ? 'tier3' : 'tier4';
  }

  var tier = RISK_TIERS.find(function(t) { return t.key === tierKey; });

  return {
    tier: tier,
    compositeScore: Math.round(composite * 100) / 100,
    annexIiiDomainIds: domainIds,
    oversight: getOversightExpectation(tierKey, companySize)
  };
}

// (risk tier x company size band) oversight/validation lookup, per SS1.4.6's
// own instruction ("a lookup... not a single universal column"). Tier 2 and
// Tier 3 share one merged entry for orgs under ~200 employees (SMALL_ORG_
// SIZE_BANDS, data.js) -- everywhere else, tier and size band are looked up
// directly. Returns null for an unrecognized tier/size combination rather
// than guessing.
export function getOversightExpectation(tierKey, companySize) {
  if ((tierKey === 'tier2' || tierKey === 'tier3') && SMALL_ORG_SIZE_BANDS.indexOf(companySize) !== -1) {
    return OVERSIGHT_EXPECTATIONS['tier2-3-small'];
  }
  var bySize = OVERSIGHT_EXPECTATIONS[tierKey];
  return (bySize && bySize[companySize]) || null;
}

// ============================================================================
// B10: Regulatory Exposure, Tool Portfolio Risk, Framework Coverage -- three
// dimensions reported SEPARATELY per backlog SS1.4.5, never averaged into
// computeScores()'s Governance Maturity `overall` (B5, untouched by this
// item). No dedicated report section exists for these yet; wiring choice is
// documented where each is called from src/ui.js.
// ============================================================================

// Regulatory Exposure: composite of jurisdiction (region), industry, data
// types (regulated[]), and customer type from state.profile -- all already
// captured today, no new profile fields needed. aiMaturity is carried through
// as context (it changes how much real-world exposure a given regulatory
// finding represents -- "scaled" production use is more exposed than
// "exploring" under the identical legal requirement) rather than its own
// scored factor, since it doesn't change WHICH regulations apply.
//
// SOURCING NOTE (decide-and-document, but flagged plainly): this session did
// not have access to the primary Cowork Project doc
// `claude/research-r4-r5-r6-regulatory-status.md` referenced for this item --
// no tool in this Claude Code session can read that doc; only this repo's own
// files. The EU/Colorado/Canada citations below are instead drawn verbatim
// from this repo's own canonical backlog file, SS1.5.4 (`ai-governance-tool-
// backlog.md`), which already records R4/R5/R6's dated findings and is
// itself the project's designated single source of truth (SS1.7). Nothing
// below is invented beyond what SS1.5.4 already states; if the primary
// Cowork doc has finer-grained detail (e.g. specific article citations),
// this should be reconciled against it directly, which this session could
// not do.
//
// A real, undocumented-until-now scoping gap this citation work surfaced:
// state.profile.region's 'us' value has no state-level breakdown, so
// Colorado SB 26-189 exposure can only ever be shown as a conditional
// caveat ("if you operate in Colorado...") for any 'us' respondent, never a
// precise yes/no determination -- flagged here and in the backlog rather
// than silently asserting exposure the profile schema can't actually confirm.
// Similarly, 'uk' and 'other' regions have no dedicated regulatory research
// in this project yet (no R-numbered finding covers them) -- rather than
// inventing one, an honest 'info'-level gap factor is returned for those.
export function computeRegulatoryExposure(profile) {
  var factors = [];

  if (profile.region === 'eu') {
    factors.push({
      id: 'eu-ai-act', level: 'high',
      label: 'EU AI Act (via the Digital Omnibus amendment)',
      detail: 'Formally adopted (Parliament 16 June 2026, Council 29 June 2026). High-risk-system obligations are deferred -- standalone high-risk systems to 2 Dec 2027, high-risk systems embedded in other products to 2 Aug 2028 -- but Article 50 transparency obligations still apply generally from 2 Aug 2026, with a grace period only to 2 Dec 2026 for systems already on the market before then.',
      source: 'R4, backlog SS1.5.4'
    });
  } else if (profile.region === 'us') {
    factors.push({
      id: 'us-state-patchwork', level: 'medium',
      label: 'US state-level AI regulation (jurisdiction not precise below country level)',
      detail: 'This tool does not currently capture which US state you operate in. If that state is Colorado: SB 26-189 (signed 14 May 2026, repeals SB 24-205) takes effect 1 Jan 2027 "unless delayed by" pending litigation -- a live contingency, not a settled date -- and is narrower than originally proposed (an ADMT/"consequential decisions" framing, AG-enforced only, no private right of action, 60-day cure period). Other states may have their own requirements not tracked by this tool.',
      source: 'R5, backlog SS1.5.4'
    });
  } else if (profile.region === 'ca') {
    factors.push({
      id: 'canada-patchwork', level: 'medium',
      label: 'Canada: no federal AI-specific statute; a real patchwork instead',
      detail: 'AIDA never became law -- it died with Bill C-27 at prorogation (6 Jan 2025); no Canada AI Act currently exists. The actual current requirements are PIPEDA, Quebec\'s Law 25, the Treasury Board\'s automated-decision directive (for federal government use), and a voluntary code -- not a single comprehensive AI statute.',
      source: 'R6, backlog SS1.5.4'
    });
  } else if (profile.region === 'uk' || profile.region === 'other') {
    factors.push({
      id: 'no-dedicated-research', level: 'info',
      label: 'No dedicated regulatory research completed for this region yet',
      detail: 'This tool has real, dated regulatory findings for the EU, US (partial -- country-level only), and Canada (R4/R5/R6). No equivalent research exists yet for this region -- this is an honest gap, not a claim that no regulation applies.',
      source: null
    });
  }

  if (profile.industry && REGULATORY_INDUSTRY_NOTES[profile.industry]) {
    factors.push({
      id: 'industry-' + profile.industry, level: 'medium',
      label: 'Industry-specific regulation',
      detail: REGULATORY_INDUSTRY_NOTES[profile.industry],
      source: null
    });
  }

  var regulatedLevels = { pii: 'medium', phi: 'high', financial: 'medium', 'eu-customers': 'high', 'children-data': 'high' };
  var regulatedLabels = {
    pii: 'Handles personally identifiable information',
    phi: 'Handles health data (PHI) -- HIPAA-relevant',
    financial: 'Handles financial data',
    'eu-customers': 'Has EU customers -- GDPR applies',
    'children-data': 'Handles data about children -- COPPA-relevant for under-13 data'
  };
  (profile.regulated || []).forEach(function(r) {
    if (regulatedLevels[r]) {
      factors.push({ id: 'data-' + r, level: regulatedLevels[r], label: regulatedLabels[r], detail: regulatedLabels[r], source: null });
    }
  });

  if (profile.customerType === 'gov') {
    factors.push({
      id: 'gov-customers', level: 'medium',
      label: 'Government customers -- FedRAMP may be required',
      detail: 'AI tools sold to or used by US government agencies typically require FedRAMP authorization.',
      source: null
    });
  }

  // 'low' means "checked, nothing regulatory-relevant declared" -- distinct
  // from 'info', which means "we don't actually know" (the only factor
  // present is an honest research gap, e.g. an unresearched region).
  // Asserting 'low' in that case would misrepresent an unresearched gap as a
  // checked-and-fine finding.
  var level = 'low';
  if (factors.some(function(f) { return f.level === 'high'; })) level = 'high';
  else if (factors.some(function(f) { return f.level === 'medium'; })) level = 'medium';
  else if (factors.length > 0 && factors.every(function(f) { return f.level === 'info'; })) level = 'info';

  return { level: level, factors: factors, aiMaturity: profile.aiMaturity || null };
}

// Tool Portfolio Risk: derived from the declared tool inventory, built ON TOP
// of classifyToolsInUse() (does not duplicate its bucketing logic), weighted
// by the org's data sensitivity -- state.profile.regulated is the concrete
// signal (SS1.4.5): a non-empty array means higher-sensitivity data is in
// play. Escalation rule (decide-and-document, no formula specified in the
// backlog): any high-risk tool always means 'high' exposure outright: a
// caution-tier tool combined with sensitive data in play also escalates to
// 'high' (the caution tool's risk is now touching regulated data, not just a
// generic caution); a caution-tier tool with no declared sensitive data stays
// 'medium'; unclassified (not in TOOL_MASTER_LIST) tools are treated as an
// unknown risk, not a safe one, and register at least 'medium' rather than
// being silently ignored.
export function computeToolPortfolioRisk(selectedToolIds, otherTools, profile) {
  var classified = classifyToolsInUse(selectedToolIds, otherTools);
  var highRiskCount = classified.flagged['high-risk'].length;
  var cautionCount = classified.flagged['caution'].length;
  var lowerRiskCount = classified.flagged['lower-risk'].length;
  var unclassifiedCount = classified.otherTools.length;
  var dataSensitive = !!(profile && profile.regulated && profile.regulated.length > 0);

  var level;
  if (highRiskCount > 0) level = 'high';
  else if (cautionCount > 0) level = dataSensitive ? 'high' : 'medium';
  else if (unclassifiedCount > 0) level = 'medium';
  else level = 'low';

  return {
    level: level,
    highRiskCount: highRiskCount,
    cautionCount: cautionCount,
    lowerRiskCount: lowerRiskCount,
    unclassifiedCount: unclassifiedCount,
    dataSensitive: dataSensitive,
    classified: classified
  };
}

// Framework Coverage: percentage alignment against NIST AI RMF, reported
// compliant/partial/missing PER NIST FUNCTION (govern/map/measure/manage).
//
// SCOPING CONSTRAINT, stated plainly rather than glossed over: R1's full
// 72-subcategory NIST breakdown exists only in the research foundation
// document -- it was never wired into this codebase as per-question metadata
// (FRAMEWORK in data.js only has the 4 top-level functions, name+desc each).
// Building true subcategory-level Framework Coverage would require adding
// that 72-item map as real per-question metadata first -- substantial new
// scope this item does not authorize. This function is honestly built at
// FUNCTION-level granularity instead, using computeScores()'s existing
// fnScores as its raw input. If closing this gap for real is worth its own
// Build item, that is a scope-creation call for Kartik, not decided here --
// flagged in the backlog, not built.
//
// Thresholds (70% compliant / 40% partial / below missing) intentionally
// reuse computeTier()'s own 70/40 boundaries for the same semantic meaning
// ("compliant" ~ what would be "Lower risk" territory, etc.) -- kept as
// separate local literals here rather than importing/refactoring computeTier,
// same reasoning as GOVERNANCE_GATING_THRESHOLD in B5: computeTier's own code
// is untouched, per the ask-first boundary on that function.
export function computeFrameworkCoverage(scores) {
  var FRAMEWORK_COVERAGE_COMPLIANT_THRESHOLD = 70;
  var FRAMEWORK_COVERAGE_PARTIAL_THRESHOLD = 40;
  var coverage = {};
  Object.keys(FRAMEWORK.functions).forEach(function(fn) {
    var s = scores.fnScores[fn];
    if (s.max === 0) {
      coverage[fn] = { status: 'missing', pct: null };
      return;
    }
    var pct = Math.round((s.sum / s.max) * 100);
    var status = pct >= FRAMEWORK_COVERAGE_COMPLIANT_THRESHOLD ? 'compliant' :
      (pct >= FRAMEWORK_COVERAGE_PARTIAL_THRESHOLD ? 'partial' : 'missing');
    coverage[fn] = { status: status, pct: pct };
  });
  return coverage;
}

// Compares self-reported confidence (Likert 1-5, independent input) against the
// evidence-anchored score per NIST function. Never blended into computeScores' output --
// this is a separate lens, not a replacement for evidence-based scoring.
// GAP_THRESHOLD: percentage points apart before we call it a real gap rather than noise.
export var GAP_THRESHOLD = 20;

export function computeConfidenceGap(scores, confidenceAnswers) {
  var result = {};
  Object.keys(FRAMEWORK.functions).forEach(function(fn) {
    var s = scores.fnScores[fn];
    // Defensive: base questions always cover all four functions at every depth,
    // so max is never 0 in practice. Mirrors the getQuestionsForAssessment guard above.
    var evidencePct = s.max === 0 ? null : Math.round((s.sum / s.max) * 100);
    var v = confidenceAnswers[fn];
    var confidencePct = v === undefined ? null : Math.round(((v - 1) / 4) * 100);
    var gap = null;
    var status = 'unknown';
    if (evidencePct !== null && confidencePct !== null) {
      gap = confidencePct - evidencePct;
      if (gap >= GAP_THRESHOLD) status = 'overconfident';
      else if (gap <= -GAP_THRESHOLD) status = 'underconfident';
      else status = 'aligned';
    }
    result[fn] = { evidencePct: evidencePct, confidencePct: confidencePct, gap: gap, status: status };
  });
  return result;
}

export function identifyGaps(questions, answers) {
  var gaps = [];
  questions.forEach(function(q) {
    var v = answers[q.id];
    if (v !== undefined && v <= 1) {
      gaps.push({ fn: q.fn, module: q.module, q: q, v: v, priority: v === 0 ? 'high' : 'medium' });
    }
  });
  return gaps;
}

// Critical-severity, DIMENSION-level finding (B7, backlog SS1.4.5 / B5's own
// "Where B7 hooks in" note). Reuses B5's exact gating condition --
// GOVERNANCE_GATING_THRESHOLD and dimensionPct['ownership-accountability'] --
// rather than defining a second threshold, per R2's finding that a
// bottom-tier Ownership & Accountability score independently qualifies as a
// critical gap regardless of the other four dimensions.
//
// Takes computeScores()'s return value, not raw answers -- this operates at
// the dimension level. identifyGaps() above stays question-level and is
// unchanged. The two are genuinely different signals that can and normally
// do fire independently, not duplicates to be deduped: dimensionPct['ownership
// -accountability'] is an AVERAGE across every answered ownership-
// accountability question (g2, g5, np2 depending on depth/module), not the
// same thing as "g2 specifically scored low." A comprehensive-depth org could
// have g2 fine but g5 bad, dragging the dimension below threshold even though
// g2 itself never appears in identifyGaps' output -- both findings are real
// and both should surface.
//
// Returns a rec-shaped object directly (priority/fn/module/title/body, same
// shape buildRecommendations() produces), not a gap-shaped one -- there is no
// single question id to key a title/body lookup off of (REC_TITLES/
// REC_BODIES), since this describes a structural/dimension-level finding, not
// one missed question. Title/body below are newly authored copy for this
// item, not a fact being verified -- flagged as such in the backlog.
export function identifyCriticalGaps(scores) {
  var oaPct = scores.dimensionPct['ownership-accountability'];
  if (oaPct === null || oaPct >= GOVERNANCE_GATING_THRESHOLD) return [];
  return [{
    priority: 'critical',
    fn: 'govern',
    module: 'base',
    title: 'Establish real ownership for AI governance, organization-wide',
    body: 'Your Ownership & Accountability responses average in the bottom tier -- not one missed question, but a pattern across everything this tool asked about who owns AI governance. This is structural, not incidental: a CSA whitepaper found 73% of organizations report internal conflict over AI governance ownership, and 96% of CISOs handed the responsibility get it without real authority to act. Every other recommendation in this report assumes someone is actually accountable for acting on it -- until a specific, named owner exists with documented authority, closing individual gaps elsewhere will not hold.'
  }];
}

export function buildRecommendations(gaps) {
  var seen = {};
  var recs = [];
  ['high','medium'].forEach(function(pri) {
    gaps.filter(function(g) { return g.priority === pri; }).forEach(function(g) {
      var key = g.q.id;
      if (seen[key]) return;
      seen[key] = true;
      var body = REC_BODIES[g.q.id] ||
        ((g.v === 0 ? 'No baseline in place today. ' : 'A partial baseline exists. ') +
         'This gap sits in the ' + FRAMEWORK.functions[g.fn].name + ' function of the NIST AI RMF. Closing it is one of the highest-value moves you can make with limited time and budget, and it produces evidence you can point to if a customer, regulator, or insurer asks.');
      recs.push({
        priority: pri, fn: g.fn, module: g.q.module,
        title: REC_TITLES[g.q.id] || 'Address this gap',
        body: body,
        // questionId/dimension (B16): the originating question and its
        // GOVERNANCE_DIMENSIONS bucket, carried forward purely so a later
        // consumer (applyDmaicFraming) can trace this recommendation back to
        // real evidence -- additive fields only, no existing caller reads
        // fewer fields than before, and no existing field's meaning changed.
        questionId: g.q.id,
        dimension: g.q.dimension || null
      });
    });
  });
  return recs;
}

export function classifyToolsInUse(selectedToolIds, otherTools) {
  var flagged = { 'high-risk': [], 'caution': [], 'lower-risk': [] };
  selectedToolIds.forEach(function(id) {
    var tool = TOOL_MASTER_LIST.find(function(t) { return t.id === id; });
    if (tool) flagged[tool.classification].push(tool);
  });
  return { flagged: flagged, otherTools: otherTools };
}

export function filterToolsForProfile(profile) {
  return TOOL_MASTER_LIST.filter(function(tool) {
    return tool.industries.indexOf('all') !== -1 ||
           tool.industries.indexOf(profile.industry) !== -1;
  });
}

export function hasIndustryOverlay(profile) {
  // v2: only nonprofit-youth-serving is fully validated as an overlay.
  // Nonprofit and youth-serving are independent modules that always apply based on profile flags.
  // No industry-specific overlays in v2 for other industries.
  return false;
}

// ============================================================================
// ASSESSMENT SCOPE (v2 SS12.2): whole org / department / specific AI initiative.
// Question text itself is not rewritten per scope (see the comment on SCOPE_OPTIONS
// in data.js for why); these functions carry the two things that DO change per scope:
// what the confidence questions call the respondent's subject, and how a
// recommendation and the report's declared scope are framed.
// ============================================================================

export function scopeSubject(scopeId) {
  if (scopeId === 'department') return 'your department';
  if (scopeId === 'initiative') return 'this initiative';
  return 'your organization';
}

export function describeScope(scope) {
  if (!scope || !scope.id || scope.id === 'org') return 'Whole organization';
  var name = scope.name && scope.name.trim() ? scope.name.trim() : null;
  if (scope.id === 'department') return name ? name + ' department' : 'A specific department (unnamed)';
  if (scope.id === 'initiative') return name ? name + ' (AI initiative)' : 'A specific AI initiative (unnamed)';
  return 'Whole organization';
}

// Appends scope-specific framing to each recommendation's body without mutating the
// input array or its objects. Org scope (or no scope) is a pass-through: recs is
// returned unchanged, matching buildRecommendations' existing org-wide framing.
export function applyScopeFraming(recs, scope) {
  if (!scope || !scope.id || scope.id === 'org') return recs;
  var note;
  if (scope.id === 'department') {
    var deptName = scope.name && scope.name.trim() ? scope.name.trim() : 'this department';
    note = 'Scoped to ' + deptName + '. Organization-wide AI governance may already exist above this level \u2014 confirm with whoever owns policy for the full organization before treating this as a company-wide gap.';
  } else if (scope.id === 'initiative') {
    var initName = scope.name && scope.name.trim() ? scope.name.trim() : 'this AI initiative';
    note = 'Scoped to ' + initName + '. Treat as part of a pre-deployment review: resolve before this system moves further into production, not as a general organizational policy gap.';
  } else {
    return recs;
  }
  // Spreads the original object (B16 fix) rather than reconstructing a fixed
  // field list -- the earlier hand-picked {priority,fn,module,title,body}
  // shape silently dropped buildRecommendations' later-added questionId/
  // dimension fields, which applyDmaicFraming needs downstream. Spreading
  // means any future field survives this pass-through too, not just today's.
  return recs.map(function(r) {
    return Object.assign({}, r, { body: r.body + ' ' + note });
  });
}

// ============================================================================
// RESPONDENT ROLE (B3): who is answering, reconciled against assessment scope above.
// Per backlog SS1.4.1, role and scope are related but distinct axes -- this section
// does not touch question selection/routing (getApplicableModules,
// getQuestionsForAssessment stay role-blind); it only changes framing/caveat copy.
// Role-based item routing via a visibilityTag is B8/B11's job once B4's data model
// (entity/department/respondent/assessment-run schema) exists -- deliberately not
// built here.
// ============================================================================

export function describeRole(role) {
  if (!role || !role.id) return null;
  if (role.id === 'leadership') return 'Leadership / executive';
  if (role.id === 'dept-role') return 'Department / function';
  if (role.id === 'employee') {
    var dept = role.department && role.department.trim() ? role.department.trim() : null;
    return dept ? 'Individual employee (' + dept + ')' : 'Individual employee';
  }
  return null;
}

// Flags when a respondent's likely visibility doesn't match the scope they're
// assessing -- e.g. an individual employee or a single department answering for the
// whole organization may not actually see governance that exists above their own
// vantage point. Returns null when no caveat applies: leadership is assumed org-wide
// visible regardless of scope, and a narrower role assessing its own narrower scope
// (a department respondent scoped to their own department) has no visibility mismatch
// to flag.
export function roleVisibilityCaveat(role, scope) {
  if (!role || !role.id || role.id === 'leadership') return null;
  var scopeId = scope && scope.id ? scope.id : 'org';
  if (scopeId !== 'org') return null;
  if (role.id === 'employee') {
    return 'You are answering as an individual employee about the whole organization. Answer only what you have direct evidence of — if you are not sure whether a policy or control exists above your own vantage point, say so rather than guessing.';
  }
  if (role.id === 'dept-role') {
    return 'You are answering from within a single department/function about the whole organization. Flag anywhere you cannot confirm what exists at the organization level.';
  }
  return null;
}

// Appends a role-visibility caveat to each recommendation's body, mirroring
// applyScopeFraming's immutability (returns a new array/objects, never mutates input).
// Pass-through (recs returned unchanged) when roleVisibilityCaveat finds no mismatch.
export function applyRoleFraming(recs, role, scope) {
  var caveat = roleVisibilityCaveat(role, scope);
  if (!caveat) return recs;
  // Spread, not a fixed field list -- see applyScopeFraming's own B16 note above.
  return recs.map(function(r) {
    return Object.assign({}, r, { body: r.body + ' ' + caveat });
  });
}

// ============================================================================
// DEPARTMENT -> VISIBILITY-TAG INFERENCE (B4, backlog SS1.4.12/SS1.4.13):
// department -- not role alone -- determines which VISIBILITY_TAGS (data.js) a
// respondent can answer with real evidence. An engineering department can
// answer technical-build questions regardless of whether the respondent is
// leadership, a department member, or an individual employee; role instead
// determines how many tags/how much of the item pool they see overall.
//
// Deliberately NOT wired into getQuestionsForAssessment/getApplicableModules
// here -- that item-bank routing is B8/B11's job once this data model is
// reviewed. This only exposes the department -> tag mapping itself, per B4's
// "design the data model" scope.
//
// Keyed by DEPARTMENTS' ids directly (data.js) rather than importing that
// array, matching how scopeSubject/describeScope above key off SCOPE_OPTIONS'
// id strings without importing SCOPE_OPTIONS itself.
// ============================================================================

var DEPARTMENT_VISIBILITY_MAP = {
  'executive': ['strategic', 'operational'],
  'it-engineering': ['technical-build', 'operational'],
  'legal': ['legal-compliance', 'operational'],
  'hr-people': ['operational'],
  'finance': ['operational'],
  'marketing-comms': ['operational'],
  'sales-bizdev': ['operational'],
  'operations': ['operational'],
  'customer-support': ['operational'],
  'other': ['operational']
};

// Every recognized department confers at least 'operational' visibility --
// day-to-day process questions about one's own function, per that tag's
// definition in SS1.4.12. Only 'executive' additionally confers 'strategic'
// (org-wide policy/budget vantage), only 'it-engineering' additionally
// confers 'technical-build', and only 'legal' additionally confers
// 'legal-compliance' -- one specialized tag per department that obviously
// maps to it, matching each tag's own definition rather than assuming broader
// access. A missing or unrecognized department id falls back to
// ['operational'] too: the safest non-empty assumption when there is nothing
// to anchor a more specific claim to (e.g. an employee respondent who left
// the optional department field blank).
export function getVisibilityTagsForDepartment(departmentId) {
  // .slice() so a caller mutating the returned array can't corrupt the
  // shared internal map for every future call.
  return (DEPARTMENT_VISIBILITY_MAP[departmentId] || ['operational']).slice();
}

// ============================================================================
// B11: role -> visibility-tag resolution (backlog SS1.4.1/SS1.4.12). Given a
// respondent's role (state.role shape from B3: {id, department}), returns
// which VISIBILITY_TAGS apply to them -- the piece B8's future item-bank
// filtering will need, built on top of B4's department -> tag inference
// above. Does NOT filter getQuestionsForAssessment()'s output itself -- that
// remains explicitly B8's job, gated on Kartik's review of R8's drafted
// content, same as always. This only resolves the tag set a role+department
// combination is entitled to.
//
// Design (decide-and-document -- SS1.4.12 states department determines WHICH
// tags, role determines HOW MANY/how much of the pool, but not an exact
// formula for combining them): leadership gets every VISIBILITY_TAGS value
// unconditionally, regardless of department -- per SS1.4.1, leadership has
// "org-wide visibility, strategic/accountability framing" by definition, so
// artificially restricting a CEO's visibility to just their own department's
// inferred tags would contradict that. dept-role and employee are treated
// identically here -- both get exactly getVisibilityTagsForDepartment(role.
// department) -- because the textual basis for narrowing visibility is
// department, not the role/employee distinction itself; that distinction
// matters for aggregation/comparison purposes (B20/B21's future job:
// individual voice vs. collective departmental voice), not for which tags a
// respondent can answer with real evidence. A missing/unset role falls back
// to the same conservative default as a missing department (['operational']),
// consistent with getVisibilityTagsForDepartment's own fallback above.
export function getVisibilityTagsForRole(role) {
  if (!role || !role.id) return getVisibilityTagsForDepartment(undefined);
  if (role.id === 'leadership') return VISIBILITY_TAGS.slice();
  return getVisibilityTagsForDepartment(role.department);
}

// ============================================================================
// AGGREGATION THRESHOLD (B12, backlog SS1.4.14): whether a group of
// respondents is large enough to show a role/department-level breakdown in a
// future comparison report without risking re-identifying an individual --
// enforces the "aggregate only, always" decision at the point B20 will
// actually compute a breakdown, not just in how B21 renders it. No call site
// yet -- B20's job once the comparison feature is built. A non-number input
// (missing/undefined count) is treated as not meeting the threshold rather
// than throwing, consistent with this file's existing null-safety style.
// ============================================================================
export function meetsAggregationThreshold(count) {
  return typeof count === 'number' && count >= AGGREGATION_MIN_GROUP_SIZE;
}

// ============================================================================
// B13: New AI Tool Adoption assessment (backlog SS1.4.7) -- assembles this
// assessment's own answers (TOOL_ADOPTION_QUESTIONS, data.js) into
// classifyUseCaseRisk()'s (B6) input shape and layers the two NIST MANAGE
// decision-point questions into a go/no-go readiness signal alongside the
// resulting tier. This is a genuinely separate assessment pipeline from
// Governance Readiness (computeScores/getQuestionsForAssessment) -- it is
// never wired through those functions, per SS1.4.7's "two distinct
// assessment types" framing.
// ============================================================================

// toolAdoptionAnswers is keyed by TOOL_ADOPTION_QUESTIONS ids -- the seven
// risk-criteria ids match RISK_CRITERIA exactly (data.js), so no mapping step
// is needed before handing it to classifyUseCaseRisk; the two ma-adopt-*
// answers are simply additional keys classifyUseCaseRisk ignores (it only
// reads RISK_CRITERIA's own keys plus annexIiiDomainIds).
export function evaluateToolAdoption(toolAdoptionAnswers, annexIiiDomainIds, companySize) {
  var useCaseAnswers = Object.assign({}, toolAdoptionAnswers, { annexIiiDomainIds: annexIiiDomainIds || [] });
  var classification = classifyUseCaseRisk(useCaseAnswers, companySize);

  var decisionMade = typeof toolAdoptionAnswers['ma-adopt-1'] === 'number' ? toolAdoptionAnswers['ma-adopt-1'] : null;
  var alternativesConsidered = typeof toolAdoptionAnswers['ma-adopt-2'] === 'number' ? toolAdoptionAnswers['ma-adopt-2'] : null;
  // Decide-and-document threshold: a score of >=2 on both MANAGE items ("a
  // decision was made and documented," "alternatives were considered even if
  // informally") is read as "a real decision process happened" -- this
  // doesn't require the single best answer (3, reviewed by someone else) on
  // both, matching this project's existing pattern of treating a >=2 answer
  // as "mostly there" rather than only counting the top option. Either
  // question left unanswered means the process hasn't happened, not that it's
  // unknown -- consistent with classifyUseCaseRisk's own no-evidence-means-
  // least-severe convention, applied here in the opposite direction (no
  // decision evidence means NOT ready, not "assume it's fine").
  var readyToProceed = decisionMade !== null && decisionMade >= 2 &&
    alternativesConsidered !== null && alternativesConsidered >= 2;

  return {
    tier: classification.tier,
    compositeScore: classification.compositeScore,
    annexIiiDomainIds: classification.annexIiiDomainIds,
    oversight: classification.oversight,
    decisionReadiness: {
      decisionMade: decisionMade,
      alternativesConsidered: alternativesConsidered,
      readyToProceed: readyToProceed
    }
  };
}

// Decide-and-document, newly authored report-facing copy for this item (same
// discipline as B4's DEPARTMENTS list / B7's recommendation copy) -- a plain-
// language summary of evaluateToolAdoption()'s output, not a new regulatory
// claim. A missing decision process overrides tier entirely: a Tier 4 tool
// adopted with no go/no-go review is still a process gap worth surfacing, not
// something the low tier should quietly excuse.
export function describeToolAdoptionOutcome(evaluation) {
  var tierLabel = evaluation.tier.label;
  var oversight = evaluation.oversight;
  var readiness = evaluation.decisionReadiness;
  var isHigherTier = evaluation.tier.key === 'tier1' || evaluation.tier.key === 'tier2';

  var headline;
  if (!readiness.readyToProceed) {
    headline = 'Pause before proceeding -- the decision process itself is not documented yet';
  } else if (isHigherTier) {
    headline = 'Proceed only with the oversight below in place';
  } else {
    headline = 'Lower-risk tool -- standard intake is enough';
  }

  var body;
  if (!readiness.readyToProceed) {
    body = 'This tool classifies as ' + tierLabel + ', but a documented, reviewed go/no-go determination (NIST MANAGE 1.1) and a documented comparison against non-AI alternatives (MANAGE 2.1) haven\'t both happened yet. Close that gap before treating this as approved, regardless of tier.';
  } else if (oversight) {
    body = 'This tool classifies as ' + tierLabel + '. Oversight expectation at your organization\'s size: ' + oversight.reviewer + ', ' + oversight.cadence.toLowerCase() + (oversight.signoffRequired ? ', with signoff required.' : '.');
  } else {
    body = 'This tool classifies as ' + tierLabel + '. No oversight expectation is defined for the selected company size -- treat this as an honest gap in the lookup table, not a "no action needed" signal.';
  }

  return { headline: headline, body: body };
}

// B17 standard #1 (every score traces to specific responses): the New AI
// Tool Adoption result screen showed a tier and composite score with no way
// to see which of the 9 answers produced it -- unlike the Governance
// Readiness report, which B15 already made fully traceable. Same pattern
// as B15's explain* family, applied to this assessment's own question bank.
export function explainToolAdoptionAnswers(answers) {
  return TOOL_ADOPTION_QUESTIONS.filter(function(q) { return answers[q.id] !== undefined; })
    .map(function(q) {
      var v = answers[q.id];
      var opt = q.options.find(function(o) { return o.v === v; });
      return { id: q.id, text: q.text, kind: q.kind, v: v, label: opt ? opt.label : null };
    });
}

// ============================================================================
// B14: nine-section report rebuild (backlog SS1.4.8) -- these two functions
// assemble already-computed report data into a clean, exportable shape (JSON)
// and a flat tabular shape (CSV), rather than duplicating any scoring logic.
// Nothing here changes what any existing function computes.
// ============================================================================

// Risk Register section (SS1.4.8's nine-section list; this project's first
// build of it). SCOPING CALL, stated plainly rather than glossed over: a true
// per-USE-CASE Tier 1-4 register (B6's classifyUseCaseRisk) needs the seven
// risk-criteria answers B13's New AI Tool Adoption assessment collects one
// tool at a time -- the Governance Readiness flow this report belongs to
// never collects those for the org's whole tool inventory at once. Building
// that for real would mean either running B13 per declared tool (a real
// future feature, not this item's scope) or guessing at criteria answers
// nobody gave -- neither is this item's call to make. This register is
// therefore built at TOOL level instead, from the same classifyToolsInUse()
// data the existing tool-review section already shows: each declared tool's
// TOOL_MASTER_LIST classification, reasoning, sources, and last-reviewed
// date, plus each undeclared/unclassified "other tool" as its own row. This
// is real, sourced content -- not a placeholder -- just a different (coarser)
// grain than the four-tier per-use-case model, and the report says so.
export function buildRiskRegister(toolAnalysis) {
  var rows = [];
  ['high-risk', 'caution', 'lower-risk'].forEach(function(cls) {
    toolAnalysis.flagged[cls].forEach(function(t) {
      rows.push({
        name: t.name,
        classification: cls,
        reasoning: t.reasoning,
        sources: t.sources,
        lastReviewed: t.lastReviewed
      });
    });
  });
  (toolAnalysis.otherTools || []).forEach(function(name) {
    rows.push({ name: name, classification: 'unclassified', reasoning: 'Not in the reviewed tool list -- evaluate independently.', sources: [], lastReviewed: null });
  });
  return rows;
}

// Full structured export (JSON leg of SS1.4.8's "interactive HTML (primary)
// + PDF + structured JSON/CSV export"). The PDF leg is deliberately NOT a new
// dependency here -- the existing "Print or save as PDF" button (browser
// print-to-PDF) already satisfies it without adding a rendering library,
// consistent with this project's standalone/no-backend-by-default design
// (SS1.4.2); revisiting that is a scope call for whoever picks up a real PDF
// template, not decided here. `input` is the same set of already-computed
// values renderReport() builds for on-screen display -- this function adds
// no new computation, just assembles them into one clean, stable shape safe
// to JSON.stringify and hand to a user.
// B17 standard #5 (assumptions and limitations stated, not buried):
// consolidates limitations that otherwise sit scattered, one per report
// section, into a single list -- the JSON export's version of the report's
// own "Assumptions & Limitations" block (src/ui.js). The unsourced-
// regulatory-factor line is conditional (standard #2): only included when
// computeRegulatoryExposure() actually produced a factor lacking a real
// dated source, so this doesn't assert a caveat that isn't true for a given
// report (e.g. a report with only EU/US/Canada jurisdiction factors, all of
// which DO carry R4/R5/R6 citations, shouldn't imply otherwise).
export function buildAssumptionsAndLimitations(regulatoryExposure) {
  var items = [
    'Framework Coverage is measured at NIST-function level, not the full 72-subcategory breakdown.',
    'The Risk Register lists tool-level classifications, not a per-use-case Tier 1-4 register -- that needs the New AI Tool Adoption assessment run per declared tool.',
    'Tool classifications are point-in-time (see each tool\'s own "last reviewed" date) and criteria-based.',
    'This is a self-assessment for internal planning, not a compliance certification or legal advice.'
  ];
  var unsourced = (regulatoryExposure.factors || []).filter(function(f) { return !f.source && f.level !== 'info'; });
  if (unsourced.length > 0) {
    items.splice(2, 0, 'Regulatory Exposure factors without a dated citation (' + unsourced.map(function(f) { return f.label; }).join(', ') + ') reflect well-established frameworks but have not yet been independently re-verified and dated the way the EU/US/Canada jurisdiction findings have -- treat them as directional, not confirmed citations, until that research is done.');
  }
  return items;
}

export function buildReportExport(input) {
  return {
    generatedAt: new Date().toISOString(),
    methodology: 'NIST AI Risk Management Framework (Govern/Map/Measure/Manage). Governance Maturity is a weighted average of five sub-dimensions with an Ownership & Accountability gating rule -- see this project\'s own published methodology notes, not a NIST-defined score.',
    methodologyNotes: METHODOLOGY_NOTES,
    assumptionsAndLimitations: buildAssumptionsAndLimitations(input.regulatoryExposure),
    assessment: {
      scope: input.scope,
      role: input.role,
      depth: input.depth,
      profile: input.profile
    },
    governanceMaturity: {
      overall: input.scores.overall,
      tier: input.tier.label,
      dimensions: input.scores.dimensionPct,
      nistFunctions: input.scores.fnScores
    },
    selfPerceptionVsEvidence: input.confidenceGap,
    regulatoryExposure: input.regulatoryExposure,
    toolPortfolioRisk: {
      level: input.toolPortfolioRisk.level,
      highRiskCount: input.toolPortfolioRisk.highRiskCount,
      cautionCount: input.toolPortfolioRisk.cautionCount,
      lowerRiskCount: input.toolPortfolioRisk.lowerRiskCount,
      unclassifiedCount: input.toolPortfolioRisk.unclassifiedCount
    },
    frameworkCoverage: input.frameworkCoverage,
    riskRegister: buildRiskRegister(input.toolAnalysis),
    // B16: dmaic is included only when the caller already ran the recs
    // through applyDmaicFraming (its own dedicated Define/Measure/Analyze/
    // Improve/Control fields) -- this function never computes it itself, to
    // avoid recomputing report content export-side that the caller may have
    // already built for on-screen display.
    recommendations: input.recs.map(function(r) {
      var row = { title: r.title, priority: r.priority, nistFunction: r.fn, module: r.module, body: r.body };
      if (r.dmaic) row.dmaic = r.dmaic;
      return row;
    }),
    disclaimer: 'Self-assessment for internal planning, not a compliance certification or legal advice. Tool classifications are point-in-time and criteria-based.'
  };
}

// Generic RFC4180-ish CSV serializer -- no library dependency for a feature
// this small. Quotes a field only when it contains a comma, quote, or
// newline (quotes doubled per the standard); everything else is emitted
// bare, matching what any spreadsheet app expects to read back correctly.
export function toCsv(rows, columns) {
  function escapeCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  var lines = [columns.map(function(c) { return escapeCell(c.label); }).join(',')];
  rows.forEach(function(row) {
    lines.push(columns.map(function(c) { return escapeCell(c.get(row)); }).join(','));
  });
  return lines.join('\r\n');
}

// Recommendations table specifically, per this item's own decide-and-document
// scoping choice: CSV serves the one dataset someone would actually want to
// paste into a spreadsheet and work with row-by-row (a prioritized action
// list); everything else (methodology, per-dimension scores, full risk
// register) is already in the JSON export above, and forcing dissimilar
// nested shapes into one flat CSV would produce something less useful than
// either format done properly.
// B16: Measure/Analyze/Improve/Control columns are populated only when the
// caller already ran recs through applyDmaicFraming -- (r.dmaic || {}).x
// reads as blank cells rather than throwing for a plain buildRecommendations()
// list, so this stays backward-compatible with any caller that hasn't
// adopted DMAIC framing.
export function recommendationsToCsv(recs) {
  return toCsv(recs, [
    { label: 'Priority', get: function(r) { return r.priority; } },
    { label: 'NIST Function', get: function(r) { return r.fn; } },
    { label: 'Module', get: function(r) { return r.module; } },
    { label: 'Title', get: function(r) { return r.title; } },
    { label: 'Measure', get: function(r) { return (r.dmaic || {}).measure; } },
    { label: 'Analyze', get: function(r) { return (r.dmaic || {}).analyze; } },
    { label: 'Improve', get: function(r) { return r.dmaic ? r.dmaic.improve : r.body; } },
    { label: 'Control', get: function(r) { return (r.dmaic || {}).control; } }
  ]);
}

// Executive Summary narrative (SS1.4.8's nine-section list, section 1).
// Decide-and-document authored copy (same discipline as B4/B7/B10/B13's own
// authored copy) synthesizing already-computed values into one paragraph --
// asserts nothing new, just names the single most urgent item so the report
// doesn't open with a wall of numbers and no read on what matters most.
export function buildExecutiveSummary(recs, regulatoryExposure, toolPortfolioRisk) {
  var topRec = recs[0];
  var headline = topRec ?
    (topRec.priority === 'critical' ?
      'The most urgent finding is structural: ' + topRec.title + '.' :
      'The top-priority action is: ' + topRec.title + '.') :
    'No critical or high-priority gaps were found at this assessment depth.';

  var exposureNotes = [];
  if (regulatoryExposure.level === 'high') exposureNotes.push('regulatory exposure is elevated');
  if (toolPortfolioRisk.level === 'high') exposureNotes.push('the declared tool portfolio carries elevated risk');
  var exposureLine = exposureNotes.length > 0 ?
    ' Separately, ' + exposureNotes.join(', and ') + ' -- see those sections below.' : '';

  return headline + exposureLine;
}

// ============================================================================
// B15: drill-down from summary gap counts/scores into itemized reasoning
// (backlog SS1.4.8). Each function below answers the same question for a
// different summary number in the report: "which specific answered
// questions produced this?" This is real traceability (B17 quality standard
// #1: "every score traces to specific responses"), not new computation --
// each one filters/maps state already produced by identifyGaps()/
// computeScores(), never recomputing a score.
//
// SOURCING NOTE, stated plainly: B15's own backlog note names R15's drafted
// glossary (plain-language NIST term definitions) as "a natural fit" for
// this item's drill-down interactions -- e.g. a definition inline when
// drilling into NIST-jargon-heavy finding. This Claude Code session cannot
// read research-r15-nist-glossary-terms.md (a Cowork Project doc, same
// access limitation already documented for B10's R4-R6 sourcing) and R15's
// own condensed backlog summary (SS1.5, "R15") gives category counts, not
// the 19 terms' actual definitions -- nothing to safely reuse without
// inventing text R15 doesn't record here. The glossary/tooltip layer is
// therefore NOT built in this item; deferred until R15's actual draft can be
// reviewed against the real doc. What IS built is B15's own primary,
// literal spec -- "drill-down from summary gap counts into itemized
// reasoning" -- using content this repo already has in full.
// ============================================================================

// Which specific question-level gaps (identifyGaps() output) produced a
// given priority's count in the report's stat grid.
export function explainGapsByPriority(gaps, priority) {
  return gaps.filter(function(g) { return g.priority === priority; }).map(function(g) {
    var opt = g.q.options.find(function(o) { return o.v === g.v; });
    return { id: g.q.id, text: g.q.text, fn: g.fn, v: g.v, label: opt ? opt.label : null };
  });
}

// Which specific answered questions rolled into one GOVERNANCE_DIMENSIONS
// score (computeScores()'s dimensionPct[dimensionId]) -- an unanswered
// question at this depth/module never contributed to that percentage, so it
// is excluded here too, consistent with computeScores()'s own accounting.
export function explainDimension(questions, answers, dimensionId) {
  return questions.filter(function(q) { return q.dimension === dimensionId && answers[q.id] !== undefined; })
    .map(function(q) {
      var v = answers[q.id];
      var opt = q.options.find(function(o) { return o.v === v; });
      return { id: q.id, text: q.text, fn: q.fn, v: v, label: opt ? opt.label : null };
    });
}

// Which specific answered questions rolled into one NIST function's score
// (computeScores()'s fnScores[fn] -- also Framework Coverage Mapping's
// per-function pct, since it's built directly on fnScores).
export function explainFunctionScore(questions, answers, fn) {
  return questions.filter(function(q) { return q.fn === fn && answers[q.id] !== undefined; })
    .map(function(q) {
      var v = answers[q.id];
      var opt = q.options.find(function(o) { return o.v === v; });
      return { id: q.id, text: q.text, dimension: q.dimension || null, v: v, label: opt ? opt.label : null };
    });
}

// The single answered question a specific recommendation traces back to
// (B16's Measure step -- see applyDmaicFraming below). Returns null for an
// unknown id or a question that was never answered, rather than a
// zero-value evidence row that would misrepresent "no data" as "answered 0."
export function explainQuestion(questions, answers, questionId) {
  var q = questions.find(function(qq) { return qq.id === questionId; });
  if (!q || answers[questionId] === undefined) return null;
  var v = answers[questionId];
  var opt = q.options.find(function(o) { return o.v === v; });
  return { id: q.id, text: q.text, fn: q.fn, dimension: q.dimension || null, v: v, label: opt ? opt.label : null };
}

// ============================================================================
// B16: DMAIC-style (Define/Measure/Analyze/Improve/Control) restructuring of
// the Prioritized Recommendations section. No prior design thread or
// research item scoped exactly how this Six Sigma pattern should map onto a
// recommendation card -- a genuine decide-and-document call, documented in
// full in the backlog entry for this item.
//
// Deliberately does NOT re-author the 53 REC_BODIES paragraphs into five
// separate fields each -- that's a large, disproportionate content-authoring
// project for what this item actually asks for (a restructuring of
// presentation, not a rewrite of already-reviewed recommendation prose).
// Define = the recommendation's own already-existing title (no new field
// needed -- it already is a "what's wrong" statement). Improve = the
// existing body verbatim, unchanged and unsplit. Measure and Analyze are
// newly built here from data this codebase already has (the originating
// question/dimension, via buildRecommendations'/B15's own explain* family)
// -- real evidence, not reworded prose. Control is new, templated,
// decide-and-document authored copy (same discipline as B4/B7/B10/B13's own)
// -- a priority-based re-check cadence, not a per-question claim.
// ============================================================================
// B17 standard #4 (size/maturity-calibrated recommendations): reuses
// OVERSIGHT_EXPECTATIONS.tier1's own per-size reviewer language -- the
// already-established, already-cited size-band-to-governance-structure
// mapping (SS1.4.6/R3) -- rather than inventing a second, parallel size
// taxonomy just for this. Tier1's reviewer progression (owner-led informal
// at 1-10, through full governance function at 1000+) already IS that
// general structure; reused here for "who typically owns follow-through on
// ANY governance gap at this size," not specifically a Tier 1 AI use case.
// Returns null for a missing/unrecognized size rather than guessing.
export function ownerForSize(companySize) {
  var entry = OVERSIGHT_EXPECTATIONS.tier1[companySize];
  return entry ? entry.reviewer : null;
}

export function applyDmaicFraming(recs, questions, answers, companySize) {
  var owner = ownerForSize(companySize);
  return recs.map(function(r) {
    var measure, analyze;

    if (r.priority === 'critical') {
      // B7's critical entry only ever fires on the Ownership & Accountability
      // gating rule (B5/R2) -- identifyCriticalGaps has no other dimension it
      // can produce today, so that's addressed directly here rather than
      // threading a new field through a function that can only ever mean one
      // thing. Measure points back at B15's own drill-down for the itemized
      // list rather than repeating it -- the two features shouldn't duplicate
      // the same evidence twice on one page.
      var dimRows = explainDimension(questions, answers, 'ownership-accountability');
      measure = dimRows.length > 0 ?
        'Averaged across ' + dimRows.length + ' answered Ownership & Accountability question' + (dimRows.length === 1 ? '' : 's') + ' -- see the Governance Score Breakdown drill-down above for each one.' :
        'No Ownership & Accountability questions have been answered yet.';
      analyze = 'Ownership & Accountability is a structural prerequisite the other four dimensions depend on, not just one-fifth of an average -- see this finding\'s own reasoning above for the CSA whitepaper evidence.';
    } else {
      var evidence = r.questionId ? explainQuestion(questions, answers, r.questionId) : null;
      measure = evidence ? 'You answered: "' + evidence.label + '"' : 'No specific answer on file for this item.';
      var dim = r.dimension ? GOVERNANCE_DIMENSIONS.find(function(d) { return d.id === r.dimension; }) : null;
      analyze = dim ?
        'This sits in the ' + dim.label + ' dimension (' + dim.weight + '% of your overall Governance Maturity score) within the ' + FRAMEWORK.functions[r.fn].name + ' function.' :
        'This sits in the ' + FRAMEWORK.functions[r.fn].name + ' function.';
    }

    var control = (r.priority === 'critical' || r.priority === 'high') ?
      'Re-check this at your next quarterly review -- treat it as unresolved until you can point to a specific artifact.' :
      'Revisit at your next standard governance review (recommended at least annually) to confirm it has actually been addressed.';
    if (owner) control += ' At your declared organization size, that typically falls to ' + owner.toLowerCase() + '.';

    return Object.assign({}, r, {
      dmaic: { measure: measure, analyze: analyze, improve: r.body, control: control }
    });
  });
}

// ============================================================================
// B16b (optional candidate, proposed by Kartik 2026-08-30, backlog's own
// note): when a declared tool is caution/high-risk, surface a same-category,
// lower-risk alternative already in TOOL_MASTER_LIST -- an extension of the
// existing AI Tool Portfolio Review section (B10/B14), not a new
// architecture, per this item's own stated "natural home."
//
// The backlog's own four design constraints for this item, addressed here:
// (1) same citation rigor as classifications themselves -- satisfied by
//     construction: this only surfaces an ALREADY-classified, already-cited
//     TOOL_MASTER_LIST entry, never a new claim about the alternative.
// (2) a graceful no-alternative-found fallback -- returns null rather than
//     forcing a suggestion; the UI renders nothing at all in that case
//     rather than a manufactured "no alternative" callout, matching the
//     backlog's own "forcing a recommendation would misrepresent the
//     landscape" concern.
// (3) explicit non-endorsement framing -- handled in the UI copy
//     (src/ui.js), not this function; kept as a rendering concern.
// (4) quality depends on real per-category tool density -- an inherent,
//     honest limitation of the current inventory, not something this
//     function can compensate for; a thin category will just correctly
//     return null more often.
// ============================================================================
export function findLowerRiskAlternative(tool, profile) {
  if (!tool || tool.classification === 'lower-risk') return null;

  var candidates = TOOL_MASTER_LIST.filter(function(t) {
    return t.id !== tool.id && t.category === tool.category && t.classification === 'lower-risk';
  });
  if (candidates.length === 0) return null;

  var industryId = profile && profile.industry;
  var industryMatches = industryId ? candidates.filter(function(t) {
    return t.industries.indexOf('all') !== -1 || t.industries.indexOf(industryId) !== -1;
  }) : [];
  var pool = industryMatches.length > 0 ? industryMatches : candidates;

  // Deterministic tie-break among multiple equally-valid candidates: most
  // recently reviewed first (freshest data), then name for stability --
  // never an arbitrary/undocumented "first in the array" pick.
  var sorted = pool.slice().sort(function(a, b) {
    if (a.lastReviewed !== b.lastReviewed) return a.lastReviewed < b.lastReviewed ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return { tool: sorted[0], matchedIndustry: industryMatches.length > 0 };
}

// Batch form for the report's AI Tool Portfolio Review section -- one lookup
// per flagged (caution/high-risk) tool in the declared inventory, keyed by
// tool id and omitting entries with no alternative (design constraint #2
// above) rather than carrying nulls the UI would have to filter out itself.
export function buildToolAlternatives(toolAnalysis, profile) {
  var result = {};
  ['high-risk', 'caution'].forEach(function(cls) {
    toolAnalysis.flagged[cls].forEach(function(t) {
      var alt = findLowerRiskAlternative(t, profile);
      if (alt) result[t.id] = alt;
    });
  });
  return result;
}

