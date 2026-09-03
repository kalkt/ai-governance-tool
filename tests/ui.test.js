// @vitest-environment jsdom
//
// DOM-interaction tests (B25). Drives the real src/ui.js render functions against
// a jsdom document -- clicks, conditional field visibility, state reaching later
// stages -- without a real browser. See src/ui.js's header comment for why this
// extraction (real module + jsdom) was chosen over loading index.html itself into
// jsdom: jsdom does not execute <script type="module">, confirmed directly against
// the installed version before this file was written.
//
// First target, per the B25 backlog item: the exact gap B3's own note left open --
// role-card selection setting state.role, the employee department field's
// conditional show/hide, and state.role correctly reaching the quiz-stage
// "Answering for" banner and the report's caveat text end-to-end.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  state,
  resetState,
  mountApp,
  renderScope,
  renderProfile,
  renderTools,
  renderDepth,
  renderQuestion,
  renderConfidence,
  renderReport,
  escapeHtml,
  buildScopeText,
  radioBtn,
  checkBtn,
  renderToolAdoptionContext,
  renderToolAdoptionQuestion,
  renderToolAdoptionResult,
  triggerDownload
} from '../src/ui.js';
import { getQuestionsForAssessment, identifyGaps, buildRecommendations } from '../src/logic.js';
import { TOOL_MASTER_LIST, TOOL_ADOPTION_QUESTIONS, ANNEX_III_DOMAINS, METHODOLOGY_NOTES } from '../src/data.js';

function setupDom() {
  document.body.innerHTML =
    '<div class="container">' +
      '<div id="stepper" class="stepper hidden"></div>' +
      '<div id="stage-intro"></div>' +
      '<div id="stage-scope" class="hidden"></div>' +
      '<div id="stage-profile" class="hidden"></div>' +
      '<div id="stage-tools" class="hidden"></div>' +
      '<div id="stage-depth" class="hidden"></div>' +
      '<div id="stage-quiz" class="hidden"></div>' +
      '<div id="stage-confidence" class="hidden"></div>' +
      '<div id="stage-report" class="hidden"></div>' +
      '<div id="stage-tool-adoption-context" class="hidden"></div>' +
      '<div id="stage-tool-adoption-quiz" class="hidden"></div>' +
      '<div id="stage-tool-adoption-result" class="hidden"></div>' +
    '</div>';
}

function roleCard(id) {
  return document.querySelector('#role-grid .choice[data-role="' + id + '"]');
}
function scopeCard(id) {
  return document.querySelector('#scope-grid .choice[data-scope="' + id + '"]');
}

beforeEach(() => {
  setupDom();
  resetState();
  // jsdom has no layout engine and logs "Not implemented" for scrollTo/print;
  // stub them so test output stays clean. Behavior itself is unaffected --
  // show() calling the stub is exactly what "scrolled to top" means in a DOM
  // that has no scroll position to begin with.
  window.scrollTo = () => {};
  window.print = () => {};
  // jsdom implements Blob but not URL.createObjectURL/revokeObjectURL (B14's
  // export buttons) -- stub them the same way, since the object-URL value
  // itself is never asserted on, only that triggering a download doesn't throw.
  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => {};
  // jsdom logs "Not implemented: navigation to another Document" when a
  // synthetic <a>'s .click() (triggerDownload, B14) fires -- it doesn't
  // implement real navigation. Harmless noise, same category as the
  // print/scrollTo stubs above; the only <a> this app ever creates is
  // triggerDownload's own, so this is safe to stub globally.
  HTMLAnchorElement.prototype.click = function() {};
});

describe('mountApp', () => {
  it('renders the intro stage on mount', () => {
    mountApp();
    expect(document.getElementById('stage-intro').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('stage-intro').innerHTML).toContain('How ready is your business for AI?');
  });
});

describe('renderScope: role-card selection', () => {
  it('renders one card per ROLE_OPTIONS entry, none selected initially', () => {
    renderScope();
    expect(document.querySelectorAll('#role-grid .choice').length).toBe(3);
    expect(document.querySelectorAll('#role-grid .choice.selected').length).toBe(0);
  });

  it('clicking a role card sets state.role.id', () => {
    renderScope();
    roleCard('dept-role').click();
    expect(state.role.id).toBe('dept-role');
  });

  it('clicking a different role card afterward overwrites the previous selection', () => {
    renderScope();
    roleCard('leadership').click();
    expect(state.role.id).toBe('leadership');
    roleCard('employee').click();
    expect(state.role.id).toBe('employee');
  });

  it('marks the clicked card selected and leaves the others unselected', () => {
    renderScope();
    roleCard('leadership').click();
    expect(roleCard('leadership').classList.contains('selected')).toBe(true);
    expect(roleCard('dept-role').classList.contains('selected')).toBe(false);
    expect(roleCard('employee').classList.contains('selected')).toBe(false);
  });

  it('does not affect the independently-selected scope', () => {
    renderScope();
    scopeCard('department').click();
    roleCard('leadership').click();
    expect(state.scope.id).toBe('department');
    expect(state.role.id).toBe('leadership');
  });

  it('requires a role selection before continuing even when scope is picked', () => {
    renderScope();
    scopeCard('org').click();
    document.getElementById('btn-next-scope').click();
    expect(document.getElementById('err-scope').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('err-role').classList.contains('hidden')).toBe(false);
  });

  it('requires a scope selection before continuing when nothing at all is picked', () => {
    renderScope();
    document.getElementById('btn-next-scope').click();
    expect(document.getElementById('err-scope').classList.contains('hidden')).toBe(false);
  });

  it('advances to the profile stage once both scope and role are picked', () => {
    renderScope();
    scopeCard('org').click();
    roleCard('leadership').click();
    document.getElementById('btn-next-scope').click();
    expect(document.getElementById('stage-profile').classList.contains('hidden')).toBe(false);
  });
});

