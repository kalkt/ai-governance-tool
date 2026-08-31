// ============================================================================
// UI / DOM LAYER (B25): extracted from index.html's inline <script type="module">
// so it can be imported and driven directly in tests (jsdom), the same way
// logic.js/data.js already are -- without needing a real browser.
//
// Why this extraction exists, not the alternative (loading index.html itself
// into jsdom): jsdom does not execute <script type="module"> at all (its own
// HTMLScriptElement implementation has an explicit `// TODO: implement
// modules` and never runs module scripts), confirmed directly against the
// installed jsdom version before choosing this path. Since index.html's app
// lived entirely inside a module script with `import` statements, loading it
// into jsdom would never have run any app code, regardless of harness effort
// spent on it. Extracting into a real module sidesteps that limitation
// entirely and is also the more conventional structure.
//
// Behavior is unchanged from the code this was extracted from -- functions
// still reach out to the global `document`/`window` exactly as before, so
// this only works when a DOM (browser or jsdom) is present. `mountApp()` is
// the single entry point index.html now calls.
// ============================================================================

import {
  FRAMEWORK,
  INDUSTRIES,
  TOOL_MASTER_LIST,
  CONFIDENCE_QUESTIONS,
  LIKERT_OPTIONS,
  SCOPE_OPTIONS,
  ROLE_OPTIONS
} from './data.js';
import {
  getApplicableModules,
  getQuestionsForAssessment,
  computeScores,
  computeTier,
  identifyGaps,
  identifyCriticalGaps,
  buildRecommendations,
  classifyToolsInUse,
  filterToolsForProfile,
  computeConfidenceGap,
  scopeSubject,
  describeScope,
  applyScopeFraming,
  describeRole,
  roleVisibilityCaveat,
  applyRoleFraming,
  computeRegulatoryExposure,
  computeToolPortfolioRisk,
  computeFrameworkCoverage
} from './logic.js';

// ============================================================================
// STATE
// ============================================================================

export function initialState() {
  return {
    scope: { id: null, name: '' },  // v2 SS12.2 assessment scope selector
    role: { id: null, department: '' },  // B3: respondent role, reconciled against scope above
    profile: {
      orgType: null,          // 'nonprofit' | 'for-profit'
      servesYouth: null,      // true | false
      industry: null,         // industry id
      size: null,             // '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
      region: null,           // 'us' | 'eu' | 'uk' | 'ca' | 'other'
      regulated: [],          // array of 'pii' | 'phi' | 'financial' | 'eu-customers' | 'children-data'
      customerType: null,     // 'b2b' | 'b2c' | 'gov' | 'internal'
      aiMaturity: null        // 'exploring' | 'piloting' | 'deployed' | 'scaled'
    },
    toolsSelected: [],        // array of tool ids
    otherTools: [],           // array of user-added tool names
    depth: null,
    questions: [],
    answers: {},
    idx: 0,
    confidenceAnswers: {}     // self-reported Likert 1-5, keyed by NIST function id
  };
}

export var state = initialState();

// Resets every field on the shared `state` object in place (same object
// reference, not a reassignment) so exported bindings/imports stay live.
// Used by the report's "Start over" button, and directly by tests that need
// a clean slate between cases without re-importing the module.
export function resetState() {
  var fresh = initialState();
  Object.keys(fresh).forEach(function(k) { state[k] = fresh[k]; });
}

// ============================================================================
// RENDERING (DOM layer, kept separate from logic above)
// ============================================================================

export function el(id) { return document.getElementById(id); }
export function hideAll() {
  ['stage-intro','stage-scope','stage-profile','stage-tools','stage-depth','stage-quiz','stage-confidence','stage-report'].forEach(function(s) {
    el(s).classList.add('hidden');
  });
}
export function show(stageId) {
  hideAll();
  el(stageId).classList.remove('hidden');
  window.scrollTo(0, 0);
}

export function renderStepper(currentStep) {
  var steps = [
    { id: 'scope', label: 'Scope' },
    { id: 'profile', label: 'Profile' },
    { id: 'tools', label: 'Tools' },
    { id: 'depth', label: 'Depth' },
    { id: 'assess', label: 'Assessment' },
    { id: 'confidence', label: 'Confidence' },
    { id: 'report', label: 'Report' }
  ];
  var stepper = el('stepper');
  var currentIdx = steps.findIndex(function(s) { return s.id === currentStep; });
  stepper.classList.remove('hidden');
  stepper.innerHTML = steps.map(function(s, i) {
    var cls = 'step';
    if (i < currentIdx) cls += ' complete';
    if (i === currentIdx) cls += ' active';
    return '<div class="' + cls + '"><span class="step-dot"></span>' + s.label + '</div>' +
      (i < steps.length - 1 ? '<span class="step-sep">→</span>' : '');
  }).join('');
}

export function renderIntro() {
  show('stage-intro');
  el('stepper').classList.add('hidden');
  el('stage-intro').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">AI governance readiness</p>' +
      '<h1>How ready is your business for AI?</h1>' +
      '<p class="lede">A NIST AI Risk Management Framework based assessment, built for small and medium businesses adopting AI tools. This version adds profile-tailored questions for nonprofits and youth-serving organizations.</p>' +
    '</div>' +
    '<div class="callout info">' +
      '<strong>What you get:</strong> A structured 15-30 minute assessment across four NIST functions (Govern, Map, Measure, Manage), plus additional modules that apply if your organization is a nonprofit or serves people under 18. Report includes a risk tier, gap map, prioritized recommendations, and an objective classification of AI tools you already use.' +
    '</div>' +
    '<div class="row" style="margin-top: 1rem;"><button id="btn-start" class="primary">Start</button></div>';
  el('btn-start').addEventListener('click', renderScope);
}

