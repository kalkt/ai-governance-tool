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
  TOOL_MASTER_LIST
} from './data.js';

export function getApplicableModules(profile) {
  var modules = ['base'];
  if (profile.orgType === 'nonprofit') modules.push('nonprofit');
  if (profile.servesYouth === true) modules.push('youth');
  return modules;
}

export function getQuestionsForAssessment(profile, depth) {
  var modules = getApplicableModules(profile);
  var pool = [];
  // base is always present per getApplicableModules, this branch is defensive and intentionally untested
  if (modules.indexOf('base') !== -1) pool = pool.concat(BASE_QUESTIONS);
  if (modules.indexOf('nonprofit') !== -1) pool = pool.concat(NONPROFIT_QUESTIONS);
  if (modules.indexOf('youth') !== -1) pool = pool.concat(YOUTH_QUESTIONS);
  return pool.filter(function(q) { return q.depths.indexOf(depth) !== -1; });
}

export function computeScores(questions, answers) {
  var fnScores = {
    govern: { sum: 0, max: 0 },
    map: { sum: 0, max: 0 },
    measure: { sum: 0, max: 0 },
    manage: { sum: 0, max: 0 }
  };
  questions.forEach(function(q) {
    if (answers[q.id] !== undefined) {
      fnScores[q.fn].sum += answers[q.id];
      fnScores[q.fn].max += 3;
    }
  });
  var totalSum = 0, totalMax = 0;
  Object.keys(fnScores).forEach(function(k) {
    totalSum += fnScores[k].sum;
    totalMax += fnScores[k].max;
  });
  var overall = totalMax === 0 ? 0 : Math.round((totalSum / totalMax) * 100);
  return { fnScores: fnScores, overall: overall, totalSum: totalSum, totalMax: totalMax };
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
        body: body
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
  return recs.map(function(r) {
    return { priority: r.priority, fn: r.fn, module: r.module, title: r.title, body: r.body + ' ' + note };
  });
}