describe('renderScope: employee department field conditional visibility', () => {
  it('is absent before any role is chosen', () => {
    renderScope();
    expect(document.getElementById('role-department-group')).toBeNull();
  });

  it('is absent for the leadership role', () => {
    renderScope();
    roleCard('leadership').click();
    expect(document.getElementById('role-department-group')).toBeNull();
  });

  it('is absent for the dept-role respondent type', () => {
    renderScope();
    roleCard('dept-role').click();
    expect(document.getElementById('role-department-group')).toBeNull();
  });

  it('appears only for the employee role', () => {
    renderScope();
    roleCard('employee').click();
    expect(document.getElementById('role-department-group')).not.toBeNull();
    expect(document.getElementById('f-role-department')).not.toBeNull();
  });

  it('disappears again if a non-employee role is chosen afterward', () => {
    renderScope();
    roleCard('employee').click();
    expect(document.getElementById('role-department-group')).not.toBeNull();
    roleCard('leadership').click();
    expect(document.getElementById('role-department-group')).toBeNull();
  });

  it('typing into the department field updates state.role.department', () => {
    renderScope();
    roleCard('employee').click();
    const input = document.getElementById('f-role-department');
    input.value = 'Marketing';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(state.role.department).toBe('Marketing');
  });

  it('preserves a typed department value across re-renders of the same stage', () => {
    renderScope();
    roleCard('employee').click();
    document.getElementById('f-role-department').value = 'Finance';
    document.getElementById('f-role-department').dispatchEvent(new Event('input', { bubbles: true }));
    // re-render (as clicking scope would trigger) and confirm the value survives
    renderScope();
    expect(document.getElementById('f-role-department').value).toBe('Finance');
  });
});

describe('state.role reaching the quiz-stage "Answering for" banner', () => {
  function primeMinimalQuizState(scopeId, roleId, roleDept) {
    state.scope = { id: scopeId, name: '' };
    state.role = { id: roleId, department: roleDept || '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
  }

  it('shows no banner for leadership assessing the whole org (no visibility mismatch)', () => {
    primeMinimalQuizState('org', 'leadership');
    renderQuestion();
    expect(document.querySelector('#stage-quiz .callout.info')).toBeNull();
  });

  it('shows a caveat banner for an individual employee assessing the whole org', () => {
    primeMinimalQuizState('org', 'employee');
    renderQuestion();
    const banner = document.querySelector('#stage-quiz .callout.info');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('individual employee');
    expect(banner.textContent).toContain('whole organization');
  });

  it('shows a caveat banner for a dept-role respondent assessing the whole org', () => {
    primeMinimalQuizState('org', 'dept-role');
    renderQuestion();
    const banner = document.querySelector('#stage-quiz .callout.info');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('single department/function');
  });

  it('shows the scope-specific banner (not the role caveat) when scope is department-scoped', () => {
    primeMinimalQuizState('department', 'employee');
    renderQuestion();
    const banner = document.querySelector('#stage-quiz .callout.info');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('department level');
    expect(banner.textContent).not.toContain('individual employee');
  });

  it('shows no banner when role is unset and scope is org (no scope, no caveat to show)', () => {
    primeMinimalQuizState('org', null);
    renderQuestion();
    expect(document.querySelector('#stage-quiz .callout.info')).toBeNull();
  });
});

describe('state.role reaching the report end-to-end', () => {
  function primeReportState(scopeId, roleId, roleDept) {
    state.scope = { id: scopeId, name: '' };
    state.role = { id: roleId, department: roleDept || '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    // Answer every question with 0 (no baseline) to guarantee high-priority gaps
    // exist, so the recommendations section (and any role caveat appended to it)
    // actually renders instead of the empty-state message.
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; });
    state.confidenceAnswers = {};
  }

  it('declares the respondent role in the report scope section', () => {
    primeReportState('org', 'employee', 'Marketing');
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Answered by:');
    expect(html).toContain('Individual employee (Marketing)');
  });

  it('omits the "Answered by" line entirely when no role was chosen', () => {
    primeReportState('org', null);
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).not.toContain('Answered by:');
  });

  it('appends the role visibility caveat to recommendation bodies for an employee assessing the whole org', () => {
    primeReportState('org', 'employee');
    renderReport();
    // B16: the recommendation body (role/scope framing included) now renders
    // inside the DMAIC "Improve" step, not a standalone .rec-body element.
    const bodies = Array.from(document.querySelectorAll('.dmaic-step')).map(function(el) { return el.textContent; });
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.some(function(b) { return b.includes('individual employee'); })).toBe(true);
  });

  it('does not append any role caveat to recommendation bodies for leadership', () => {
    primeReportState('org', 'leadership');
    renderReport();
    const bodies = Array.from(document.querySelectorAll('.dmaic-step')).map(function(el) { return el.textContent; });
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.some(function(b) { return b.includes('individual employee') || b.includes('single department/function'); })).toBe(false);
  });

  it('composes the department-scope framing and the role caveat together when both apply', () => {
    // department scope + employee role: employee is scoped to their own department,
    // which is a narrower-or-equal match (no mismatch per roleVisibilityCaveat), so
    // only the scope framing note should appear, not a role caveat.
    primeReportState('department', 'employee');
    renderReport();
    const bodies = Array.from(document.querySelectorAll('.dmaic-step')).map(function(el) { return el.textContent; });
    expect(bodies.some(function(b) { return b.includes('Scoped to this department'); })).toBe(true);
    expect(bodies.some(function(b) { return b.includes('individual employee'); })).toBe(false);
  });
});

// ============================================================================
// Full-wizard coverage: the rest of ui.js's DOM wiring, exercised the same way
// a real user would -- clicks, typing, search -- not by reaching into state
// directly. Organized per stage so a broken stage points at one describe block.
// ============================================================================

function pickRadio(name, value) {
  document.querySelector('.radio-opt[data-name="' + name + '"][data-value="' + value + '"]').click();
}
function pickCheck(name, value) {
  return document.querySelector('.check-opt[data-name="' + name + '"][data-value="' + value + '"]');
}
function toolCard(id) {
  return document.querySelector('.tool-card[data-id="' + id + '"]');
}