export function renderScope() {
  show('stage-scope');
  renderStepper('scope');
  var s = state.scope;
  var r = state.role;
  var selectedOpt = SCOPE_OPTIONS.find(function(o) { return o.id === s.id; });
  var selectedRole = ROLE_OPTIONS.find(function(o) { return o.id === r.id; });

  el('stage-scope').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">Step 1 of 5</p>' +
      '<h1>What are you assessing?</h1>' +
      '<p class="lede">Pick the scope before you start. A department lead answering for governance they cannot see (a policy Legal wrote but they have never seen, for example) produces a false finding — this keeps that from happening and shapes how your report is framed.</p>' +
    '</div>' +

    '<div class="choice-grid" id="scope-grid">' +
      SCOPE_OPTIONS.map(function(o) {
        return '<button class="choice' + (s.id === o.id ? ' selected' : '') + '" data-scope="' + o.id + '">' +
          '<h3>' + o.label + '</h3>' +
          '<p>' + o.tagline + '</p>' +
        '</button>';
      }).join('') +
    '</div>' +

    (selectedOpt && selectedOpt.nameLabel ?
      '<div class="field-group" id="scope-name-group">' +
        '<label class="field-label">' + selectedOpt.nameLabel + '</label>' +
        '<input type="text" id="f-scope-name" value="' + escapeHtml(s.name || '') + '" placeholder="e.g. ' + (selectedOpt.id === 'department' ? 'Marketing' : 'Customer-support chatbot') + '" />' +
      '</div>' : '') +

    '<p id="err-scope" class="err hidden">Pick a scope to continue.</p>' +

    '<div class="hero" style="margin-top: 1.5rem;">' +
      '<h1 style="font-size: 1.25rem;">Who\'s answering?</h1>' +
      '<p class="lede">This is separate from the scope above — a leadership respondent can still answer for a single department, and an individual employee can be asked about the whole organization. It changes how your report is framed, not which scope you chose.</p>' +
    '</div>' +

    '<div class="choice-grid" id="role-grid">' +
      ROLE_OPTIONS.map(function(o) {
        return '<button class="choice' + (r.id === o.id ? ' selected' : '') + '" data-role="' + o.id + '">' +
          '<h3>' + o.label + '</h3>' +
          '<p>' + o.tagline + '</p>' +
        '</button>';
      }).join('') +
    '</div>' +

    (selectedRole && selectedRole.hasDepartmentField ?
      '<div class="field-group" id="role-department-group">' +
        '<label class="field-label">Your department (optional)</label>' +
        '<input type="text" id="f-role-department" value="' + escapeHtml(r.department || '') + '" placeholder="e.g. Marketing" />' +
      '</div>' : '') +

    '<p id="err-role" class="err hidden">Pick who\'s answering to continue.</p>' +

    '<div class="row" style="margin-top: 1rem;">' +
      '<button id="btn-back-scope">Back</button>' +
      '<div style="flex:1"></div>' +
      '<button id="btn-next-scope" class="primary">Continue</button>' +
    '</div>';

  document.querySelectorAll('#scope-grid .choice').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.scope.id = btn.getAttribute('data-scope');
      el('err-scope').classList.add('hidden');
      renderScope();
    });
  });

  document.querySelectorAll('#role-grid .choice').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.role.id = btn.getAttribute('data-role');
      el('err-role').classList.add('hidden');
      renderScope();
    });
  });

  if (el('f-scope-name')) {
    el('f-scope-name').addEventListener('input', function(e) { state.scope.name = e.target.value; });
  }

  if (el('f-role-department')) {
    el('f-role-department').addEventListener('input', function(e) { state.role.department = e.target.value; });
  }

  el('btn-back-scope').addEventListener('click', renderIntro);
  el('btn-next-scope').addEventListener('click', function() {
    if (!state.scope.id) {
      el('err-scope').classList.remove('hidden');
      return;
    }
    if (!state.role.id) {
      el('err-role').classList.remove('hidden');
      return;
    }
    renderProfile();
  });
}

