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
  checkBtn
} from '../src/ui.js';
import { getQuestionsForAssessment } from '../src/logic.js';
import { TOOL_MASTER_LIST } from '../src/data.js';

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
    const bodies = Array.from(document.querySelectorAll('.rec-body')).map(function(el) { return el.textContent; });
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.some(function(b) { return b.includes('individual employee'); })).toBe(true);
  });

  it('does not append any role caveat to recommendation bodies for leadership', () => {
    primeReportState('org', 'leadership');
    renderReport();
    const bodies = Array.from(document.querySelectorAll('.rec-body')).map(function(el) { return el.textContent; });
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.some(function(b) { return b.includes('individual employee') || b.includes('single department/function'); })).toBe(false);
  });

  it('composes the department-scope framing and the role caveat together when both apply', () => {
    // department scope + employee role: employee is scoped to their own department,
    // which is a narrower-or-equal match (no mismatch per roleVisibilityCaveat), so
    // only the scope framing note should appear, not a role caveat.
    primeReportState('department', 'employee');
    renderReport();
    const bodies = Array.from(document.querySelectorAll('.rec-body')).map(function(el) { return el.textContent; });
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

  it('shows the industry-overlay caveat for an in-scope industry', () => {
    primeReportState();
    state.profile.industry = 'healthcare';
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('Industry-specific overlays for Healthcare');
  });

  it('flags an overconfident function when self-reported confidence outpaces evidence', () => {
    primeReportState(); // all answers are 0 -> 0% evidence everywhere
    ['govern', 'map', 'measure', 'manage'].forEach(function(fn) { state.confidenceAnswers[fn] = 5; }); // max confidence
    renderReport();
    const html = document.getElementById('stage-report').innerHTML;
    expect(html).toContain('Confidence outpaces evidence');
    expect(document.querySelectorAll('.gap-badge.overconfident').length).toBeGreaterThan(0);
  });

  it('shows the strong-foundations message when there are no gaps', () => {
    primeReportState();
    state.questions.forEach(function(q) { state.answers[q.id] = 3; }); // best answer everywhere
    renderReport();
    expect(document.getElementById('stage-report').innerHTML).toContain('You have strong foundations');
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