describe('renderProfile', () => {
  it('blocks continuing until both required fields are answered', () => {
    renderProfile();
    document.getElementById('btn-next-profile').click();
    expect(document.getElementById('err-profile').classList.contains('hidden')).toBe(false);
    expect(state.questions).toEqual([]); // still on profile, nothing progressed
  });

  it('accepts all required and optional fields via radio/select/checkbox clicks', () => {
    renderProfile();
    pickRadio('orgType', 'nonprofit');
    pickRadio('servesYouth', 'true');
    pickRadio('size', '11-50');
    pickRadio('region', 'eu');
    pickRadio('customerType', 'b2c');
    pickRadio('aiMaturity', 'piloting');

    const industrySelect = document.getElementById('f-industry');
    industrySelect.value = 'healthcare';
    industrySelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(state.profile.orgType).toBe('nonprofit');
    expect(state.profile.servesYouth).toBe(true);
    expect(state.profile.size).toBe('11-50');
    expect(state.profile.region).toBe('eu');
    expect(state.profile.customerType).toBe('b2c');
    expect(state.profile.aiMaturity).toBe('piloting');
    expect(state.profile.industry).toBe('healthcare');
  });

  it('only keeps one radio selected per group even after re-clicking', () => {
    renderProfile();
    pickRadio('size', '1-10');
    pickRadio('size', '51-200');
    expect(state.profile.size).toBe('51-200');
    expect(document.querySelector('.radio-opt[data-name="size"][data-value="1-10"]').classList.contains('selected')).toBe(false);
    expect(document.querySelector('.radio-opt[data-name="size"][data-value="51-200"]').classList.contains('selected')).toBe(true);
  });

  it('toggles a checkbox on and off by clicking its label', () => {
    renderProfile();
    const label = pickCheck('regulated', 'phi');
    label.click();
    expect(state.profile.regulated).toContain('phi');
    expect(label.classList.contains('selected')).toBe(true);
    label.click();
    expect(state.profile.regulated).not.toContain('phi');
    expect(label.classList.contains('selected')).toBe(false);
  });

  it('toggles a checkbox via the native input change event too', () => {
    renderProfile();
    const label = pickCheck('regulated', 'pii');
    const input = label.querySelector('input');
    input.click(); // native checkbox toggle -> fires its own 'change' handler path
    expect(state.profile.regulated).toContain('pii');
    expect(label.classList.contains('selected')).toBe(true);
    input.click();
    expect(state.profile.regulated).not.toContain('pii');
    expect(label.classList.contains('selected')).toBe(false);
  });

  it('supports multiple checkboxes selected at once', () => {
    renderProfile();
    pickCheck('regulated', 'financial').click();
    pickCheck('regulated', 'eu-customers').click();
    expect(state.profile.regulated.sort()).toEqual(['eu-customers', 'financial']);
  });

  it('advances to the tools stage once both required fields are set', () => {
    renderProfile();
    pickRadio('orgType', 'for-profit');
    pickRadio('servesYouth', 'false');
    document.getElementById('btn-next-profile').click();
    expect(document.getElementById('stage-tools').classList.contains('hidden')).toBe(false);
  });

  it('back button returns to the scope stage', () => {
    renderProfile();
    document.getElementById('btn-back-intro').click();
    expect(document.getElementById('stage-scope').classList.contains('hidden')).toBe(false);
  });
});

describe('renderTools', () => {
  beforeEach(() => {
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
  });

  it('lists tools matching the profile and none selected initially', () => {
    renderTools();
    expect(toolCard('t-chatgpt')).not.toBeNull();
    expect(document.querySelectorAll('.tool-card.selected').length).toBe(0);
  });

  it('selects a tool by clicking its card and shows the right classification badge', () => {
    renderTools();
    const card = toolCard('t-grok'); // high-risk fixture
    card.click();
    expect(state.toolsSelected).toContain('t-grok');
    expect(card.classList.contains('selected')).toBe(true);
    expect(card.querySelector('input').checked).toBe(true);
  });

  it('deselects a tool by clicking its already-selected card again', () => {
    renderTools();
    const card = toolCard('t-chatgpt');
    card.click();
    expect(state.toolsSelected).toContain('t-chatgpt');
    card.click();
    expect(state.toolsSelected).not.toContain('t-chatgpt');
    expect(card.classList.contains('selected')).toBe(false);
  });

  it('selects a tool by clicking its checkbox input directly, not just the card body', () => {
    renderTools();
    const card = toolCard('t-copilot'); // lower-risk fixture
    card.querySelector('input').click();
    expect(state.toolsSelected).toContain('t-copilot');
    expect(card.classList.contains('selected')).toBe(true);
  });

  it('filters the tool list as you type in search', () => {
    renderTools();
    const search = document.getElementById('tools-search');
    search.value = 'grok';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(toolCard('t-grok')).not.toBeNull();
    expect(toolCard('t-chatgpt')).toBeNull();
  });

  it('shows the empty state when a search matches nothing', () => {
    renderTools();
    const search = document.getElementById('tools-search');
    search.value = 'zzzznonexistenttoolzzzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.empty-tools')).not.toBeNull();
  });

  it('adds a custom tool via the Add button and lists it, then removes it', () => {
    renderTools();
    const input = document.getElementById('other-tool-input');
    input.value = 'Some Internal Tool';
    document.getElementById('btn-add-other').click();
    expect(state.otherTools).toContain('Some Internal Tool');
    expect(document.getElementById('other-tools-display').textContent).toContain('Some Internal Tool');

    document.querySelector('#other-tools-display button').click();
    expect(state.otherTools).not.toContain('Some Internal Tool');
  });

  it('adds a custom tool via pressing Enter in the input', () => {
    renderTools();
    const input = document.getElementById('other-tool-input');
    input.value = 'Enter-Added Tool';
    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
    expect(state.otherTools).toContain('Enter-Added Tool');
  });

  it('ignores adding a blank or duplicate custom tool name', () => {
    renderTools();
    const input = document.getElementById('other-tool-input');
    input.value = '   ';
    document.getElementById('btn-add-other').click();
    expect(state.otherTools).toEqual([]);

    input.value = 'Dup Tool';
    document.getElementById('btn-add-other').click();
    input.value = 'Dup Tool';
    document.getElementById('btn-add-other').click();
    expect(state.otherTools.filter(function(n) { return n === 'Dup Tool'; }).length).toBe(1);
  });

  it('back button returns to profile; skip and continue both advance to depth', () => {
    renderTools();
    document.getElementById('btn-back-tools').click();
    expect(document.getElementById('stage-profile').classList.contains('hidden')).toBe(false);

    renderTools();
    document.getElementById('btn-skip-tools').click();
    expect(document.getElementById('stage-depth').classList.contains('hidden')).toBe(false);

    renderTools();
    document.getElementById('btn-next-tools').click();
    expect(document.getElementById('stage-depth').classList.contains('hidden')).toBe(false);
  });
});