export function renderProfile() {
  show('stage-profile');
  renderStepper('profile');
  var p = state.profile;
  el('stage-profile').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">Step 2 of 5</p>' +
      '<h1>Tell us about your organization</h1>' +
      '<p class="lede">This tailors which questions apply and how recommendations are framed. All fields optional except organization type.</p>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="field-group">' +
        '<label class="field-label">Organization type <span class="field-required">*</span></label>' +
        '<div class="radio-row">' +
          radioBtn('orgType', 'nonprofit', 'Nonprofit / 501(c)(3)', p.orgType === 'nonprofit') +
          radioBtn('orgType', 'for-profit', 'For-profit', p.orgType === 'for-profit') +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Does your organization serve people under 18? <span class="field-required">*</span></label>' +
        '<p class="field-hint">Includes youth programs, K-12 education, pediatric services, family services.</p>' +
        '<div class="radio-row">' +
          radioBtn('servesYouth', 'true', 'Yes', p.servesYouth === true) +
          radioBtn('servesYouth', 'false', 'No', p.servesYouth === false) +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Industry</label>' +
        '<select id="f-industry">' +
          '<option value="">Select industry...</option>' +
          INDUSTRIES.map(function(ind) {
            return '<option value="' + ind.id + '"' + (p.industry === ind.id ? ' selected' : '') + '>' + ind.label + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Organization size</label>' +
        '<div class="radio-row">' +
          radioBtn('size', '1-10', '1-10', p.size === '1-10') +
          radioBtn('size', '11-50', '11-50', p.size === '11-50') +
          radioBtn('size', '51-200', '51-200', p.size === '51-200') +
          radioBtn('size', '201-1000', '201-1,000', p.size === '201-1000') +
          radioBtn('size', '1000+', '1,000+', p.size === '1000+') +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Primary region</label>' +
        '<div class="radio-row">' +
          radioBtn('region', 'us', 'United States', p.region === 'us') +
          radioBtn('region', 'eu', 'European Union', p.region === 'eu') +
          radioBtn('region', 'uk', 'United Kingdom', p.region === 'uk') +
          radioBtn('region', 'ca', 'Canada', p.region === 'ca') +
          radioBtn('region', 'other', 'Other', p.region === 'other') +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Do you handle any of the following? (select all that apply)</label>' +
        '<div class="checkbox-row">' +
          checkBtn('regulated', 'pii', 'Personal identifiable info', p.regulated.indexOf('pii') !== -1) +
          checkBtn('regulated', 'phi', 'Health data (PHI)', p.regulated.indexOf('phi') !== -1) +
          checkBtn('regulated', 'financial', 'Financial data', p.regulated.indexOf('financial') !== -1) +
          checkBtn('regulated', 'eu-customers', 'EU customers (GDPR)', p.regulated.indexOf('eu-customers') !== -1) +
          checkBtn('regulated', 'children-data', 'Data about children', p.regulated.indexOf('children-data') !== -1) +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Primary customer type</label>' +
        '<div class="radio-row">' +
          radioBtn('customerType', 'b2b', 'B2B', p.customerType === 'b2b') +
          radioBtn('customerType', 'b2c', 'B2C', p.customerType === 'b2c') +
          radioBtn('customerType', 'gov', 'Government', p.customerType === 'gov') +
          radioBtn('customerType', 'internal', 'Internal only', p.customerType === 'internal') +
        '</div>' +
      '</div>' +

      '<div class="field-group">' +
        '<label class="field-label">Current AI maturity</label>' +
        '<div class="radio-row">' +
          radioBtn('aiMaturity', 'exploring', 'Just exploring', p.aiMaturity === 'exploring') +
          radioBtn('aiMaturity', 'piloting', 'Piloting tools', p.aiMaturity === 'piloting') +
          radioBtn('aiMaturity', 'deployed', 'Deployed in some functions', p.aiMaturity === 'deployed') +
          radioBtn('aiMaturity', 'scaled', 'Scaled across the org', p.aiMaturity === 'scaled') +
        '</div>' +
      '</div>' +
    '</div>' +

    '<p id="err-profile" class="err hidden">Please answer the two required questions to continue.</p>' +

    '<div class="row" style="margin-top: 1rem;">' +
      '<button id="btn-back-intro">Back</button>' +
      '<div style="flex:1"></div>' +
      '<button id="btn-next-profile" class="primary">Continue to tools</button>' +
    '</div>';

  attachRadioHandlers('orgType', function(v) { state.profile.orgType = v; });
  attachRadioHandlers('servesYouth', function(v) { state.profile.servesYouth = (v === 'true'); });
  attachRadioHandlers('size', function(v) { state.profile.size = v; });
  attachRadioHandlers('region', function(v) { state.profile.region = v; });
  attachRadioHandlers('customerType', function(v) { state.profile.customerType = v; });
  attachRadioHandlers('aiMaturity', function(v) { state.profile.aiMaturity = v; });
  attachCheckHandlers('regulated', state.profile.regulated);
  el('f-industry').addEventListener('change', function(e) { state.profile.industry = e.target.value || null; });

  el('btn-back-intro').addEventListener('click', renderScope);
  el('btn-next-profile').addEventListener('click', function() {
    if (state.profile.orgType === null || state.profile.servesYouth === null) {
      el('err-profile').classList.remove('hidden');
      return;
    }
    renderTools();
  });
}

export function radioBtn(name, value, label, selected) {
  return '<label class="radio-opt' + (selected ? ' selected' : '') + '" data-name="' + name + '" data-value="' + value + '">' +
    '<input type="radio" name="' + name + '" value="' + value + '"' + (selected ? ' checked' : '') + '>' +
    '<span>' + label + '</span></label>';
}

export function checkBtn(name, value, label, selected) {
  return '<label class="check-opt' + (selected ? ' selected' : '') + '" data-name="' + name + '" data-value="' + value + '">' +
    '<input type="checkbox" name="' + name + '" value="' + value + '"' + (selected ? ' checked' : '') + '>' +
    '<span>' + label + '</span></label>';
}

export function attachRadioHandlers(name, onChange) {
  document.querySelectorAll('.radio-opt[data-name="' + name + '"]').forEach(function(el) {
    el.addEventListener('click', function() {
      document.querySelectorAll('.radio-opt[data-name="' + name + '"]').forEach(function(other) {
        other.classList.remove('selected');
        other.querySelector('input').checked = false;
      });
      el.classList.add('selected');
      el.querySelector('input').checked = true;
      onChange(el.getAttribute('data-value'));
    });
  });
}

export function attachCheckHandlers(name, targetArray) {
  // Only the input's own 'change' listener drives state here -- a checkbox
  // click on the LABEL (the whole .check-opt, which is the intended click
  // target per its CSS) is forwarded by the browser's native label-activation
  // behavior into a real click+change on the nested <input>, so a second,
  // separate 'click' listener on the label itself double-handles a single
  // user click: one direct toggle plus one from the native change event,
  // which cancel out net-to-nothing. B25's jsdom interaction tests caught this
  // (checkbox selections silently not registering when the label body, rather
  // than the tiny native box, was clicked) -- fixed by removing the redundant
  // click-driven branch and keeping the single 'change'-driven source of truth.
  document.querySelectorAll('.check-opt[data-name="' + name + '"]').forEach(function(el) {
    el.querySelector('input').addEventListener('change', function(e) {
      var v = el.getAttribute('data-value');
      var idx = targetArray.indexOf(v);
      if (e.target.checked && idx === -1) {
        targetArray.push(v);
        el.classList.add('selected');
      } else if (!e.target.checked && idx !== -1) {
        targetArray.splice(idx, 1);
        el.classList.remove('selected');
      }
    });
  });
}

export function renderTools() {
  show('stage-tools');
  renderStepper('tools');
  var filteredTools = filterToolsForProfile(state.profile);
  el('stage-tools').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">Step 3 of 5</p>' +
      '<h1>Which AI tools does your team use?</h1>' +
      '<p class="lede">Select any tools currently in use. This is used to flag known-risky tools in your report and tailor recommendations. Skip if none apply.</p>' +
    '</div>' +

    '<div class="callout info">' +
      '<strong>How classifications work:</strong> Each tool is classified based on documented data handling defaults, published safety incidents, active litigation, and organizational control availability. Classifications are point-in-time and link to primary sources. Verify current status before restricting a tool your organization depends on.' +
    '</div>' +

    '<div class="tools-search">' +
      '<input type="text" id="tools-search" placeholder="Search tools..." />' +
    '</div>' +

    '<div id="tools-container"></div>' +

    '<div class="field-group" style="margin-top: 1.5rem;">' +
      '<label class="field-label">Add a tool not listed</label>' +
      '<div class="other-tool-input">' +
        '<input type="text" id="other-tool-input" placeholder="Tool name" />' +
        '<button id="btn-add-other">Add</button>' +
      '</div>' +
      '<div id="other-tools-display" class="other-tool-list"></div>' +
    '</div>' +

    '<div class="row" style="margin-top: 1.5rem;">' +
      '<button id="btn-back-tools">Back</button>' +
      '<div style="flex:1"></div>' +
      '<button id="btn-skip-tools">Skip</button>' +
      '<button id="btn-next-tools" class="primary">Continue</button>' +
    '</div>';

  renderToolsList(filteredTools);
  renderOtherTools();

  el('tools-search').addEventListener('input', function(e) {
    var query = e.target.value.toLowerCase();
    var results = TOOL_MASTER_LIST.filter(function(t) {
      return t.name.toLowerCase().indexOf(query) !== -1 || t.category.toLowerCase().indexOf(query) !== -1;
    });
    renderToolsList(results);
  });

  el('btn-add-other').addEventListener('click', addOtherTool);
  el('other-tool-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addOtherTool();
  });

  el('btn-back-tools').addEventListener('click', renderProfile);
  el('btn-skip-tools').addEventListener('click', renderDepth);
  el('btn-next-tools').addEventListener('click', renderDepth);
}

export function renderToolsList(tools) {
  var container = el('tools-container');
  if (tools.length === 0) {
    container.innerHTML = '<p class="empty-tools">No tools match your search. Try a different term or add it via "Add a tool not listed" below.</p>';
    return;
  }
  container.innerHTML = '<div class="tools-grid">' +
    tools.map(function(t) {
      var selected = state.toolsSelected.indexOf(t.id) !== -1;
      var badgeCls = t.classification === 'high-risk' ? 'high' : (t.classification === 'caution' ? 'caution' : 'low');
      var badgeLabel = t.classification === 'high-risk' ? 'High risk' : (t.classification === 'caution' ? 'Caution' : 'Lower risk');
      return '<label class="tool-card' + (selected ? ' selected' : '') + '" data-id="' + t.id + '">' +
        '<input type="checkbox"' + (selected ? ' checked' : '') + '>' +
        '<div class="tool-info">' +
          '<p class="tool-name">' + t.name + '<span class="tool-badge ' + badgeCls + '">' + badgeLabel + '</span></p>' +
          '<p class="tool-meta">' + t.category + '</p>' +
        '</div>' +
      '</label>';
    }).join('') +
  '</div>';

  // Only the checkbox's 'change' event drives selection -- see the identical
  // fix and rationale in attachCheckHandlers above. A separate 'click'
  // listener on the .tool-card label previously double-toggled state.toolsSelected
  // on a single real click (one direct call, one from the native label-forwarded
  // change event), which canceled out to no-op.
  document.querySelectorAll('.tool-card').forEach(function(card) {
    card.querySelector('input').addEventListener('change', function() {
      toggleTool(card.getAttribute('data-id'), card);
    });
  });
}

// Called from the checkbox's native 'change' event (see renderToolsList), so
// input.checked is already correct -- this only needs to keep
// state.toolsSelected and the card's 'selected' class in sync with it.
export function toggleTool(id, card) {
  var idx = state.toolsSelected.indexOf(id);
  if (idx === -1) {
    state.toolsSelected.push(id);
    card.classList.add('selected');
  } else {
    state.toolsSelected.splice(idx, 1);
    card.classList.remove('selected');
  }
}

export function addOtherTool() {
  var input = el('other-tool-input');
  var name = input.value.trim();
  if (!name) return;
  if (state.otherTools.indexOf(name) === -1) {
    state.otherTools.push(name);
    renderOtherTools();
  }
  input.value = '';
  input.focus();
}

export function renderOtherTools() {
  var display = el('other-tools-display');
  if (!display) return;
  display.innerHTML = state.otherTools.map(function(name, i) {
    return '<span class="other-tag">' + escapeHtml(name) +
      '<button data-idx="' + i + '" aria-label="Remove">×</button></span>';
  }).join('');
  display.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var i = parseInt(btn.getAttribute('data-idx'), 10);
      state.otherTools.splice(i, 1);
      renderOtherTools();
    });
  });
}

export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderDepth() {
  show('stage-depth');
  renderStepper('depth');
  var modules = getApplicableModules(state.profile);
  var moduleText = modules.length > 1 ?
    ' Because you\'re ' + (state.profile.orgType === 'nonprofit' ? 'a nonprofit' : '') +
    (state.profile.orgType === 'nonprofit' && state.profile.servesYouth ? ' and ' : '') +
    (state.profile.servesYouth ? 'serve people under 18' : '') +
    ', additional questions from the ' +
    (modules.filter(function(m) { return m !== 'base'; }).map(function(m) { return m === 'nonprofit' ? 'nonprofit' : 'youth-serving'; }).join(' and ')) +
    ' module' + (modules.length > 2 ? 's' : '') + ' will also apply.' : '';

  el('stage-depth').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">Step 4 of 5</p>' +
      '<h1>Pick your assessment depth</h1>' +
      '<p class="lede">All three depths return the same report structure.' + moduleText + '</p>' +
    '</div>' +

    '<div class="choice-grid" id="depth-grid">' +
      '<button class="choice" data-depth="quick">' +
        '<h3>Quick</h3>' +
        '<p class="meta">' + questionCountForDepth('quick') + ' questions, about 5 minutes</p>' +
        '<p>Directional read. Light on nuance.</p>' +
      '</button>' +
      '<button class="choice" data-depth="standard">' +
        '<h3>Standard <span class="badge">Recommended</span></h3>' +
        '<p class="meta">' + questionCountForDepth('standard') + ' questions, about 15 minutes</p>' +
        '<p>Balanced coverage across all four NIST functions.</p>' +
      '</button>' +
      '<button class="choice" data-depth="comprehensive">' +
        '<h3>Comprehensive</h3>' +
        '<p class="meta">' + questionCountForDepth('comprehensive') + ' questions, about 30 minutes</p>' +
        '<p>Most accurate. Best if preparing for a review or audit.</p>' +
      '</button>' +
    '</div>' +

    '<p id="err-depth" class="err hidden">Pick a depth to continue.</p>' +

    '<div class="row" style="margin-top: 1rem;">' +
      '<button id="btn-back-depth">Back</button>' +
      '<div style="flex:1"></div>' +
      '<button id="btn-start-quiz" class="primary" disabled>Start assessment</button>' +
    '</div>';

  document.querySelectorAll('#depth-grid .choice').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#depth-grid .choice').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      state.depth = btn.getAttribute('data-depth');
      el('btn-start-quiz').disabled = false;
    });
  });

  el('btn-back-depth').addEventListener('click', renderTools);
  el('btn-start-quiz').addEventListener('click', function() {
    if (!state.depth) {
      el('err-depth').classList.remove('hidden');
      return;
    }
    state.questions = getQuestionsForAssessment(state.profile, state.depth, state.role);
    state.idx = 0;
    state.answers = {};
    renderQuestion();
  });
}