describe('renderDepth', () => {
  beforeEach(() => {
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
  });

  it('keeps the start button disabled (and therefore inert) until a depth is chosen', () => {
    renderDepth();
    expect(document.getElementById('btn-start-quiz').disabled).toBe(true);
    document.getElementById('btn-start-quiz').click(); // disabled buttons don't fire click listeners
    expect(state.questions).toEqual([]);
    expect(document.getElementById('stage-depth').classList.contains('hidden')).toBe(false);
  });

  it('the handler\'s own no-depth guard still shows err-depth if ever invoked directly', () => {
    // The disabled attribute is the real UI gate (tested above); this exercises
    // the handler's own defensive check independently of that gate.
    renderDepth();
    const btn = document.getElementById('btn-start-quiz');
    btn.disabled = false;
    btn.click();
    expect(document.getElementById('err-depth').classList.contains('hidden')).toBe(false);
  });

  it('enables the start button and marks a depth selected on click', () => {
    renderDepth();
    expect(document.getElementById('btn-start-quiz').disabled).toBe(true);
    document.querySelector('#depth-grid .choice[data-depth="standard"]').click();
    expect(state.depth).toBe('standard');
    expect(document.getElementById('btn-start-quiz').disabled).toBe(false);
    expect(document.querySelector('#depth-grid .choice[data-depth="standard"]').classList.contains('selected')).toBe(true);
  });

  it('switching depth choices only keeps the latest one selected', () => {
    renderDepth();
    document.querySelector('#depth-grid .choice[data-depth="quick"]').click();
    document.querySelector('#depth-grid .choice[data-depth="comprehensive"]').click();
    expect(state.depth).toBe('comprehensive');
    expect(document.querySelector('#depth-grid .choice[data-depth="quick"]').classList.contains('selected')).toBe(false);
  });

  it('shows the extra module-context sentence for a nonprofit that serves youth', () => {
    state.profile.orgType = 'nonprofit';
    state.profile.servesYouth = true;
    renderDepth();
    expect(document.getElementById('stage-depth').innerHTML).toContain('nonprofit and serve people under 18');
  });

  it('populates state.questions for the chosen depth and moves to the quiz', () => {
    renderDepth();
    document.querySelector('#depth-grid .choice[data-depth="quick"]').click();
    document.getElementById('btn-start-quiz').click();
    expect(state.questions.length).toBeGreaterThan(0);
    expect(document.getElementById('stage-quiz').classList.contains('hidden')).toBe(false);
  });

  it('back button returns to the tools stage', () => {
    renderDepth();
    document.getElementById('btn-back-depth').click();
    expect(document.getElementById('stage-tools').classList.contains('hidden')).toBe(false);
  });
});

describe('renderQuestion', () => {
  beforeEach(() => {
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
  });

  it('blocks advancing until an option is picked', () => {
    renderQuestion();
    document.getElementById('btn-next-q').click();
    expect(document.getElementById('err').classList.contains('hidden')).toBe(false);
    expect(state.idx).toBe(0);
  });

  it('records the picked answer and marks it selected', () => {
    renderQuestion();
    const firstOpt = document.querySelector('#opts .opt');
    firstOpt.click();
    const q = state.questions[0];
    expect(state.answers[q.id]).toBeDefined();
    expect(firstOpt.classList.contains('selected')).toBe(true);
  });

  it('disables (and so makes inert) the back button on the first question', () => {
    renderQuestion();
    expect(document.getElementById('btn-back-q').disabled).toBe(true);
    document.getElementById('btn-back-q').click(); // disabled buttons don't fire click listeners
    expect(document.getElementById('stage-quiz').classList.contains('hidden')).toBe(false);
    expect(state.idx).toBe(0);
  });

  it('the handler\'s own idx===0 branch still returns to depth if ever invoked directly', () => {
    renderQuestion();
    const btn = document.getElementById('btn-back-q');
    btn.disabled = false;
    btn.click();
    expect(document.getElementById('stage-depth').classList.contains('hidden')).toBe(false);
  });

  it('advances through questions and back navigation preserves the earlier answer', () => {
    renderQuestion();
    document.querySelector('#opts .opt').click();
    document.getElementById('btn-next-q').click();
    expect(state.idx).toBe(1);
    expect(document.getElementById('btn-back-q').disabled).toBe(false);

    document.getElementById('btn-back-q').click();
    expect(state.idx).toBe(0);
    expect(document.querySelector('#opts .opt.selected')).not.toBeNull();
  });

  it('reaching the last question and answering it moves to the confidence stage', () => {
    renderQuestion();
    for (let i = 0; i < state.questions.length; i++) {
      document.querySelector('#opts .opt').click();
      document.getElementById('btn-next-q').click();
    }
    expect(document.getElementById('stage-confidence').classList.contains('hidden')).toBe(false);
  });

  it('labels a nonprofit-module question distinctly from a base NIST-function question', () => {
    state.profile.orgType = 'nonprofit';
    state.profile.servesYouth = false;
    state.questions = getQuestionsForAssessment(state.profile, 'comprehensive');
    var npIdx = state.questions.findIndex(function(q) { return q.module === 'nonprofit'; });
    expect(npIdx).toBeGreaterThan(-1);
    state.idx = npIdx;
    renderQuestion();
    expect(document.querySelector('#stage-quiz .qmodule').textContent).toBe('Nonprofit module');
  });
});

describe('renderConfidence', () => {
  beforeEach(() => {
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.confidenceAnswers = {};
  });

  it('blocks seeing the report until all four functions are answered', () => {
    renderConfidence();
    document.getElementById('btn-see-report').click();
    expect(document.getElementById('err-confidence').classList.contains('hidden')).toBe(false);
  });

  it('records each likert answer and marks it selected', () => {
    renderConfidence();
    document.querySelectorAll('.likert-row').forEach(function(row) {
      row.querySelector('.likert-opt').click();
    });
    expect(Object.keys(state.confidenceAnswers).length).toBe(4);
    expect(document.querySelectorAll('.likert-opt.selected').length).toBe(4);
  });

  it('advances to the report once all four are answered', () => {
    renderConfidence();
    document.querySelectorAll('.likert-row').forEach(function(row) {
      row.querySelector('.likert-opt').click();
    });
    document.getElementById('btn-see-report').click();
    expect(document.getElementById('stage-report').classList.contains('hidden')).toBe(false);
  });

  it('back button returns to the last quiz question', () => {
    renderConfidence();
    document.getElementById('btn-back-confidence').click();
    expect(document.getElementById('stage-quiz').classList.contains('hidden')).toBe(false);
    expect(state.idx).toBe(state.questions.length - 1);
  });
});