export function questionCountForDepth(depth) {
  // B8 (2026-08-31): role included so the depth-selector's displayed count
  // matches what renderQuestion() will actually show, once role-based
  // visibility filtering applies -- otherwise this preview count could read
  // higher than the real quiz length for a filtered role.
  return getQuestionsForAssessment(state.profile, depth, state.role).length;
}

export function renderQuestion() {
  show('stage-quiz');
  renderStepper('assess');
  var q = state.questions[state.idx];
  var total = state.questions.length;
  var pct = Math.round((state.idx / total) * 100);
  var moduleLabel = q.module === 'nonprofit' ? 'Nonprofit module' : (q.module === 'youth' ? 'Youth-serving module' : FRAMEWORK.functions[q.fn].name);

  var roleCaveat = roleVisibilityCaveat(state.role, state.scope);
  var scopeBannerHtml = (state.scope.id && state.scope.id !== 'org') ?
    '<div class="callout info" style="margin-bottom: 0.75rem;"><strong>Answering for:</strong> ' + describeScope(state.scope) + '. ' +
    (state.scope.id === 'department' ? 'Answer based on what you can see at the department level — if you\'re not sure whether something exists above it, say so rather than guessing.' : 'Answer about this one system, not your organization\'s AI use in general.') +
    '</div>' : (roleCaveat ?
    '<div class="callout info" style="margin-bottom: 0.75rem;"><strong>Answering for:</strong> ' + describeScope(state.scope) + '. ' + roleCaveat + '</div>' : '');

  el('stage-quiz').innerHTML = '' +
    scopeBannerHtml +
    '<div class="qcard">' +
      '<div class="qhead">' +
        '<span>Question ' + (state.idx + 1) + ' of ' + total + '</span>' +
        '<span class="qmodule">' + moduleLabel + '</span>' +
      '</div>' +
      '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
      '<p class="qtext">' + q.text + '</p>' +
      (q.hint ? '<p class="qmeta">' + q.hint + '</p>' : '') +
      '<div class="options" id="opts">' +
        q.options.map(function(o) {
          return '<label class="opt' + (state.answers[q.id] === o.v ? ' selected' : '') + '" data-v="' + o.v + '">' +
                 '<input type="radio" name="q" value="' + o.v + '"' + (state.answers[q.id] === o.v ? ' checked' : '') + '>' +
                 '<span>' + o.label + '</span>' +
                 '</label>';
        }).join('') +
      '</div>' +
      '<p class="err hidden" id="err">Pick an answer to continue.</p>' +
      '<div class="nav">' +
        '<button id="btn-back-q"' + (state.idx === 0 ? ' disabled' : '') + '>Back</button>' +
        '<span class="spacer"></span>' +
        '<button id="btn-next-q" class="primary">' + (state.idx === total - 1 ? 'Continue' : 'Next') + '</button>' +
      '</div>' +
    '</div>';

  document.querySelectorAll('#opts .opt').forEach(function(opt) {
    opt.addEventListener('click', function() {
      var v = parseInt(opt.getAttribute('data-v'), 10);
      state.answers[q.id] = v;
      document.querySelectorAll('#opts .opt').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
      el('err').classList.add('hidden');
    });
  });

  el('btn-back-q').addEventListener('click', function() {
    if (state.idx > 0) { state.idx--; renderQuestion(); }
    else { renderDepth(); }
  });
  el('btn-next-q').addEventListener('click', function() {
    if (state.answers[q.id] === undefined) {
      el('err').classList.remove('hidden');
      return;
    }
    if (state.idx === state.questions.length - 1) {
      renderConfidence();
    } else {
      state.idx++;
      renderQuestion();
    }
  });
}