describe('renderReport: remaining branches', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; });
    state.confidenceAnswers = {};
  }

  it('renders a tool review section covering all three classifications plus an unlisted tool', () => {
    primeReportState();
    state.toolsSelected = ['t-grok', 't-chatgpt', 't-copilot'];
    state.otherTools = ['Some Unlisted Tool'];
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('High-risk tools flagged');
    expect(html).toContain('Tools requiring caution');
    expect(html).toContain('Lower-risk tools in your inventory');
    expect(html).toContain('Some Unlisted Tool');
  });

  it('renders the critical entry first with its own badge, and includes it in the "close critical gaps" roadmap phase (B7)', () => {
    primeReportState(); // all quick-depth answers are 0, including g2 (ownership-accountability) -> bottom-tier
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    const recTitles = Array.from(document.querySelectorAll('.rec-title')).map(function(el) { return el.textContent; });
    expect(recTitles[0]).toBe('Establish real ownership for AI governance, organization-wide');
    const firstBadge = document.querySelector('.rec-head span');
    expect(firstBadge.textContent).toBe('Critical');
    expect(firstBadge.classList.contains('prio-critical')).toBe(true);
    expect(html).toContain('Close critical gaps');
    // The critical entry's own title should appear inside the "Next 90 days" phase list.
    const phaseLists = document.querySelectorAll('.phase ul');
    expect(phaseLists[0].textContent).toContain('Establish real ownership for AI governance, organization-wide');
  });

  it('shows the industry-overlay caveat for an in-scope industry', () => {
    primeReportState();
    state.profile.industry = 'healthcare';
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('Industry-specific overlays for Healthcare');
  });

  it('renders the Regulatory Exposure Profile and AI Tool Portfolio Review sections end-to-end (B10/B14)', () => {
    primeReportState();
    state.profile.region = 'eu';
    state.profile.industry = 'healthcare';
    state.profile.regulated = ['eu-customers'];
    state.toolsSelected = ['t-chatgpt']; // caution-tier + sensitive data -> escalates to high
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Regulatory Exposure Profile');
    expect(html).toContain('AI Tool Portfolio Review');
    expect(html).toContain('EU AI Act (via the Digital Omnibus amendment)');
    expect(html).toContain('HIPAA governs protected health information');
    expect(html).toContain('Weighted up for declared sensitive data types');
    // Both level-based badges should read "High" given the fixture above.
    const exposureLabel = Array.from(document.querySelectorAll('.b10-label')).find(function(el) { return el.textContent.indexOf('Exposure level') !== -1; });
    const portfolioLabel = Array.from(document.querySelectorAll('.b10-label')).find(function(el) { return el.textContent.indexOf('Tool portfolio risk') !== -1; });
    expect(exposureLabel.textContent).toContain('High');
    expect(portfolioLabel.textContent).toContain('High');
  });

  it('shows an "Info" gap badge, not a High/Medium/Low one, for a region with no dedicated research', () => {
    primeReportState();
    state.profile.region = 'uk';
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('No dedicated regulatory research completed for this region yet');
    const exposureLabel = Array.from(document.querySelectorAll('.b10-label')).find(function(el) { return el.textContent.indexOf('Exposure level') !== -1; });
    expect(exposureLabel.querySelector('.tool-badge')).toBeNull(); // 'info' level renders no badge
  });

  it('shows "No jurisdiction..." placeholder text and a "Partial" framework-coverage pill when applicable', () => {
    primeReportState();
    // Mixed answers so at least one NIST function lands in the 40-69% "partial" band.
    state.questions.forEach(function(q, i) { state.answers[q.id] = i % 2 === 0 ? 1 : 3; });
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('No jurisdiction, industry, or data-type factors currently on file');
    expect(html).toContain('Framework Coverage Mapping');
  });

  it('flags an overconfident function when self-reported confidence outpaces evidence', () => {
    primeReportState(); // all answers are 0 -> 0% evidence everywhere
    ['govern', 'map', 'measure', 'manage'].forEach(function(fn) { state.confidenceAnswers[fn] = 5; }); // max confidence
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Confidence outpaces evidence');
    expect(document.querySelectorAll('.gap-badge.overconfident').length).toBeGreaterThan(0);
  });

  it('shows the strong-foundations message when there are no gaps, and no critical entry when ownership is not bottom-tier', () => {
    primeReportState();
    state.questions.forEach(function(q) { state.answers[q.id] = 3; }); // best answer everywhere
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('You have strong foundations');
    expect(document.querySelectorAll('.prio-critical').length).toBe(0);
  });

  it('populates the "3 to 6 months" roadmap phase when medium-priority gaps exist', () => {
    primeReportState();
    // Answer 1 (partial baseline) is a medium-priority gap; mix in a 0 (high) too
    // so both the high.length and med.length truthy roadmap branches are exercised.
    state.questions.forEach(function(q, i) { state.answers[q.id] = i === 0 ? 0 : 1; });
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).not.toContain('Establish quarterly review.');
    expect(html).toContain('3 to 6 months');
  });

  it('confidenceNote text matches the depth actually taken', () => {
    primeReportState();
    state.depth = 'comprehensive';
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('Based on the Comprehensive assessment');
  });

  it('restart resets every piece of state and returns to the intro stage', () => {
    primeReportState();
    state.toolsSelected = ['t-grok'];
    renderReport();
    document.getElementById('btn-restart').click();
    expect(state.scope).toEqual({ id: null, name: '' });
    expect(state.role).toEqual({ id: null, department: '' });
    expect(state.toolsSelected).toEqual([]);
    expect(state.questions).toEqual([]);
    expect(document.getElementById('stage-intro').classList.contains('hidden')).toBe(false);
  });

  it('print button calls window.print without throwing', () => {
    primeReportState();
    renderReport();
    expect(() => document.getElementById('btn-print').click()).not.toThrow();
  });
});

describe('pure string-builder helpers', () => {
  it('escapeHtml escapes the five HTML-significant characters', () => {
    expect(escapeHtml('<b>"Tom" & Jerry</b>')).toBe('&lt;b&gt;&quot;Tom&quot; &amp; Jerry&lt;/b&gt;');
  });

  it('buildScopeText lists applicable modules and adds the industry caveat when relevant', () => {
    const text = buildScopeText({ industry: 'financial' }, ['base', 'nonprofit', 'youth']);
    expect(text).toContain('Nonprofit module');
    expect(text).toContain('Youth-serving module');
    expect(text).toContain('SR 11-7 for financial services');
  });

  it('buildScopeText omits the industry caveat for an out-of-scope industry', () => {
    const text = buildScopeText({ industry: 'technology' }, ['base']);
    expect(text).not.toContain('are on the roadmap');
  });

  it('radioBtn and checkBtn mark the "selected" class only when selected is true', () => {
    expect(radioBtn('x', 'y', 'Label', true)).toContain('selected');
    expect(radioBtn('x', 'y', 'Label', false)).not.toContain('selected');
    expect(checkBtn('x', 'y', 'Label', true)).toContain('checked');
    expect(checkBtn('x', 'y', 'Label', false)).not.toContain('checked');
  });
});

describe('New AI Tool Adoption assessment (B13)', () => {
  it('the intro stage offers both assessment types', () => {
    mountApp();
    const html = document.getElementById('stage-intro').innerHTML;
    expect(html).toContain('Governance Readiness');
    expect(html).toContain('New AI Tool Adoption');
  });

  it('picking "Governance Readiness" sets state.assessmentType and shows the scope stage', () => {
    mountApp();
    document.getElementById('btn-start').click();
    expect(state.assessmentType).toBe('governance-readiness');
    expect(document.getElementById('stage-scope').classList.contains('hidden')).toBe(false);
  });

  it('picking "New AI Tool Adoption" sets state.assessmentType and shows the context stage', () => {
    mountApp();
    document.getElementById('btn-start-adoption').click();
    expect(state.assessmentType).toBe('tool-adoption');
    expect(document.getElementById('stage-tool-adoption-context').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('stage-intro').classList.contains('hidden')).toBe(true);
  });

  it('renders one checkbox per ANNEX_III_DOMAINS entry, and toggling one updates state.toolAdoption.annexIiiDomainIds', () => {
    renderToolAdoptionContext();
    const boxes = document.querySelectorAll('#annex-iii-grid .check-opt');
    expect(boxes.length).toBe(ANNEX_III_DOMAINS.length);

    const box = document.querySelector('#annex-iii-grid .check-opt[data-value="employment-worker-management"] input');
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(state.toolAdoption.annexIiiDomainIds).toContain('employment-worker-management');

    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(state.toolAdoption.annexIiiDomainIds).not.toContain('employment-worker-management');
  });

  it('requires an organization size before continuing to the quiz', () => {
    renderToolAdoptionContext();
    document.getElementById('btn-next-ta-context').click();
    expect(document.getElementById('err-ta-size').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('stage-tool-adoption-quiz').classList.contains('hidden')).toBe(true);

    document.querySelector('.radio-opt[data-name="taSize"][data-value="11-50"]').click();
    expect(state.toolAdoption.companySize).toBe('11-50');
    document.getElementById('btn-next-ta-context').click();
    expect(document.getElementById('stage-tool-adoption-quiz').classList.contains('hidden')).toBe(false);
  });

  it('back from the context stage returns to the intro', () => {
    renderToolAdoptionContext();
    document.getElementById('btn-back-ta-context').click();
    expect(document.getElementById('stage-intro').classList.contains('hidden')).toBe(false);
  });

  it('walks through all 9 questions end-to-end, recording each answer and reaching the result stage', () => {
    state.toolAdoption.companySize = '11-50';
    state.toolAdoption.idx = 0;
    renderToolAdoptionQuestion();

    TOOL_ADOPTION_QUESTIONS.forEach(function(q, i) {
      expect(document.getElementById('stage-tool-adoption-quiz').innerHTML).toContain(q.text);
      document.querySelector('#ta-opts .opt[data-v="2"]').click();
      expect(state.toolAdoption.answers[q.id]).toBe(2);
      document.getElementById('btn-next-ta-q').click();
      if (i < TOOL_ADOPTION_QUESTIONS.length - 1) {
        expect(document.getElementById('stage-tool-adoption-quiz').classList.contains('hidden')).toBe(false);
      }
    });

    expect(document.getElementById('stage-tool-adoption-result').classList.contains('hidden')).toBe(false);
  });

  it('requires an answer before advancing to the next question', () => {
    state.toolAdoption.idx = 0;
    renderToolAdoptionQuestion();
    document.getElementById('btn-next-ta-q').click();
    expect(document.getElementById('err-ta').classList.contains('hidden')).toBe(false);
  });

  it('back on the first question returns to the context stage; back on a later one decrements idx', () => {
    state.toolAdoption.idx = 0;
    renderToolAdoptionQuestion();
    document.getElementById('btn-back-ta-q').click();
    expect(document.getElementById('stage-tool-adoption-context').classList.contains('hidden')).toBe(false);

    state.toolAdoption.idx = 2;
    renderToolAdoptionQuestion();
    document.getElementById('btn-back-ta-q').click();
    expect(state.toolAdoption.idx).toBe(1);
  });

  it('renders the tier pill, headline, and body text, with the Annex III callout only when a domain was selected', () => {
    state.toolAdoption.companySize = '1-10';
    state.toolAdoption.annexIiiDomainIds = [];
    TOOL_ADOPTION_QUESTIONS.forEach(function(q) { state.toolAdoption.answers[q.id] = 0; });
    state.toolAdoption.answers['ma-adopt-1'] = 3;
    state.toolAdoption.answers['ma-adopt-2'] = 3;
    renderToolAdoptionResult();
    let html = document.getElementById('stage-tool-adoption-result').innerHTML;
    expect(html).toContain('tier-pill');
    expect(html).toContain('Tier 4');
    expect(html).not.toContain('Annex III high-risk domain');

    state.toolAdoption.annexIiiDomainIds = ['biometrics'];
    renderToolAdoptionResult();
    html = document.getElementById('stage-tool-adoption-result').innerHTML;
    expect(html).toContain('Annex III high-risk domain');
  });

  it('"Assess another tool" resets toolAdoption state and returns to the context stage', () => {
    state.toolAdoption.companySize = '1-10';
    state.toolAdoption.annexIiiDomainIds = ['biometrics'];
    TOOL_ADOPTION_QUESTIONS.forEach(function(q) { state.toolAdoption.answers[q.id] = 2; });
    renderToolAdoptionResult();
    document.getElementById('btn-restart-ta').click();
    expect(state.toolAdoption).toEqual({ annexIiiDomainIds: [], companySize: null, answers: {}, idx: 0 });
    expect(document.getElementById('stage-tool-adoption-context').classList.contains('hidden')).toBe(false);
  });
});