export function renderConfidence() {
  show('stage-confidence');
  renderStepper('confidence');

  el('stage-confidence').innerHTML = '' +
    '<div class="hero">' +
      '<p class="kicker">Last step</p>' +
      '<h1>How prepared do you feel?</h1>' +
      '<p class="lede">The questions you just answered are evidence-based -- they ask what you can document or point to. This part is different: it asks how prepared your organization FEELS, independent of the evidence. Answer honestly; there is no "correct" answer to select. Your report will show where perception and evidence agree or diverge.</p>' +
    '</div>' +
    CONFIDENCE_QUESTIONS.map(function(cq) {
      var selected = state.confidenceAnswers[cq.fn];
      var cqText = cq.text.replace('{subject}', scopeSubject(state.scope.id));
      return '' +
        '<div class="likert-card">' +
          '<p class="likert-fn-label">' + FRAMEWORK.functions[cq.fn].name + '</p>' +
          '<p class="likert-text">' + cqText + '</p>' +
          '<div class="likert-row" data-fn="' + cq.fn + '">' +
            LIKERT_OPTIONS.map(function(o) {
              return '<label class="likert-opt' + (selected === o.v ? ' selected' : '') + '" data-v="' + o.v + '">' +
                     '<input type="radio" name="likert-' + cq.fn + '" value="' + o.v + '"' + (selected === o.v ? ' checked' : '') + '>' +
                     '<span class="likert-v">' + o.v + '</span>' +
                     '<span class="likert-opt-label">' + o.label + '</span>' +
                     '</label>';
            }).join('') +
          '</div>' +
        '</div>';
    }).join('') +
    '<p class="err hidden" id="err-confidence">Answer all four before continuing.</p>' +
    '<div class="row" style="margin-top: 1rem;">' +
      '<button id="btn-back-confidence">Back</button>' +
      '<div style="flex:1"></div>' +
      '<button id="btn-see-report" class="primary">See report</button>' +
    '</div>';

  document.querySelectorAll('.likert-row').forEach(function(row) {
    var fn = row.getAttribute('data-fn');
    row.querySelectorAll('.likert-opt').forEach(function(opt) {
      opt.addEventListener('click', function() {
        var v = parseInt(opt.getAttribute('data-v'), 10);
        state.confidenceAnswers[fn] = v;
        row.querySelectorAll('.likert-opt').forEach(function(o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        el('err-confidence').classList.add('hidden');
      });
    });
  });

  el('btn-back-confidence').addEventListener('click', function() {
    state.idx = state.questions.length - 1;
    renderQuestion();
  });
  el('btn-see-report').addEventListener('click', function() {
    var allAnswered = CONFIDENCE_QUESTIONS.every(function(cq) { return state.confidenceAnswers[cq.fn] !== undefined; });
    if (!allAnswered) {
      el('err-confidence').classList.remove('hidden');
      return;
    }
    renderReport();
  });
}

export function renderReport() {
  show('stage-report');
  renderStepper('report');

  var scores = computeScores(state.questions, state.answers);
  var tier = computeTier(scores.overall);
  var gaps = identifyGaps(state.questions, state.answers);
  // Critical (B7): a dimension-level finding, not scope/role-framed like the
  // question-level recs below -- Ownership & Accountability's own definition
  // is inherently org-wide, so it doesn't carry a per-scope/per-role caveat
  // the way an individual question's recommendation does. Always placed
  // first, ahead of every 'high' question-level gap, per B7's own spec.
  var criticalGaps = identifyCriticalGaps(scores);
  var recs = criticalGaps.concat(
    applyRoleFraming(applyScopeFraming(buildRecommendations(gaps), state.scope), state.role, state.scope)
  ).slice(0, 8);
  var toolAnalysis = classifyToolsInUse(state.toolsSelected, state.otherTools);
  var modules = getApplicableModules(state.profile);
  var confidenceGap = computeConfidenceGap(scores, state.confidenceAnswers);

  // B10: three dimensions reported separately, never averaged into scores.overall
  // above. No dedicated report section exists yet (B14 rebuilds the report
  // properly) -- this is a deliberately lightweight surfacing so the new
  // functions are exercised and visible today, reusing existing CSS
  // (tool-badge high/caution/low for the two level-based dimensions,
  // tier-pill tier-low/tier-med/tier-high for the compliant/partial/missing
  // per-function pills) rather than adding new styling for a section B14 will
  // likely redesign anyway.
  var regulatoryExposure = computeRegulatoryExposure(state.profile);
  var toolPortfolioRisk = computeToolPortfolioRisk(state.toolsSelected, state.otherTools, state.profile);
  var frameworkCoverage = computeFrameworkCoverage(scores);

  var highCount = gaps.filter(function(g) { return g.priority === 'high'; }).length;
  var medCount = gaps.filter(function(g) { return g.priority === 'medium'; }).length;

  var confidenceNote;
  if (state.depth === 'quick') confidenceNote = 'Based on a Quick assessment. Directional only. Retake at Standard depth before acting on this.';
  else if (state.depth === 'standard') confidenceNote = 'Based on the Standard assessment. Solid enough for planning; take Comprehensive if preparing for an audit or vendor review.';
  else confidenceNote = 'Based on the Comprehensive assessment. Highest confidence.';

  var industryLabel = state.profile.industry ? INDUSTRIES.find(function(i) { return i.id === state.profile.industry; }).label : '';
  var scopeText = buildScopeText(state.profile, modules);

  var html = '' +
    '<div class="hero"><p class="kicker">Your report</p><h1>AI governance readiness</h1>' +
    '<p class="lede">Based on the NIST AI Risk Management Framework' + (industryLabel ? ', tailored for ' + industryLabel : '') + '.</p></div>';

  var scopeDeclaration = describeScope(state.scope);
  var scopeDeclarationNote = state.scope.id === 'department'
    ? ' Findings and recommendations below are scoped to this department; org-wide governance may exist above it and is not assessed here.'
    : state.scope.id === 'initiative'
    ? ' Findings and recommendations below are scoped to this one system, framed as a pre-deployment review rather than an organization-wide assessment.'
    : '';
  html += '<div class="scope-banner"><strong>Assessment scope:</strong> ' + scopeDeclaration + '.' + scopeDeclarationNote + '</div>';

  var roleDeclaration = describeRole(state.role);
  if (roleDeclaration) {
    html += '<div class="scope-banner"><strong>Answered by:</strong> ' + roleDeclaration + '.</div>';
  }

  if (scopeText) {
    html += '<div class="scope-banner"><strong>What\'s in this report:</strong> ' + scopeText + '</div>';
  }

  html += '<div class="stat-grid">' +
    '<div class="stat"><p class="stat-label">Overall readiness</p><p class="stat-value">' + scores.overall + '%</p></div>' +
    '<div class="stat"><p class="stat-label">Risk tier</p><p class="stat-value small"><span class="tier-pill ' + tier.cssClass + '">' + tier.label + '</span></p></div>' +
    '<div class="stat"><p class="stat-label">Critical gaps</p><p class="stat-value">' + highCount + '</p></div>' +
    '<div class="stat"><p class="stat-label">Moderate gaps</p><p class="stat-value">' + medCount + '</p></div>' +
  '</div>';

  html += '<div class="callout">' + tier.desc + '</div>';

  // Tool review section (new in v2)
  if (state.toolsSelected.length > 0 || state.otherTools.length > 0) {
    html += '<div class="section"><h2>AI tools currently in use</h2>' + renderToolReview(toolAnalysis) + '</div>';
  }

  // Gap map
  html += '<div class="section"><h2>Gap map across NIST functions</h2><div class="fn-grid">' +
    Object.keys(FRAMEWORK.functions).map(function(k) {
      var s = scores.fnScores[k];
      var pct = s.max === 0 ? 0 : Math.round((s.sum / s.max) * 100);
      return '<div class="fn"><div class="fn-top"><h3>' + FRAMEWORK.functions[k].name + '</h3><span class="fn-score">' + pct + '%</span></div>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<p class="fn-desc">' + FRAMEWORK.functions[k].desc + '</p></div>';
    }).join('') + '</div></div>';

  // Self-perception vs. evidence (parallel confidence layer, kept separate from the evidence-based score above)
  var overconfidentFns = Object.keys(confidenceGap).filter(function(k) { return confidenceGap[k].status === 'overconfident'; });
  html += '<div class="section"><h2>Self-perception vs. evidence</h2>' +
    '<p class="qmeta" style="margin-bottom:12px;">The evidence score above reflects what you documented. This asks how prepared you said you FEEL, collected separately so it can not just echo the evidence answers back. A large gap in either direction is itself a finding.</p>' +
    (overconfidentFns.length > 0 ?
      '<div class="callout warning"><strong>Confidence outpaces evidence in ' + overconfidentFns.map(function(k) { return FRAMEWORK.functions[k].name; }).join(' and ') + '.</strong> Your team feels more prepared here than the evidence supports — often the riskiest kind of gap, since it rarely draws attention on its own.</div>' : '') +
    '<div class="fn-grid">' +
    Object.keys(FRAMEWORK.functions).map(function(k) {
      var g = confidenceGap[k];
      var badgeLabel = g.status === 'overconfident' ? 'Feels more ready than evidence shows' :
                        g.status === 'underconfident' ? 'Evidence stronger than it feels' :
                        g.status === 'aligned' ? 'Perception matches evidence' : 'Not enough data';
      return '<div class="fn"><div class="fn-top"><h3>' + FRAMEWORK.functions[k].name + '</h3>' +
        (g.status !== 'unknown' ? '<span class="gap-badge ' + g.status + '">' + badgeLabel + '</span>' : '') + '</div>' +
        '<div class="fn-compare-row"><span class="fn-compare-label">Evidence</span><div class="bar"><span style="width:' + (g.evidencePct || 0) + '%"></span></div><span>' + (g.evidencePct !== null ? g.evidencePct + '%' : '—') + '</span></div>' +
        '<div class="fn-compare-row"><span class="fn-compare-label">Confidence</span><div class="bar confidence"><span style="width:' + (g.confidencePct || 0) + '%"></span></div><span>' + (g.confidencePct !== null ? g.confidencePct + '%' : '—') + '</span></div>' +
        '</div>';
    }).join('') + '</div></div>';

  // B10: Regulatory Exposure, Tool Portfolio Risk, Framework Coverage --
  // reported separately, never folded into the readiness score above. A
  // lightweight preview ahead of B14's proper report rebuild (see the
  // comment where these are computed, above).
  var levelBadgeCls = function(level) { return level === 'high' ? 'high' : (level === 'medium' ? 'caution' : (level === 'low' ? 'low' : '')); };
  var levelBadgeLabel = function(level) { return level === 'high' ? 'High' : (level === 'medium' ? 'Medium' : (level === 'low' ? 'Low' : 'Info')); };
  var coverageTierCls = function(status) { return status === 'compliant' ? 'tier-low' : (status === 'partial' ? 'tier-med' : 'tier-high'); };
  var coverageLabel = function(status) { return status === 'compliant' ? 'Compliant' : (status === 'partial' ? 'Partial' : 'Missing'); };

  html += '<div class="section"><h2>Regulatory &amp; portfolio context</h2>' +
    '<p class="qmeta" style="margin-bottom:12px;">Reported separately from the readiness score above -- these describe exposure and coverage, not governance maturity, and are never averaged into it.</p>' +

    '<p class="b10-label" style="margin-bottom:6px;">Regulatory exposure ' +
      (regulatoryExposure.level !== 'info' ? '<span class="tool-badge ' + levelBadgeCls(regulatoryExposure.level) + '">' + levelBadgeLabel(regulatoryExposure.level) + '</span>' : '') +
    '</p>' +
    (regulatoryExposure.factors.length === 0 ? '<p class="qmeta">No jurisdiction, industry, or data-type factors currently on file.</p>' :
      '<ul class="phase ul" style="margin:0 0 12px; padding-left:18px; font-size:13px; color:var(--text-secondary);">' +
        // Show label + detail together -- label alone is often too generic
        // ("Industry-specific regulation") to carry the actual citation, and
        // detail alone drops the short heading. Skip the redundant repeat
        // when they're identical (the simpler regulated-data-type factors).
        regulatoryExposure.factors.map(function(f) {
          return '<li>' + (f.label === f.detail ? f.detail : '<strong>' + f.label + ':</strong> ' + f.detail) + '</li>';
        }).join('') +
      '</ul>') +

    '<p class="b10-label" style="margin-bottom:6px;">Tool portfolio risk <span class="tool-badge ' + levelBadgeCls(toolPortfolioRisk.level) + '">' + levelBadgeLabel(toolPortfolioRisk.level) + '</span></p>' +
    '<p class="qmeta" style="margin-bottom:12px;">' + toolPortfolioRisk.highRiskCount + ' high-risk, ' + toolPortfolioRisk.cautionCount + ' caution, ' + toolPortfolioRisk.lowerRiskCount + ' lower-risk, ' + toolPortfolioRisk.unclassifiedCount + ' unclassified.' + (toolPortfolioRisk.dataSensitive ? ' Weighted up for declared sensitive data types.' : '') + '</p>' +

    '<p class="b10-label" style="margin-bottom:6px;">Framework coverage (by NIST function)</p>' +
    '<div class="fn-grid">' +
    Object.keys(FRAMEWORK.functions).map(function(k) {
      var c = frameworkCoverage[k];
      return '<div class="fn"><div class="fn-top"><h3>' + FRAMEWORK.functions[k].name + '</h3>' +
        '<span class="tier-pill ' + coverageTierCls(c.status) + '">' + coverageLabel(c.status) + '</span></div>' +
        '<p class="fn-desc">' + (c.pct !== null ? c.pct + '%' : 'No data') + '</p></div>';
    }).join('') + '</div>' +
  '</div>';

  // Recommendations
  html += '<div class="section"><h2>Prioritized recommendations</h2>' +
    (recs.length === 0 ? '<div class="callout">You have strong foundations. Lock in a quarterly review to keep governance current.</div>' :
    recs.map(function(r) {
      var cls = r.priority === 'critical' ? 'prio-critical' : (r.priority === 'high' ? 'prio-high' : (r.priority === 'medium' ? 'prio-med' : 'prio-low'));
      var plabel = r.priority === 'critical' ? 'Critical' : (r.priority === 'high' ? 'High priority' : (r.priority === 'medium' ? 'Medium priority' : 'Maintain'));
      var moduleTag = r.module !== 'base' ? ' • ' + (r.module === 'nonprofit' ? 'Nonprofit module' : 'Youth-serving module') : '';
      return '<div class="rec"><div class="rec-head"><p class="rec-title">' + r.title + '</p>' +
        '<span class="' + cls + '">' + plabel + '</span></div>' +
        '<p class="rec-meta">' + FRAMEWORK.functions[r.fn].name + ' function' + moduleTag + '</p>' +
        '<p class="rec-body">' + r.body + '</p></div>';
    }).join('')) + '</div>';

  // Roadmap. "Close critical gaps" (Next 90 days) includes both the new B7
  // critical-priority entry and question-level high-priority gaps -- recs is
  // already critical-first (see above), so slice(0,3) naturally keeps a
  // critical entry in this phase rather than getting displaced by highs.
  var high = recs.filter(function(r) { return r.priority === 'critical' || r.priority === 'high'; }).slice(0, 3);
  var med = recs.filter(function(r) { return r.priority === 'medium'; }).slice(0, 3);
  html += '<div class="section"><h2>Maturity roadmap</h2><div class="roadmap">' +
    '<div class="phase"><p class="plabel">Next 90 days</p><h4>Close critical gaps</h4><ul>' +
      (high.length ? high.map(function(r) { return '<li>' + r.title + '</li>'; }).join('') : '<li>No critical gaps.</li>') +
    '</ul></div>' +
    '<div class="phase"><p class="plabel">3 to 6 months</p><h4>Build the operating rhythm</h4><ul>' +
      (med.length ? med.map(function(r) { return '<li>' + r.title + '</li>'; }).join('') : '<li>Establish quarterly review.</li>') +
    '</ul></div>' +
    '<div class="phase"><p class="plabel">6 to 12 months</p><h4>Formalize and prove</h4>' +
      '<ul><li>Establish a quarterly governance review</li><li>Document a lightweight AI incident playbook</li><li>Add AI risk to standard vendor onboarding</li></ul>' +
    '</div></div></div>';

  html += '<div class="row" style="margin-top: 1.5rem;">' +
    '<button id="btn-restart">Start over</button>' +
    '<div style="flex:1"></div>' +
    '<button id="btn-print" class="primary">Print or save as PDF</button>' +
  '</div>';

  html += '<p class="disclaimer"><strong>About this tool.</strong> Built on the NIST AI Risk Management Framework (Govern, Map, Measure, Manage). Confidence: ' + confidenceNote + ' Tool classifications are point-in-time (last reviewed April 2026) and criteria-based. This is a self-assessment for internal planning, not a compliance certification or legal advice.</p>';

  el('stage-report').innerHTML = html;

  el('btn-restart').addEventListener('click', function() {
    resetState();
    renderIntro();
  });
  el('btn-print').addEventListener('click', function() { window.print(); });
}

export function renderToolReview(analysis) {
  var html = '';
  if (analysis.flagged['high-risk'].length > 0) {
    html += '<div class="callout warning"><strong>High-risk tools flagged in your inventory.</strong> These tools have documented safety incidents, active litigation, or fundamental absence of organizational controls. Consider restricting use.</div>';
    analysis.flagged['high-risk'].forEach(function(t) {
      html += renderToolCard(t);
    });
  }
  if (analysis.flagged['caution'].length > 0) {
    html += '<p style="font-size: 13px; color: var(--text-secondary); margin: 1rem 0 0.5rem;"><strong>Tools requiring caution.</strong> These have settings that should be verified before organizational use.</p>';
    analysis.flagged['caution'].forEach(function(t) {
      html += renderToolCard(t);
    });
  }
  if (analysis.flagged['lower-risk'].length > 0) {
    html += '<p style="font-size: 13px; color: var(--text-secondary); margin: 1rem 0 0.5rem;"><strong>Lower-risk tools in your inventory.</strong></p>';
    analysis.flagged['lower-risk'].forEach(function(t) {
      html += renderToolCard(t);
    });
  }
  if (analysis.otherTools.length > 0) {
    html += '<p style="font-size: 13px; color: var(--text-secondary); margin: 1rem 0 0.5rem;"><strong>Tools not in our reviewed list.</strong> Not classified by this tool. Review independently.</p>';
    html += '<div style="display: flex; gap: 6px; flex-wrap: wrap;">' +
      analysis.otherTools.map(function(name) {
        return '<span class="other-tag">' + escapeHtml(name) + '</span>';
      }).join('') + '</div>';
  }
  return html;
}

export function renderToolCard(t) {
  return '<div class="tool-review">' +
    '<div class="tool-review-head">' +
      '<p class="tool-review-name">' + t.name + '</p>' +
      '<span class="tool-badge ' + (t.classification === 'high-risk' ? 'high' : (t.classification === 'caution' ? 'caution' : 'low')) + '">' +
        (t.classification === 'high-risk' ? 'High risk' : (t.classification === 'caution' ? 'Caution' : 'Lower risk')) +
      '</span>' +
    '</div>' +
    '<p class="tool-review-body">' + t.reasoning + '</p>' +
    '<p class="tool-review-sources">Sources: ' + t.sources.join('; ') + ' • Last reviewed: ' + t.lastReviewed + '</p>' +
  '</div>';
}

export function buildScopeText(profile, modules) {
  var parts = ['NIST AI Risk Management Framework (base assessment)'];
  if (modules.indexOf('nonprofit') !== -1) parts.push('Nonprofit module (based on validated consulting work)');
  if (modules.indexOf('youth') !== -1) parts.push('Youth-serving module (COPPA and safeguards, based on validated consulting work)');
  var text = parts.join(', ') + '.';
  if (profile.industry && ['healthcare','financial','education','government'].indexOf(profile.industry) !== -1) {
    var industryLabel = INDUSTRIES.find(function(i) { return i.id === profile.industry; }).label;
    text += ' Industry-specific overlays for ' + industryLabel + ' are on the roadmap and not yet included in this version. The base assessment applies but does not cover sector-specific regulations (e.g., HIPAA for healthcare, SR 11-7 for financial services, FERPA for education, FedRAMP for government).';
  }
  return text;
}

// Single entry point -- index.html calls this once on load, replacing the
// bare `renderIntro();` call this module was extracted from.
export function mountApp() {
  renderIntro();
}