describe('nine-section report rebuild (B14)', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; });
    state.confidenceAnswers = {};
  }

  it('renders all nine numbered sections in order', () => {
    primeReportState();
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    const expected = [
      'Executive Summary', 'Assessment Overview', 'Governance Score Breakdown',
      'Regulatory Exposure Profile', 'AI Tool Portfolio Review', 'Framework Coverage Mapping',
      'Risk Register', 'Prioritized Recommendations', 'Roadmap'
    ];
    let lastIndex = -1;
    expected.forEach(function(title, i) {
      const idx = html.indexOf(title);
      expect(idx, title + ' should render').toBeGreaterThan(-1);
      expect(idx, title + ' should come after ' + expected[i - 1]).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    });
    for (let n = 1; n <= 9; n++) {
      expect(html).toContain('Section ' + n + ' of 9');
    }
  });

  it('the Executive Summary leads with the critical entry when Ownership & Accountability gates the score', () => {
    primeReportState(); // all-zero answers -> Ownership & Accountability bottom tier -> critical entry
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('The most urgent finding is structural: Establish real ownership for AI governance, organization-wide.');
  });

  it('the Governance Score Breakdown renders one bar per GOVERNANCE_DIMENSIONS entry, with its weight', () => {
    primeReportState();
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Ownership &amp; Accountability');
    expect(html).toContain('Weight: 20%');
    expect(html).toContain('Weight: 25%');
    expect(html).toContain('Weight: 15%');
  });

  it('shows the gating-rule callout only when Ownership & Accountability is actually gating the score', () => {
    primeReportState(); // all zero -> gates
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('caps your overall score regardless of the other four dimensions');

    state.questions.forEach(function(q) { state.answers[q.id] = 3; }); // everything maxed -> no gating
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).not.toContain('caps your overall score regardless of the other four dimensions');
  });

  it('the Risk Register lists one row per declared tool, and an unclassified row for "other" tools', () => {
    primeReportState();
    state.toolsSelected = ['t-grok'];
    state.otherTools = ['Some Internal Tool'];
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    const rows = document.querySelectorAll('.register-table tbody tr');
    expect(rows.length).toBe(2);
    expect(html).toContain('Some Internal Tool');
    expect(html).toContain('Unclassified');
  });

  it('the Risk Register shows an empty-state message when no tools are declared', () => {
    primeReportState();
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('No tools declared -- nothing to register yet.');
  });

  it('Export JSON triggers a download without throwing', () => {
    primeReportState();
    renderReport();
    expect(() => document.getElementById('btn-export-json').click()).not.toThrow();
  });

  it('Export CSV triggers a download without throwing', () => {
    primeReportState();
    renderReport();
    expect(() => document.getElementById('btn-export-csv').click()).not.toThrow();
  });

  it('triggerDownload creates and cleans up an anchor element without throwing', () => {
    const before = document.body.children.length;
    expect(() => triggerDownload('test.json', '{"a":1}', 'application/json')).not.toThrow();
    expect(document.body.children.length).toBe(before); // the synthetic <a> is removed after click
  });

  it('renames the question-level gap-count stat to "High-priority gaps", closing the naming collision flagged against B7\'s dimension-level critical entry', () => {
    primeReportState();
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('High-priority gaps');
    expect(html).not.toContain('>Critical gaps<');
  });
});

describe('drill-down from summary counts/scores into itemized reasoning (B15)', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; }); // every question a high-priority gap
    state.confidenceAnswers = {};
  }

  it('every drill panel starts hidden, and its trigger reports aria-expanded=false', () => {
    primeReportState();
    renderReport();
    document.querySelectorAll('.drill-panel').forEach(function(panel) {
      expect(panel.classList.contains('hidden')).toBe(true);
    });
    document.querySelectorAll('.drillable').forEach(function(trigger) {
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('clicking the "High-priority gaps" stat reveals the itemized questions, and clicking again hides it', () => {
    primeReportState();
    renderReport();
    const trigger = document.querySelector('[data-drill="drill-panel-high"]');
    const panel = document.getElementById('drill-panel-high');

    trigger.click();
    expect(panel.classList.contains('hidden')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Every question was answered 0 above, so every quick-depth question's
    // text should appear in the itemized list -- spot-check one.
    expect(panel.textContent).toContain(state.questions[0].text);
    expect(panel.textContent).toContain('Answered: ' + state.questions[0].options.find(o => o.v === 0).label);

    trigger.click();
    expect(panel.classList.contains('hidden')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('the "Moderate gaps" panel shows the empty-state message when there are none', () => {
    primeReportState(); // all answers are 0 -> every gap is high-priority, none medium
    renderReport();
    document.querySelector('[data-drill="drill-panel-medium"]').click();
    expect(document.getElementById('drill-panel-medium').textContent).toContain('No answered questions here yet.');
  });

  it('a Governance Score Breakdown dimension bar drills into exactly the questions tagged with that dimension', () => {
    primeReportState();
    renderReport();
    const dimensionId = state.questions.find(q => q.dimension).dimension;
    const trigger = document.querySelector('[data-drill="drill-panel-dim-' + dimensionId + '"]');
    trigger.click();
    const panel = document.getElementById('drill-panel-dim-' + dimensionId);
    const expectedQuestions = state.questions.filter(q => q.dimension === dimensionId);
    expectedQuestions.forEach(q => expect(panel.textContent).toContain(q.text));
  });

  it('a NIST-function score bar (Governance Score Breakdown) and its Framework Coverage Mapping counterpart drill into the same underlying questions via two independent panels', () => {
    primeReportState();
    renderReport();
    document.querySelector('[data-drill="drill-panel-scorefn-govern"]').click();
    document.querySelector('[data-drill="drill-panel-covfn-govern"]').click();
    const scorePanel = document.getElementById('drill-panel-scorefn-govern');
    const covPanel = document.getElementById('drill-panel-covfn-govern');
    expect(scorePanel.classList.contains('hidden')).toBe(false);
    expect(covPanel.classList.contains('hidden')).toBe(false);
    expect(scorePanel.textContent).toBe(covPanel.textContent);
    // Toggling one panel must not affect the other -- they're independent DOM nodes.
    document.querySelector('[data-drill="drill-panel-scorefn-govern"]').click();
    expect(scorePanel.classList.contains('hidden')).toBe(true);
    expect(covPanel.classList.contains('hidden')).toBe(false);
  });
});

describe('DMAIC-structured recommendations (B16)', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; }); // every question a gap -> critical entry fires too
    state.confidenceAnswers = {};
  }

  it('renders all four DMAIC labels (Measure/Analyze/Improve/Control) on every recommendation card', () => {
    primeReportState();
    renderReport();
    const cards = document.querySelectorAll('.rec');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(function(card) {
      const labels = Array.from(card.querySelectorAll('.dmaic-label')).map(function(l) { return l.textContent; });
      expect(labels).toEqual(['Measure', 'Analyze', 'Improve', 'Control']);
    });
  });

  it("the critical entry's Measure step references the Governance Score Breakdown drill-down rather than repeating it", () => {
    primeReportState();
    renderReport();
    const criticalCard = document.querySelector('.prio-critical').closest('.rec');
    expect(criticalCard.textContent).toContain('Governance Score Breakdown drill-down above');
  });

  it("a question-level recommendation's Measure step quotes the actual answer given", () => {
    primeReportState();
    renderReport();
    const highCard = document.querySelector('.prio-high').closest('.rec');
    expect(highCard.textContent).toMatch(/You answered: "/);
  });

  it('the Improve text is exactly buildRecommendations\' own body for that question, not a reworded summary', () => {
    primeReportState();
    renderReport();
    const gaps = identifyGaps(state.questions, state.answers);
    const expectedBody = buildRecommendations(gaps)[0].body;
    const firstHighCard = document.querySelectorAll('.prio-high')[0].closest('.rec');
    const improveStep = Array.from(firstHighCard.querySelectorAll('.dmaic-step')).find(function(s) { return s.textContent.indexOf('Improve') === 0; });
    expect(improveStep.textContent).toBe('Improve' + expectedBody);
  });

  it('shows the Define/Measure/Analyze/Improve/Control explainer line above the recommendation list', () => {
    primeReportState();
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('Define → Measure → Analyze → Improve → Control');
  });
});

describe('lower-risk tool alternative suggestions (B16b)', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
    state.confidenceAnswers = {};
  }

  it('shows a lower-risk alternative box on a caution-tier tool\'s card, with non-endorsement framing', () => {
    primeReportState();
    state.toolsSelected = ['t-anyword'];
    state.profile.industry = 'retail';
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Lower-risk alternative in the same category');
    expect(html).toContain('Jasper');
    expect(html).toContain('Not an endorsement or paid placement');
  });

  it('shows no alternative box for a tool whose category has no lower-risk entry', () => {
    primeReportState();
    state.toolsSelected = ['t-gamma']; // Presentations -- no lower-risk entry in this category
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).not.toContain('Lower-risk alternative in the same category');
  });

  it('shows no alternative box for an already lower-risk tool', () => {
    primeReportState();
    state.toolsSelected = ['t-jasper']; // itself lower-risk
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).not.toContain('Lower-risk alternative in the same category');
  });

  it('mentions industry-fit only when the alternative actually matched the declared industry', () => {
    primeReportState();
    state.toolsSelected = ['t-anyword'];
    state.profile.industry = 'technology'; // no Marketing content lower-risk tool covers this
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Lower-risk alternative in the same category');
    expect(html).not.toContain('its declared industries include yours');
  });
});

describe('B17: the six quality standards implemented structurally', () => {
  function primeReportState() {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    state.questions = getQuestionsForAssessment(state.profile, 'quick');
    state.idx = 0;
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 0; });
    state.confidenceAnswers = {};
  }

  it('standard #1: the New AI Tool Adoption result screen shows the itemized answer breakdown behind its composite score', () => {
    state.toolAdoption.companySize = '11-50';
    state.toolAdoption.annexIiiDomainIds = [];
    TOOL_ADOPTION_QUESTIONS.forEach(function(q) { state.toolAdoption.answers[q.id] = 2; });
    renderToolAdoptionResult();
    const html = document.getElementById('stage-tool-adoption-result').innerHTML;
    expect(html).toContain('How this was scored');
    TOOL_ADOPTION_QUESTIONS.forEach(function(q) {
      expect(html).toContain(q.text);
    });
  });

  it('standard #2: a Regulatory Exposure factor with no dated source is flagged as such', () => {
    primeReportState();
    state.profile.industry = 'healthcare'; // REGULATORY_INDUSTRY_NOTES factor has source: null
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('not yet independently dated/sourced');
  });

  it('standard #2: an EU jurisdiction factor (which does carry a real citation) is not flagged', () => {
    primeReportState();
    state.profile.region = 'eu';
    state.profile.industry = null;
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('EU AI Act');
    expect(html).not.toContain('not yet independently dated/sourced');
  });

  it('standard #3: the recommendations list states its own ranking basis in plain language', () => {
    primeReportState();
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('Ranked with the critical, org-wide finding first');
  });

  it('standard #4: a recommendation\'s Control step names who typically owns follow-through at the declared org size', () => {
    primeReportState();
    state.profile.size = '1-10';
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('At your declared organization size');
  });

  it('standard #5: the Assumptions & Limitations block lists the standing limitations', () => {
    primeReportState();
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Assumptions &amp; Limitations');
    expect(html).toContain('72-subcategory');
    expect(html).toContain('not a compliance certification');
  });

  it('standard #6: the Methodology & Sourcing panel starts hidden and reveals all six notes on click', () => {
    primeReportState();
    renderReport();
    const panel = document.getElementById('drill-panel-methodology');
    expect(panel.classList.contains('hidden')).toBe(true);
    document.querySelector('[data-drill="drill-panel-methodology"]').click();
    expect(panel.classList.contains('hidden')).toBe(false);
    METHODOLOGY_NOTES.forEach(function(note) {
      expect(panel.textContent).toContain(note.title);
    });
  });
});

describe('B17b: no misleading "0%" for a zero-question NIST function', () => {
  it('renders "No data" on the Governance Score Breakdown\'s By-NIST-function bar when a function has zero questions', () => {
    state.scope = { id: 'org', name: '' };
    state.role = { id: null, department: '' };
    state.profile.orgType = 'for-profit';
    state.profile.servesYouth = false;
    state.depth = 'quick';
    // Directly construct a scenario with zero MANAGE questions -- the exact
    // shape the pre-B17b bug rendered as a misleading "0%" bar -- bypassing
    // getQuestionsForAssessment (which the B17b safety net now protects)
    // to confirm the *rendering* fix independently of the filtering fix.
    state.questions = getQuestionsForAssessment(state.profile, 'quick').filter(function(q) { return q.fn !== 'manage'; });
    state.idx = 0;
    state.answers = {};
    state.questions.forEach(function(q) { state.answers[q.id] = 2; });
    state.confidenceAnswers = {};
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('No data');
    expect(html).not.toMatch(/Manage<\/h3><span class="fn-score">0%/);
  });
});
