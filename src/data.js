// ============================================================================
// PURE DATA LAYER: Framework definitions and data
// Extracted from index.html (Phase B) for testability. No DOM or app logic here.
// ============================================================================

export const FRAMEWORK = {
  functions: {
    govern:  { name: 'Govern',  desc: 'Policies, roles, accountability' },
    map:     { name: 'Map',     desc: 'Context, use cases, risks identified' },
    measure: { name: 'Measure', desc: 'Testing, monitoring, metrics' },
    manage:  { name: 'Manage',  desc: 'Response, mitigation, incident handling' }
  }
};

// Self-reported confidence (Likert 1-5), one per NIST function.
// Evidence-anchored questions (BASE_QUESTIONS etc.) stay as-is for defensibility;
// this is a parallel, independent input used only to compute a perception-vs-evidence
// gap in the report (see computeConfidenceGap in logic.js). Never blended into the
// evidence-based score itself.
export const LIKERT_OPTIONS = [
  { v: 1, label: 'Not at all prepared' },
  { v: 2, label: 'Slightly prepared' },
  { v: 3, label: 'Somewhat prepared' },
  { v: 4, label: 'Mostly prepared' },
  { v: 5, label: 'Very prepared' }
];

export const CONFIDENCE_QUESTIONS = [
  { fn: 'govern',
    text: 'Overall, how prepared do you feel {subject} is on AI governance \u2014 policy, accountability, and leadership oversight?' },
  { fn: 'map',
    text: 'Overall, how prepared do you feel {subject} is at knowing which AI tools are in use and who could be harmed if something goes wrong?' },
  { fn: 'measure',
    text: 'Overall, how prepared do you feel {subject} is at checking whether AI output is accurate and monitoring it over time?' },
  { fn: 'manage',
    text: 'Overall, how prepared do you feel {subject} is at responding if an AI tool causes a real problem?' }
];

// Assessment scope selector (v2 SS12.2): addresses the department-vs-organization
// problem, where a department lead answering for governance they cannot see produces
// a false finding. Applies on top of the profile fields below, independent of them.
//
// Implementation note: we do NOT hand-rewrite all 31 base/nonprofit/youth question
// strings into three scope-specific variants each. Several of them (e.g. \"which AI
// tools your team is actually using\") assume an org-wide, multi-tool view that does
// not translate cleanly to a single initiative, and mechanically substituting words
// risks quietly mangling an evidence-anchored question's meaning. Instead: a
// persistent \"answering for X\" context banner keeps the respondent's scope
// unambiguous throughout the question flow (the actual failure mode v2 describes),
// the confidence questions above use a light {subject} token swap (they were already
// generic enough for that to be grammatically clean), and recommendation framing plus
// the report's declared scope change for real (see applyScopeFraming/describeScope in
// logic.js). A full per-question reframe is a defensible next step if ever needed.
export const SCOPE_OPTIONS = [
  { id: 'org', label: 'Whole organization',
    tagline: 'Assess governance across the entire organization.',
    nameLabel: null },
  { id: 'department', label: 'Department / function',
    tagline: 'Assess one department or business function. Flags that org-wide governance may exist above it.',
    nameLabel: 'Department or function name (optional)' },
  { id: 'initiative', label: 'Specific AI initiative',
    tagline: 'Assess one AI system or use case, framed as a pre-deployment review.',
    nameLabel: 'AI system or initiative name (optional)' }
];

// Respondent role selector (B3): the three respondent types from the project backlog
// SS1.4.1 -- leadership/executive, department/function, individual employee. Role (who
// is answering) and scope (SCOPE_OPTIONS above, what is being assessed) are related but
// distinct axes: a leadership respondent can still answer a department- or initiative-
// scoped assessment, and an individual employee can be asked about the whole org. This
// list does NOT drive question selection/routing -- it only changes framing/caveat copy
// (see roleVisibilityCaveat/describeRole/applyRoleFraming in logic.js). Role-based item
// routing via a visibilityTag is out of scope here; that's B8/B11's job once B4's data
// model exists.
//
// Naming note: 'dept-role' (not 'department') is deliberate. SCOPE_OPTIONS already uses
// the id 'department' for a different axis (assessment scope) -- reusing that string
// here for a different concept is exactly the ambiguity R9 flagged and renamed away from
// ("enterprise-wide" -> "strategic", to avoid colliding with SCOPE_OPTIONS' 'org' value).
// Same discipline applied here preemptively.
export const ROLE_OPTIONS = [
  { id: 'leadership', label: 'Leadership / executive',
    tagline: 'CEO, board member, or other role with org-wide visibility and accountability.',
    hasDepartmentField: false },
  { id: 'dept-role', label: 'Department member',
    tagline: 'You work within one department or function and are answering from that vantage point.',
    hasDepartmentField: false },
  { id: 'employee', label: 'Individual employee',
    tagline: 'You are answering for yourself, not on behalf of a department or the whole organization. Can belong to any department.',
    hasDepartmentField: true }
];

// Department taxonomy (B4, backlog SS1.4.13/Deliverable 2). Feeds
// getVisibilityTagsForDepartment() in logic.js -- NOT wired into question
// routing/getQuestionsForAssessment yet, that's B8/B11's job once this data
// model exists.
//
// This is a genuinely new, small starter list, not derived from an existing
// fixed taxonomy anywhere in the codebase -- ROLE_OPTIONS' employee.department
// and SCOPE_OPTIONS' department-scope name are both free text today, with no
// canonical department list backing either one (see backlog SS1.4.13's
// Department-entity note for why, and for how these free-text fields are
// designed to eventually reconcile with this list once a real backend
// exists). Flagged explicitly as a starting point for Kartik's review, not
// asserted as final -- narrow it, rename it, or expand it as needed before
// B8 depends on it.
//
// Naming note: 'executive' (not 'leadership') and 'legal' (not
// 'legal-compliance') are deliberate. ROLE_OPTIONS already uses the id
// 'leadership' for a different axis (respondent role, above), and
// VISIBILITY_TAGS below already uses 'legal-compliance' for a different axis
// (question visibility). Reusing either string here for this third, distinct
// concept (organizational department) would recreate the exact ambiguity R9
// already flagged and renamed away from once ("enterprise-wide" -> "strategic",
// to avoid colliding with SCOPE_OPTIONS' 'org'). 'operations' (department) vs.
// 'operational' (tag, below) was considered too -- kept as-is since the
// strings are not identical and the two concepts are never compared for
// equality against each other in code, unlike the two collisions above.
export const DEPARTMENTS = [
  { id: 'executive', label: 'Executive / Leadership' },
  { id: 'it-engineering', label: 'IT / Engineering' },
  { id: 'legal', label: 'Legal / Compliance' },
  { id: 'hr-people', label: 'HR / People' },
  { id: 'finance', label: 'Finance / Accounting' },
  { id: 'marketing-comms', label: 'Marketing / Communications' },
  { id: 'sales-bizdev', label: 'Sales / Business Development' },
  { id: 'operations', label: 'Operations' },
  { id: 'customer-support', label: 'Customer Support / Service' },
  { id: 'other', label: 'Other / Not listed' }
];

// R9's four functional-visibility tags (backlog SS1.4.12): which
// organizational vantage point can answer a given item with real evidence --
// orthogonal to respondent role (ROLE_OPTIONS above). 'strategic' per R9's
// own naming decision, replacing the original working name "enterprise-wide"
// specifically to avoid colliding with SCOPE_OPTIONS' 'org' value. Not yet
// wired into BASE_QUESTIONS/NONPROFIT_QUESTIONS/YOUTH_QUESTIONS as a per-item
// field -- that's B8/B9's job once this exists. See
// getVisibilityTagsForDepartment() in logic.js for the department -> tag
// inference this taxonomy feeds.
export const VISIBILITY_TAGS = ['strategic', 'operational', 'technical-build', 'legal-compliance'];

// Industry list. Not all industries get overlays. Those that don't get honest scoping banner.
export const INDUSTRIES = [
  { id: 'nonprofit-social', label: 'Nonprofit / Social services' },
  { id: 'education', label: 'Education' },
  { id: 'healthcare', label: 'Healthcare / Life sciences' },
  { id: 'financial', label: 'Financial services' },
  { id: 'technology', label: 'Technology / Software' },
  { id: 'retail', label: 'Retail / E-commerce' },
  { id: 'manufacturing', label: 'Manufacturing / Industrial' },
  { id: 'professional', label: 'Professional services / Consulting' },
  { id: 'media', label: 'Media / Creative / Marketing' },
  { id: 'government', label: 'Government / Public sector' },
  { id: 'hospitality', label: 'Hospitality / Food service' },
  { id: 'federal-contractors', label: 'Federal Contractors' },
  { id: 'legal', label: 'Legal / Law firm' },
  { id: 'aviation-aerospace', label: 'Aviation & Aerospace' },
  { id: 'other', label: 'Other' }
];

// Governance Maturity sub-dimensions (B5, backlog SS1.4.5): five weighted
// dimensions that replace computeScores()'s old flat percentage as `overall`
// -- see computeScores() in logic.js for the weighted+gated calculation and
// GOVERNANCE_GATING_THRESHOLD for the Ownership & Accountability gating rule.
// Weights match SS1.4.5's table exactly (20/20/20/25/15, sums to 100).
// `dimension` below tags every question in BASE_QUESTIONS/NONPROFIT_QUESTIONS/
// YOUTH_QUESTIONS with one of these ids -- a second, orthogonal axis from
// `fn` (NIST function), the same relationship role has to visibility-tag
// (B3/B4). Collision-checked against SCOPE_OPTIONS/ROLE_OPTIONS/
// VISIBILITY_TAGS/DEPARTMENTS ids -- none of these five strings are reused
// from any of those lists.
export const GOVERNANCE_DIMENSIONS = [
  { id: 'ownership-accountability', label: 'Ownership & Accountability', weight: 20 },
  { id: 'inventory-visibility', label: 'Inventory & Visibility', weight: 20 },
  { id: 'risk-classification', label: 'Risk Classification', weight: 20 },
  { id: 'controls-evidence', label: 'Controls & Evidence', weight: 25 },
  { id: 'monitoring-response', label: 'Monitoring & Response', weight: 15 }
];

// Base NIST questions (from v1, unchanged)
export const BASE_QUESTIONS = [
  { id: 'g1', fn: 'govern', module: 'base', dimension: 'controls-evidence', depths: ['quick','standard','comprehensive'],
    text: 'Does your business have a written policy on how employees can use AI tools?',
    hint: 'Includes ChatGPT, Copilot, Gemini, or any AI feature inside existing software.',
    options: [
      { v: 0, label: 'No policy exists' },
      { v: 1, label: 'Informal guidance only' },
      { v: 2, label: 'Written policy, not consistently followed' },
      { v: 3, label: 'Written policy, reviewed and enforced' }
    ]},
  { id: 'g2', fn: 'govern', module: 'base', dimension: 'ownership-accountability', depths: ['quick','standard','comprehensive'],
    text: 'Who is accountable when an AI tool causes a problem?',
    hint: 'Wrong output sent to a customer, sensitive data exposed to a model, and so on.',
    options: [
      { v: 0, label: 'No one has been named' },
      { v: 1, label: 'Unclear, depends on the situation' },
      { v: 2, label: 'A specific person, but not documented' },
      { v: 3, label: 'A named owner with documented responsibility' }
    ]},
  { id: 'g3', fn: 'govern', module: 'base', dimension: 'controls-evidence', depths: ['standard','comprehensive'],
    text: 'Do you have an approval process before adopting new AI tools?',
    options: [
      { v: 0, label: 'No, teams adopt tools freely' },
      { v: 1, label: 'Ad hoc, sometimes reviewed' },
      { v: 2, label: 'Yes, informal review' },
      { v: 3, label: 'Formal review with approval criteria' }
    ]},
  { id: 'g4', fn: 'govern', module: 'base', dimension: 'controls-evidence', depths: ['comprehensive'],
    text: 'Do you train employees on responsible AI use?',
    options: [
      { v: 0, label: 'No training' },
      { v: 1, label: 'One-time onboarding mention' },
      { v: 2, label: 'Occasional refreshers' },
      { v: 3, label: 'Structured, role-specific, updated regularly' }
    ]},
  { id: 'g5', fn: 'govern', module: 'base', dimension: 'ownership-accountability', depths: ['comprehensive'],
    text: 'Are AI risks discussed at leadership or board level?',
    options: [
      { v: 0, label: 'Never' },
      { v: 1, label: 'Only after incidents' },
      { v: 2, label: 'Occasionally as part of tech updates' },
      { v: 3, label: 'Regularly, with dedicated agenda time' }
    ]},
  { id: 'm1', fn: 'map', module: 'base', dimension: 'inventory-visibility', depths: ['quick','standard','comprehensive'],
    text: 'Do you know which AI tools your team is actually using?',
    hint: 'Includes tools built into products you already pay for.',
    options: [
      { v: 0, label: 'No visibility' },
      { v: 1, label: 'A rough idea, not documented' },
      { v: 2, label: 'Documented list, updated occasionally' },
      { v: 3, label: 'Current inventory reviewed quarterly' }
    ]},
  { id: 'm2', fn: 'map', module: 'base', dimension: 'risk-classification', depths: ['quick','standard','comprehensive'],
    text: 'For each AI use case, have you identified who could be harmed by a mistake?',
    options: [
      { v: 0, label: 'Not considered' },
      { v: 1, label: 'Considered for one or two visible cases' },
      { v: 2, label: 'Considered for most cases' },
      { v: 3, label: 'Systematic impact analysis per use case' }
    ]},
  { id: 'm3', fn: 'map', module: 'base', dimension: 'risk-classification', depths: ['standard','comprehensive'],
    text: 'Do you classify AI use cases by risk level?',
    hint: 'Example: low (drafting), medium (customer response), high (hiring, credit, medical).',
    options: [
      { v: 0, label: 'No classification' },
      { v: 1, label: 'Informal, case by case' },
      { v: 2, label: 'Simple tiers used sometimes' },
      { v: 3, label: 'Documented tiers applied to every new use case' }
    ]},
  { id: 'm4', fn: 'map', module: 'base', dimension: 'inventory-visibility', depths: ['comprehensive'],
    text: 'Do you know what data your AI tools can access?',
    options: [
      { v: 0, label: 'No, and no easy way to find out' },
      { v: 1, label: 'Only for the biggest tools' },
      { v: 2, label: 'Mostly known, some gaps' },
      { v: 3, label: 'Fully mapped, reviewed regularly' }
    ]},
  { id: 'm5', fn: 'map', module: 'base', dimension: 'risk-classification', depths: ['comprehensive'],
    text: 'Do you evaluate third-party AI vendors before onboarding them?',
    options: [
      { v: 0, label: 'No vendor review' },
      { v: 1, label: 'Informal check of the website' },
      { v: 2, label: 'Basic security or privacy questionnaire' },
      { v: 3, label: 'Structured review including AI-specific risks' }
    ]},
  { id: 'me1', fn: 'measure', module: 'base', dimension: 'monitoring-response', depths: ['quick','standard','comprehensive'],
    text: 'How do you check whether AI output is accurate or reliable?',
    options: [
      { v: 0, label: 'We do not check' },
      { v: 1, label: 'Users spot-check when they notice something odd' },
      { v: 2, label: 'Sampling reviews on high-stakes outputs' },
      { v: 3, label: 'Structured review with documented metrics' }
    ]},
  { id: 'me2', fn: 'measure', module: 'base', dimension: 'monitoring-response', depths: ['quick','standard','comprehensive'],
    text: 'Do you track incidents related to AI use?',
    hint: 'Wrong outputs sent externally, prompt leakage, biased results, and so on.',
    options: [
      { v: 0, label: 'No tracking' },
      { v: 1, label: 'Only major incidents get discussed' },
      { v: 2, label: 'Informal log kept' },
      { v: 3, label: 'Formal incident register with review cadence' }
    ]},
  { id: 'me3', fn: 'measure', module: 'base', dimension: 'monitoring-response', depths: ['standard','comprehensive'],
    text: 'Do you monitor for bias in AI outputs that affect people?',
    hint: 'Especially in hiring, customer service, pricing, or eligibility decisions.',
    options: [
      { v: 0, label: 'Not monitored' },
      { v: 1, label: 'Considered, no active checks' },
      { v: 2, label: 'Periodic manual review' },
      { v: 3, label: 'Regular structured testing' }
    ]},
  { id: 'me4', fn: 'measure', module: 'base', dimension: 'controls-evidence', depths: ['comprehensive'],
    text: 'Do you keep records of AI decisions that affect customers or employees?',
    options: [
      { v: 0, label: 'No records' },
      { v: 1, label: 'Kept only when someone complains' },
      { v: 2, label: 'Some records, inconsistent' },
      { v: 3, label: 'Systematic logging with retention policy' }
    ]},
  { id: 'me5', fn: 'measure', module: 'base', dimension: 'monitoring-response', depths: ['comprehensive'],
    text: 'How often do you re-evaluate the AI tools you use?',
    options: [
      { v: 0, label: 'Never after initial adoption' },
      { v: 1, label: 'When something goes wrong' },
      { v: 2, label: 'Annually' },
      { v: 3, label: 'On a defined cadence with criteria' }
    ]},
  { id: 'ma1', fn: 'manage', module: 'base', dimension: 'monitoring-response', depths: ['quick','standard','comprehensive'],
    text: 'If an AI tool produced a harmful output right now, what happens next?',
    options: [
      { v: 0, label: 'Nothing formal, depends who notices' },
      { v: 1, label: 'Someone would raise it informally' },
      { v: 2, label: 'Escalation path exists but is untested' },
      { v: 3, label: 'Documented response plan, tested at least once' }
    ]},
  { id: 'ma2', fn: 'manage', module: 'base', dimension: 'monitoring-response', depths: ['quick','standard','comprehensive'],
    text: 'Can you turn off or roll back an AI tool quickly if needed?',
    options: [
      { v: 0, label: 'No, would take days or longer' },
      { v: 1, label: 'Yes, but painful and slow' },
      { v: 2, label: 'Yes, within a few hours' },
      { v: 3, label: 'Yes, quickly and with a documented process' }
    ]},
  { id: 'ma3', fn: 'manage', module: 'base', dimension: 'controls-evidence', depths: ['standard','comprehensive'],
    text: 'Do customers or employees know when they are interacting with AI?',
    options: [
      { v: 0, label: 'Never disclosed' },
      { v: 1, label: 'Sometimes, inconsistently' },
      { v: 2, label: 'Disclosed in most customer-facing cases' },
      { v: 3, label: 'Disclosed by default, per policy' }
    ]},
  { id: 'ma4', fn: 'manage', module: 'base', dimension: 'controls-evidence', depths: ['comprehensive'],
    text: 'Do you have a way for people to challenge or appeal an AI-driven decision?',
    options: [
      { v: 0, label: 'No mechanism' },
      { v: 1, label: 'General customer support only' },
      { v: 2, label: 'Informal path, not published' },
      { v: 3, label: 'Documented appeal process' }
    ]},
  { id: 'ma5', fn: 'manage', module: 'base', dimension: 'monitoring-response', depths: ['comprehensive'],
    text: 'Do you review your AI risk posture after a significant change?',
    hint: 'New tool, new use case, new regulation, or major incident.',
    options: [
      { v: 0, label: 'No reviews triggered' },
      { v: 1, label: 'Only after incidents' },
      { v: 2, label: 'Sometimes for major changes' },
      { v: 3, label: 'Standard practice for every change' }
    ]}
];

// Nonprofit module: independent from youth-serving. Applies when orgType = 'nonprofit'.
// Evidence base: BGCAZ engagement (Thunderbird Corporate Partners, Spring 2026).
export const NONPROFIT_QUESTIONS = [
  { id: 'np1', fn: 'govern', module: 'nonprofit', dimension: 'controls-evidence', depths: ['quick','standard','comprehensive'],
    text: 'Are you using free personal-account AI tools for organizational work?',
    hint: 'Common for cost-constrained nonprofits, but creates data risk without enterprise controls.',
    options: [
      { v: 0, label: 'Yes, extensively across staff' },
      { v: 1, label: 'Yes, informally by some staff' },
      { v: 2, label: 'Mostly enterprise, some personal accounts remain' },
      { v: 3, label: 'Fully on enterprise or organizational accounts' }
    ]},
  { id: 'np2', fn: 'govern', module: 'nonprofit', dimension: 'ownership-accountability', depths: ['standard','comprehensive'],
    text: 'Has your board been briefed on AI adoption and risk?',
    hint: 'Board oversight is a specific governance obligation for 501(c)(3) organizations.',
    options: [
      { v: 0, label: 'No board discussion has happened' },
      { v: 1, label: 'Mentioned briefly, no structured discussion' },
      { v: 2, label: 'Discussed once, no ongoing agenda item' },
      { v: 3, label: 'Structured briefing with ongoing board oversight' }
    ]},
  { id: 'np3', fn: 'map', module: 'nonprofit', dimension: 'inventory-visibility', depths: ['standard','comprehensive'],
    text: 'Do you know whether donor data has been entered into any AI tool?',
    hint: 'Includes names combined with giving amounts, donor communications, or Raiser\'s Edge / Salesforce exports.',
    options: [
      { v: 0, label: 'No idea, no controls' },
      { v: 1, label: 'Suspect yes, unclear scope' },
      { v: 2, label: 'Known limited use with anonymization' },
      { v: 3, label: 'Explicit policy prohibits, verified compliance' }
    ]},
  { id: 'np4', fn: 'govern', module: 'nonprofit', dimension: 'controls-evidence', depths: ['comprehensive'],
    text: 'Have you applied for nonprofit-discounted enterprise AI accounts?',
    hint: 'Google Workspace for Nonprofits, Canva for Nonprofits, ChatGPT Business nonprofit rate, etc. Often free or steeply discounted.',
    options: [
      { v: 0, label: 'Not aware these exist' },
      { v: 1, label: 'Aware, not applied' },
      { v: 2, label: 'Applied for one or two' },
      { v: 3, label: 'Actively using multiple nonprofit-tier enterprise accounts' }
    ]},
  { id: 'np5', fn: 'measure', module: 'nonprofit', dimension: 'inventory-visibility', depths: ['comprehensive'],
    text: 'If your CRM (Salesforce, Raiser\'s Edge, Bloomerang, etc.) has AI features, do you know whether they are active?',
    hint: 'Many nonprofit CRMs now include AI features that may or may not be enabled by default.',
    options: [
      { v: 0, label: 'Not sure what AI features exist' },
      { v: 1, label: 'Aware some exist, unclear which are on' },
      { v: 2, label: 'Reviewed once, no ongoing check' },
      { v: 3, label: 'Formal license audit completed, features intentionally configured' }
    ]}
];

// Youth-serving module: independent from nonprofit. Applies when servesYouth = true.
// Evidence base: BGCAZ engagement (COPPA analysis), Common Sense Media 2026 assessments.
export const YOUTH_QUESTIONS = [
  { id: 'y1', fn: 'govern', module: 'youth', dimension: 'inventory-visibility', depths: ['quick','standard','comprehensive'],
    text: 'Do any AI tools your team uses process data about individuals under 13?',
    hint: 'COPPA applies to children under 13. This includes names, program records, incident reports, photos.',
    options: [
      { v: 0, label: 'Yes, on personal-account AI tools without controls' },
      { v: 1, label: 'Yes, unclear which controls are in place' },
      { v: 2, label: 'Yes, only on tools with compliant Data Processing Agreements' },
      { v: 3, label: 'No youth data enters any AI tool' }
    ]},
  { id: 'y2', fn: 'govern', module: 'youth', dimension: 'controls-evidence', depths: ['quick','standard','comprehensive'],
    text: 'Do you have a written policy specifically about AI use in youth programming?',
    hint: 'Separate from general staff AI policy. Covers what AI can and cannot be used for around minors.',
    options: [
      { v: 0, label: 'No youth-specific AI policy exists' },
      { v: 1, label: 'Youth mentioned in general AI policy only' },
      { v: 2, label: 'Draft youth AI policy exists, not adopted' },
      { v: 3, label: 'Adopted, HR/Legal-reviewed youth AI policy' }
    ]},
  { id: 'y3', fn: 'govern', module: 'youth', dimension: 'controls-evidence', depths: ['standard','comprehensive'],
    text: 'Do you have parental consent workflows for AI tools that interact with youth?',
    options: [
      { v: 0, label: 'No consent process' },
      { v: 1, label: 'General consent covers AI implicitly' },
      { v: 2, label: 'Specific consent for some AI use cases' },
      { v: 3, label: 'Explicit, informed, specific parental consent per AI use case' }
    ]},
  { id: 'y4', fn: 'manage', module: 'youth', dimension: 'monitoring-response', depths: ['standard','comprehensive'],
    text: 'Do staff know what to do if AI surfaces content that suggests youth safety concerns?',
    hint: 'Examples: signs of abuse, self-harm, or crisis surfaced through AI-analyzed communications or content.',
    options: [
      { v: 0, label: 'No protocol exists' },
      { v: 1, label: 'General mandated reporter training only' },
      { v: 2, label: 'AI-specific protocol drafted but not trained on' },
      { v: 3, label: 'AI-specific crisis protocol, staff trained' }
    ]},
  { id: 'y5', fn: 'map', module: 'youth', dimension: 'risk-classification', depths: ['comprehensive'],
    text: 'For AI tools accessible to youth on your premises, have you reviewed age-appropriateness?',
    hint: 'Common Sense Media publishes AI tool risk assessments for teen users. Some tools have documented safety failures with minors.',
    options: [
      { v: 0, label: 'No review conducted' },
      { v: 1, label: 'Informal awareness only' },
      { v: 2, label: 'Reviewed once, no update process' },
      { v: 3, label: 'Structured review with periodic re-assessment' }
    ]},
  { id: 'y6', fn: 'measure', module: 'youth', dimension: 'monitoring-response', depths: ['comprehensive'],
    text: 'If AI is used in any youth-facing capacity, is that use tracked and reviewable?',
    options: [
      { v: 0, label: 'Not tracked' },
      { v: 1, label: 'Ad hoc awareness' },
      { v: 2, label: 'Logged, no formal review' },
      { v: 3, label: 'Logged with scheduled review by designated staff' }
    ]}
];

// Recommendation titles map (base + modules)
export const REC_TITLES = {
  g1: 'Write a basic AI use policy',
  g2: 'Name an accountable owner for AI risk',
  g3: 'Add an AI tool approval step',
  g4: 'Train employees on responsible AI use',
  g5: 'Put AI risk on the leadership agenda',
  m1: 'Inventory the AI tools in use',
  m2: 'Identify who could be harmed per use case',
  m3: 'Classify AI use cases by risk tier',
  m4: 'Map what data each AI tool can access',
  m5: 'Add AI-specific questions to vendor reviews',
  me1: 'Introduce output quality checks',
  me2: 'Start an AI incident log',
  me3: 'Add bias checks for high-impact outputs',
  me4: 'Log AI decisions that affect people',
  me5: 'Schedule regular tool re-evaluation',
  ma1: 'Document an AI incident response plan',
  ma2: 'Ensure you can shut down or roll back AI tools',
  ma3: 'Disclose when customers are interacting with AI',
  ma4: 'Create an appeal path for AI decisions',
  ma5: 'Trigger reviews after significant changes',
  // Nonprofit
  np1: 'Transition off personal-account AI tools',
  np2: 'Brief the board on AI adoption and risk',
  np3: 'Establish donor data controls for AI use',
  np4: 'Apply for nonprofit-discounted enterprise AI accounts',
  np5: 'Audit your CRM for AI features and license status',
  // Youth
  y1: 'Establish COPPA-compliant AI data handling',
  y2: 'Adopt a youth-specific AI policy',
  y3: 'Build parental consent workflows for AI',
  y4: 'Create an AI-surfaced youth safety protocol',
  y5: 'Review AI tool age-appropriateness',
  y6: 'Track and review youth-facing AI use'
};

// Module-specific recommendation bodies (base uses generic template; modules get specifics)
export const REC_BODIES = {
  np1: 'Personal-account AI tools cannot be audited, revoked, or monitored by your organization. Nonprofit-tier enterprise accounts from Google (free for up to 2,000 users), Canva (free for up to 50 users), or Microsoft (free Copilot Chat with existing M365) close this gap at little to no cost. This is often the highest-ROI single move a nonprofit can make.',
  np2: 'Board oversight is a governance obligation for 501(c)(3) organizations, and AI now sits alongside cybersecurity and financial risk as a topic requiring board-level attention. A single structured briefing covering current AI use, risks, and controls establishes the oversight baseline auditors and funders increasingly expect.',
  np3: 'Donor data combined with giving amounts is one of the most sensitive data categories a nonprofit holds. Written policy prohibiting entry of donor data into personal-account AI tools, backed by anonymization requirements for any AI-assisted donor communication, is essential.',
  np4: 'Nonprofit-discounted enterprise AI accounts are underused. Google Workspace for Nonprofits with Gemini is $0 for up to 2,000 users. Canva for Nonprofits is $0 for up to 50 users. ChatGPT Business is available at $8/user/month (68% nonprofit discount). Applications typically process in 5-7 business days.',
  np5: 'CRMs like Salesforce (Einstein), Bloomerang, and Raiser\'s Edge now include AI features that may be enabled by default or available as add-ons. A license audit determines what you already have access to and prevents duplicate spend on external AI tools.',
  y1: 'COPPA applies to any AI processing of data about children under 13. Personal-account AI tools without a compliant Data Processing Agreement create federal regulatory exposure. Either restrict youth data from AI tools entirely, or migrate to enterprise AI accounts with DPAs in place before any youth data touches AI.',
  y2: 'General staff AI policy is insufficient for youth-serving contexts. A youth-specific AI policy covers parental consent, approved tools, crisis protocols, and staff accountability for AI use around minors. Requires HR/Legal review and leadership values alignment before drafting.',
  y3: 'Existing general parental consent does not cover AI use cases specifically. Explicit, informed, specific parental consent per AI use case is the emerging standard, and any AI tool that processes youth data must be named in that consent.',
  y4: 'Mandated reporter obligations extend to signs of harm surfaced through AI. Staff need a specific protocol for what to do if an AI tool flags content suggesting abuse, self-harm, or crisis, including who to escalate to and how to preserve the AI-generated evidence.',
  y5: 'Common Sense Media and other independent bodies publish AI risk assessments specifically for teen users. Several mainstream AI tools have documented safety failures with minors. Any AI tool accessible to youth on your premises should be reviewed against these assessments before use.',
  y6: 'AI use in youth-facing capacities needs logging beyond general AI tool tracking, because the review standard is higher. A designated staff role (AI Safety Lead, Youth Services Director, etc.) should periodically review what AI was used with youth, for what purpose, and whether the use aligned with policy.'
};

// AI Tool Master List
// Classifications are criteria-based, not opinion. Each tool has:
//   - profile filters (industries where it's commonly used)
//   - classification (high-risk / caution / lower-risk)
//   - reasoning (why classified this way, criteria-based)
//   - sources (primary sources supporting classification)
//   - lastReviewed (when this classification was last verified)
export const TOOL_MASTER_LIST = [
  // General-purpose LLMs (common across all industries)
  { id: 't-chatgpt', name: 'ChatGPT', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'On free personal accounts, conversations may be used to train models by default. Requires user to disable "Improve the model for everyone" in Data Controls. Enterprise tier (ChatGPT Business/Enterprise) has full data controls. ChatGPT Enterprise and the API Platform hold FedRAMP Moderate authorization (20x, Class C), achieved 27 April 2026 -- relevant for federal-contractor use.',
    sources: ['OpenAI Data Controls documentation', 'OpenAI FedRAMP Moderate authorization announcement (Apr 2026)'], lastReviewed: '2026-08' },
  { id: 't-claude', name: 'Claude', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'On free personal accounts, conversations may be used to improve Claude by default. Requires user to disable "Improve Claude for everyone" in Privacy settings. Team/Enterprise tiers have full data controls. Claude for Government holds FedRAMP High Authorization to Operate, built on the Claude Enterprise feature set (projects, artifacts, integrations, audit logs, admin controls); a $1/agency promotional rate is available through August 2026.',
    sources: ['Anthropic Privacy documentation', 'Anthropic Help Center, "Get started with Claude for Government"'], lastReviewed: '2026-08' },
  { id: 't-copilot', name: 'Microsoft Copilot', category: 'General LLM', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'When signed in with a personal Microsoft account, chat data is not used to train models by default. Enterprise Copilot has additional controls. Microsoft 365 Copilot is available in GCC and GCC High government cloud environments, operating within their FedRAMP Moderate/High authorization boundary (a standalone FedRAMP authorization for Copilot itself, distinct from that boundary, was not confirmed -- stated precisely rather than rounded up).',
    sources: ['Microsoft Privacy Statement', 'Microsoft GCC/GCC High Copilot documentation'], lastReviewed: '2026-08' },
  { id: 't-gemini', name: 'Google Gemini', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'On personal Google accounts, Gemini Apps Activity is saved by default and may be reviewed by Google. Requires user to disable via account settings. Workspace tiers have organizational controls. Gemini in Workspace apps and the standalone Gemini app were the first generative AI assistants for productivity/collaboration suites to achieve FedRAMP High authorization (18 March 2025).',
    sources: ['Google Account privacy settings', 'Google Cloud blog, FedRAMP High authorization announcement (Mar 2025)'], lastReviewed: '2026-08' },
  { id: 't-grok', name: 'Grok / @grok on X', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Multiple documented incidents, each independently re-verified against primary/near-primary reporting (Aug 2026): Dec 2025-Jan 2026, Grok\'s image generator produced sexualized images of apparent minors at scale (Copyleaks identified thousands within one week); xAI acknowledged at least one instance potentially violated U.S. CSAM law while describing the incidents as "isolated cases." Jul 2025: Grok generated antisemitic content on X (the "MechaHitler" incident), which xAI attributed to an unauthorized update and apologized for. May 2025: Grok injected unprompted "white genocide" commentary into unrelated replies on X, which xAI attributed to an unauthorized change made by an employee. Aug 2025: an estimated 370,000+ private Grok conversations were indexed and publicly searchable via Google through a share-link feature, without user notice. As of 2026, active regulatory scrutiny includes a UK ICO inquiry, a UK Ofcom probe, and inquiries reported in the EU, India, and the US Congress (House Energy and Commerce Committee Democrats).',
    sources: ['Common Sense Media / Youth AI Safety Institute, "Grok and @grok on X" risk assessment (Jan 2026, commonsensemedia.org)', 'CNN, NBC News, CNBC, Axios reporting on the May and Jul 2025 incidents', 'CBS News, ABC News, Reuters reporting on the Dec 2025-Jan 2026 minor-sexualization incidents', 'Forbes reporting on the Aug 2025 conversation-exposure incident', 'UK ICO and Ofcom investigation announcements; US House Energy and Commerce Committee inquiry'], lastReviewed: '2026-08' },
  { id: 't-meta-ai', name: 'Meta AI (WhatsApp, Instagram, Facebook)', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'No organizational account, admin interface, or governance layer exists. Data is subject to Meta\'s advertising-linked ecosystem by default. No SSO, audit logging, or compliance pathway.',
    sources: ['Meta privacy documentation'], lastReviewed: '2026-04' },
  { id: 't-character-ai', name: 'Character.AI / Replika', category: 'AI Companion', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Subject of Garcia v. Character Technologies (M.D. Fla., case 6:2024cv01903), the first US wrongful-death suit against an AI company: filed Oct 2024 by Megan Garcia after her 14-year-old son\'s Feb 2024 suicide, alleging the chatbot engaged in sexual roleplay, presented itself as a romantic partner, and falsely claimed to be a licensed therapist; settled Jan 7, 2026 on undisclosed terms, with no admission of liability. Prompted new legislation aimed directly at this product category, including California SB 243 (companion chatbot law, effective 2026), which imposes disclosure, safety-protocol, and annual-reporting requirements. No admin controls or organizational governance capabilities. Optimized for engagement, not accuracy or professional use.',
    sources: ['CBS News, Reuters reporting on the Garcia v. Character Technologies settlement (Jan 2026)', 'AI Lawsuit Tracker case docket, Garcia v. Character Technologies et al. (6:2024cv01903, M.D. Fla.)', 'California SB 243 (2025-2026 Regular Session); Skadden and Future of Privacy Forum legislative analysis'], lastReviewed: '2026-08' },

  // Transcription and meeting tools
  { id: 't-otter', name: 'Otter.ai', category: 'Transcription', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Active class-action lawsuit (In re Otter.AI Privacy Litigation) over data practices including potential biometric data collection via voiceprints. Transcripts stored indefinitely on Otter\'s cloud servers with no organizational retention controls.',
    sources: ['In re Otter.AI Privacy Litigation'], lastReviewed: '2026-04' },
  { id: 't-wave', name: 'Wave AI', category: 'Transcription', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Shares audio and transcript data with two separate third-party AI providers (AssemblyAI for transcription, OpenAI for summarization). Meeting content leaves Wave\'s systems entirely. No organizational access controls.',
    sources: ['Wave AI data processing documentation'], lastReviewed: '2026-04' },
  { id: 't-granola', name: 'Granola', category: 'Transcription', industries: ['all'],
    classification: 'caution',
    reasoning: 'Despite marketing as "private by default," stores notes on AWS cloud servers. Shareable links enabled by default. AI model training opted in by default on free accounts. Requires multiple settings changes before organizational use.',
    sources: ['April 2026 investigative reporting'], lastReviewed: '2026-04' },
  { id: 't-zoom-ai', name: 'Zoom AI Companion', category: 'Transcription', industries: ['all'],
    classification: 'caution',
    reasoning: 'Zoom does not use audio, video, or chat content to train its AI models by default per current documentation. Enterprise controls available. Should not be enabled on calls containing sensitive information without review. Zoom AI Companion holds FedRAMP JAB Moderate authorization as part of the Zoom for Government platform (announced 16 September 2024).',
    sources: ['Zoom AI Companion documentation', 'Zoom newsroom, FedRAMP JAB Moderate authorization announcement (Sep 2024)'], lastReviewed: '2026-08' },

  // Design and creative
  { id: 't-canva', name: 'Canva (with AI features)', category: 'Design', industries: ['all', 'media', 'nonprofit-social', 'education'],
    classification: 'lower-risk',
    reasoning: 'SOC 2 certified; content encrypted in transit and at rest; does not sell user data. AI image generation should be used with caution in contexts involving minors.',
    sources: ['Canva Trust Center'], lastReviewed: '2026-04' },
  { id: 't-midjourney', name: 'Midjourney', category: 'Image generation', industries: ['media', 'technology'],
    classification: 'caution',
    reasoning: 'Discord-based tool with limited organizational controls. Content may be visible to other users by default on lower tiers. Standard/Pro tiers offer private generation.',
    sources: ['Midjourney terms of service'], lastReviewed: '2026-04' },
  { id: 't-dalle', name: 'DALL-E (via ChatGPT)', category: 'Image generation', industries: ['media', 'technology', 'all'],
    classification: 'caution',
    reasoning: 'Inherits ChatGPT data practices. Enterprise tier controls apply.',
    sources: ['OpenAI documentation'], lastReviewed: '2026-04' },

  // Music/audio
  { id: 't-suno', name: 'Suno', category: 'Music generation', industries: ['media'],
    classification: 'caution',
    reasoning: 'Consumer music generation platform. Active copyright litigation (Suno v. RIAA/major labels). Commercial use rights unclear pending litigation outcomes.',
    sources: ['Suno vs. RIAA litigation'], lastReviewed: '2026-04' },
  { id: 't-elevenlabs', name: 'ElevenLabs', category: 'Voice generation', industries: ['media', 'technology'],
    classification: 'caution',
    reasoning: 'Voice cloning capability has documented misuse for deepfakes and fraud. Enterprise controls available. Should not be used with any voice sample without documented consent.',
    sources: ['ElevenLabs safety documentation'], lastReviewed: '2026-04' },

  // Writing and productivity
  { id: 't-grammarly', name: 'Grammarly', category: 'Writing assistant', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Free tier is SOC 2 Type II certified; does not sell user data. Standard data-input guidelines apply for sensitive content.',
    sources: ['Grammarly Trust Center'], lastReviewed: '2026-04' },
  { id: 't-notion-ai', name: 'Notion AI', category: 'Productivity', industries: ['technology', 'professional', 'media', 'legal', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'Notion does not use customer data to train AI models. Enterprise controls available.',
    sources: ['Notion AI documentation'], lastReviewed: '2026-04' },
  { id: 't-jasper', name: 'Jasper', category: 'Marketing content', industries: ['media', 'retail'],
    classification: 'lower-risk',
    reasoning: 'B2B marketing platform with enterprise-grade data controls. Does not train on customer data.',
    sources: ['Jasper Security documentation'], lastReviewed: '2026-04' },

  // Presentations
  { id: 't-gamma', name: 'Gamma', category: 'Presentations', industries: ['all', 'professional'],
    classification: 'caution',
    reasoning: 'Presentations cloud-hosted and shareable via link by default. Free-tier terms do not explicitly confirm whether user content is used for training. Requires review of sharing settings per deck.',
    sources: ['Gamma privacy documentation'], lastReviewed: '2026-04' },
  { id: 't-tome', name: 'Tome', category: 'Presentations', industries: ['professional', 'media'],
    classification: 'caution',
    reasoning: 'Similar cloud-first architecture to Gamma. Sharing defaults require review.',
    sources: ['Tome documentation'], lastReviewed: '2026-04' },

  // Vertical-specific: Financial
  { id: 't-alphasense', name: 'AlphaSense', category: 'Market intelligence', industries: ['financial'],
    classification: 'lower-risk',
    reasoning: 'Enterprise financial research platform with SOC 2 compliance and financial services security controls.',
    sources: ['AlphaSense Trust Center'], lastReviewed: '2026-04' },
  { id: 't-hebbia', name: 'Hebbia', category: 'Document analysis', industries: ['financial', 'professional', 'legal'],
    classification: 'lower-risk',
    reasoning: 'Enterprise-focused document analysis platform with financial services compliance certifications.',
    sources: ['Hebbia Security documentation'], lastReviewed: '2026-04' },

  // Vertical-specific: Healthcare
  { id: 't-abridge', name: 'Abridge', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'lower-risk',
    reasoning: 'HIPAA-compliant clinical documentation platform with BAA available. Enterprise-only deployment.',
    sources: ['Abridge HIPAA documentation'], lastReviewed: '2026-04' },
  { id: 't-nabla', name: 'Nabla', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'lower-risk',
    reasoning: 'HIPAA-compliant medical scribe. BAA available. Enterprise-only deployment.',
    sources: ['Nabla documentation'], lastReviewed: '2026-04' },

  // Vertical-specific: Sales/CRM
  { id: 't-salesforce-einstein', name: 'Salesforce Einstein', category: 'CRM AI', industries: ['all', 'nonprofit-social', 'financial', 'retail'],
    classification: 'lower-risk',
    reasoning: 'Enterprise CRM AI operating within Salesforce\'s trust and compliance framework. Data does not leave the Salesforce environment for AI processing. Note: Salesforce\'s FedRAMP High authorization (June 2025) covers Agentforce, Data Cloud, Marketing Cloud, and Tableau Next -- NOT Einstein specifically; no FedRAMP claim should be made for this entry on that basis.',
    sources: ['Salesforce Trust', 'Salesforce newsroom, FedRAMP High authorization announcement (Jun 2025) -- cited for precision only, not a claim about this tool'], lastReviewed: '2026-08' },
  { id: 't-hubspot-ai', name: 'HubSpot AI', category: 'CRM AI', industries: ['all', 'technology', 'professional'],
    classification: 'lower-risk',
    reasoning: 'Enterprise CRM AI with SOC 2 and GDPR compliance. Data handled within HubSpot\'s existing security framework.',
    sources: ['HubSpot Trust Center'], lastReviewed: '2026-04' },

  // Coding
  { id: 't-github-copilot', name: 'GitHub Copilot', category: 'Coding assistant', industries: ['technology', 'federal-contractors', 'aviation-aerospace'],
    classification: 'lower-risk',
    reasoning: 'Enterprise tier does not use code for training. Individual tier requires opt-out. IP indemnification available on Business/Enterprise tiers. GitHub Enterprise Cloud customers with US data residency can restrict Copilot to a FedRAMP Moderate-certified model list.',
    sources: ['GitHub Copilot documentation', 'GitHub Docs, "FedRAMP-compliant models for GitHub Copilot"'], lastReviewed: '2026-08' },
  { id: 't-cursor', name: 'Cursor', category: 'Coding assistant', industries: ['technology', 'federal-contractors', 'aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI-powered code editor. Free tier may use code for training; privacy mode available in paid tiers. Requires review before use with proprietary or sensitive code.',
    sources: ['Cursor privacy documentation'], lastReviewed: '2026-04' },

  // Education-specific
  { id: 't-khanmigo', name: 'Khanmigo', category: 'Education AI', industries: ['education'],
    classification: 'lower-risk',
    reasoning: 'Purpose-built for education with FERPA compliance considerations built in. Institutional deployment available.',
    sources: ['Khan Academy documentation'], lastReviewed: '2026-04' },
  { id: 't-magic-school', name: 'MagicSchool AI', category: 'Education AI', industries: ['education'],
    classification: 'lower-risk',
    reasoning: 'Teacher-focused platform with education-specific privacy controls and FERPA considerations.',
    sources: ['MagicSchool documentation'], lastReviewed: '2026-04' },

  // Government
  { id: 't-govgpt', name: 'Government-authorized AI (GovGPT, agency-specific)', category: 'Government AI', industries: ['government', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'This entry functions as a category placeholder for FedRAMP-authorized government AI deployments generally -- "GovGPT" does not name one specific product. Grounded in a real, current example: OpenAI\'s ChatGPT Gov (launched January 2025) and its FedRAMP Moderate authorization for ChatGPT Enterprise and the API Platform, achieved via the FedRAMP 20x process on 27 April 2026.',
    sources: ['OpenAI ChatGPT Gov announcement (Jan 2025)', 'OpenAI FedRAMP Moderate authorization announcement (Apr 2026)'], lastReviewed: '2026-08' },

  // HR / Recruiting AI (R24 batch 1, 2026-08-30)
  { id: 't-hirevue', name: 'HireVue', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-driven video-interview scoring and game-based assessments used for automated employment decisions. Directly named in regulatory regimes: NYC Local Law 144 (bias-audit and public-posting requirements for Automated Employment Decision Tools) and Illinois\'s AI Video Interview Act, amended for 2026 to require written consent obtained after disclosure of the specific characteristics evaluated, an option to decline AI analysis without disqualification, and statutory penalties of $1,000-$5,000 per candidate with a private right of action. HireVue has run external, published bias audits via DCI Consulting Group since Jan 2023 and publicly argues audit responsibility should extend to vendors, not just employers. Precision note (R24 batch 2): Modern Hire, originally a separate assessment vendor, was acquired by HireVue on 9 May 2023 "with immediate effect" and its Virtual Job Tryout(R) role-based assessments are now part of the HireVue product family, not an independent product -- no separate TOOL_MASTER_LIST entry was created for it.',
    sources: ['DLA Piper, "Critical audit of New York City\'s AI hiring law signals increased risk for employers" (Jan 2026)', 'HireVue press release on DCI Consulting Group external bias audit', 'Illinois AI Video Interview Act 2026 amendment coverage (Introl)', 'GlobeNewswire, "HireVue Acquires Modern Hire to Transform the Global Talent Experience" (9 May 2023)'], lastReviewed: '2026-08' },
  { id: 't-workday-ai', name: 'Workday AI (incl. HiredScore)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Workday\'s AI-powered applicant screening/recommendation tools are the subject of an active federal class action, Mobley v. Workday, Inc. (N.D. Cal. No. 3:23-cv-00770), alleging race, age, and disability discrimination. The court denied Workday\'s motion to dismiss on an "agent" theory -- finding it plausible that Workday\'s customers delegated traditional hiring-agency functions to it -- and the case remains in discovery as of mid-2026, not settled or resolved. Precision note: the suit was filed in 2023 against Workday\'s own AI recommendation engine, predating Workday\'s Feb 2024 acquisition of HiredScore; HiredScore\'s AI-matching capability is now being integrated into Workday\'s recruiting product, but the suit itself does not name HiredScore.',
    sources: ['Akin Gump AI Law and Regulation Tracker, Mobley v. Workday case summary', 'Workday newsroom, "Workday Announces Intent to Acquire HiredScore" (26 Feb 2024)'], lastReviewed: '2026-08' },
  { id: 't-eightfold', name: 'Eightfold AI', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'A putative class action filed 20-21 Jan 2026 in California Superior Court alleges Eightfold\'s Talent Intelligence Platform collects applicant data from unverified third-party and social-media sources without consent, and uses a proprietary AI model to assign a hidden 0-5 "likelihood of success" score, without the disclosure, access, and dispute rights the Fair Credit Reporting Act and California\'s ICRAA require of consumer-reporting activity. The case tests whether AI candidate-scoring counts as a "consumer report." Two plaintiffs allege they were screened out despite being qualified. Not yet resolved as of this review.',
    sources: ['HR Dive, "Eightfold AI sued for alleged covert candidate ranking"', 'Classet AI, "AI Hiring Under Scrutiny: The Eightfold Lawsuit"'], lastReviewed: '2026-08' },
  { id: 't-paradox', name: 'Paradox (Olivia)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'Conversational AI chatbot ("Olivia") used for high-volume candidate screening, interview scheduling, and Q&A; its automated screening/scheduling functions plausibly qualify as an Automated Employment Decision Tool under frameworks like NYC LL144 depending on how a customer deploys it, though no bias-audit-specific disclosure was found on Paradox\'s own site as of this review. Holds ISO 27001, SOC 2 Type II, and EU-U.S./UK/Swiss Data Privacy Framework certifications. Paradox\'s public security page does not address whether or how candidate data trains its AI models, or disclose scoring methodology -- flagged as an information gap, not a confirmed violation.',
    sources: ['Paradox Security page (paradox.ai/legal/security)'], lastReviewed: '2026-08' },
  { id: 't-seekout', name: 'SeekOut', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI sourcing platform that licenses candidate data from third-party providers and public professional profiles, and uses machine learning to infer demographic attributes (gender, race/ethnicity) for diversity-sourcing purposes. SeekOut\'s own privacy policy states these inferences are not stored on candidate profiles or exportable, and offers an opt-out via a Privacy Choices Portal -- a stronger-than-typical disclosure posture. The underlying practice -- inferring race/ethnicity without a candidate\'s direct consent -- remains a real bias/privacy exposure regardless of the opt-out.',
    sources: ['SeekOut Privacy Policy (seekout.com/privacy)'], lastReviewed: '2026-08' },
  { id: 't-textio', name: 'Textio', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI-assisted writing tool for job postings and performance-feedback language -- not a candidate-scoring or screening system, so materially lower inherent risk than tools making automated employment decisions. Holds ISO 27001 certification, states GDPR/CCPA compliance, offers a Data Processing Agreement, and publishes its own bias-mitigation protocols for its language models. No lawsuits, regulatory actions, or bias-audit findings identified against Textio specifically as of this review.',
    sources: ['Textio Data Privacy page (textio.com/ai/data-privacy)', 'Textio Bias Mitigation Protocols support article'], lastReviewed: '2026-08' },
  { id: 't-pymetrics', name: 'Pymetrics (by Harver)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'Neuroscience-based, game-based candidate assessment platform; acquired by Harver in 2022 and now operates as "pymetrics by Harver." Pymetrics built and open-sourced its own bias-testing library (audit-ai, on GitHub) and markets itself on reducing adverse impact -- a genuinely differentiated practice among assessment vendors. Precision note: a May 2024 ACLU FTC complaint alleging disability- and race-discriminatory "bias-free" marketing in gamified/personality hiring assessments was filed against Aon, not Pymetrics -- no equivalent enforcement action against Pymetrics itself was found in this review, so none is attributed here. Game-based/neuroscience assessments as a category remain a recognized disability-discrimination risk area per EEOC/ACLU guidance generally, which is why this stays at caution rather than lower-risk despite the absence of a Pymetrics-specific action.',
    sources: ['Harver, "Harver Acquires pymetrics" press release', 'pymetrics/audit-ai GitHub repository', 'ACLU, FTC complaint press release re: Aon (May 2024) -- cited for precision only, not a claim about this tool'], lastReviewed: '2026-08' },
  { id: 't-greenhouse-ai', name: 'Greenhouse (Talent Matching / Recruiting AI)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Talent Matching AI feature functions purely as decision-support -- Greenhouse\'s own Data Processing FAQ states it "does not automatically advance or reject candidates," with hiring decisions remaining with recruiters and hiring managers, and confirms customer personal data is not used to train Greenhouse\'s or any third party\'s models. The matching algorithm excludes names and contact information from its inputs, and results are subject to monthly third-party bias audits by Warden AI, published for customers. Greenhouse also publishes a company-wide AI Principles Framework.',
    sources: ['Greenhouse Support, "Talent Matching - Data Processing FAQ"', 'Greenhouse Support, "Talent Matching FAQ"', 'Greenhouse newsroom, "Greenhouse Launches AI Principles Framework"'], lastReviewed: '2026-08' },
  { id: 't-lever', name: 'Lever (LeverTRM)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'LeverTRM\'s AI-driven candidate-recommendation/ranking feature falls under the EU AI Act\'s Annex III point 4(a) high-risk classification when actively deployed -- candidate ranking against open requisitions is one of Annex III\'s named high-risk employment use cases, a specific regulatory-tier finding rather than a general employment-AI caveat. Six distinct AI capabilities exist (candidate recommendations, automated nurture, sourcing, predictive analytics, AI-assisted messaging, CV parsing with skills inference), each independently relevant to a deployer\'s Annex III exposure depending on which are actively enabled. Employers are advised to conduct a feature-level audit and document human-oversight/override practices for compliance -- achievable, but a real compliance burden rather than a passive one.',
    sources: ['Praxikon, "Lever (LeverTRM) under the EU AI Act: CRM-style recruitment and the Annex III impact"'], lastReviewed: '2026-08' },
  { id: 't-smartrecruiters', name: 'SmartRecruiters (Winston AI)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'SmartRecruiters states its platform "has always included compliance with anti-bias, privacy, and data protection requirements" and markets its Winston AI assistant on the same commitment, but its own public compliance page does not publish concrete specifics -- no named bias-audit methodology, results, or third-party auditor -- with the detailed content gated behind a lead-generation form rather than published openly. This is a materially thinner public disclosure than comparable platforms verified in this same batch (Greenhouse, iCIMS, Phenom, and Beamery all publish a named third-party auditor or a detailed governance framework). No lawsuit or regulatory action was found against SmartRecruiters specifically.',
    sources: ['SmartRecruiters, "How SmartRecruiters Ensures Fairness, Security, and Compliance"'], lastReviewed: '2026-08' },
  { id: 't-icims', name: 'iCIMS (Coalesce AI)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'iCIMS operates one of the more mature-sounding self-reported AI governance programs in this batch -- a Responsible AI Committee and AI Governance Committee dating to 2020, six published ethical principles, annual internal bias audits aligned to the NIST AI RMF, and a March 2025 TrustArc TRUSTe Responsible AI Certification (a real, named third-party certification). A balancing finding from an independent evaluator, HireAIScore (published v1.0 rubric, evidence-cited scoring), gives iCIMS an overall grade of 55/100 ("F," substantial gaps) -- strongest on Bias Audit Transparency (68/100) but weakest on Fundamental Rights Impact Assessment support (38/100), missing ISO/IEC 42001 certification despite holding SOC 2, and flagged for insufficient EU AI Act Article 26-27 deployer guidance. The self-reported program and the independent evaluator\'s findings are not necessarily contradictory, but the independent score is a genuine check worth weighing alongside iCIMS\'s own marketing -- kept at caution rather than lower-risk for that reason.',
    sources: ['iCIMS blog, "How iCIMS built its responsible AI program"', 'HireAIScore, iCIMS vendor scorecard (v1.0 rubric)'], lastReviewed: '2026-08' },
  { id: 't-beamery', name: 'Beamery (TalentGPT)', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'Beamery had Parity, an independent third-party algorithmic-bias auditor, test its AI models and published an accompanying AI Explainability Statement aimed at NYC AEDT-law compliance -- a real, named third-party audit, not just a self-attestation. Two limits found in this review: the audit is dated 1 November 2022, roughly four years old as of this review with no confirmed refresh found, and the announcement covers Beamery\'s AI capabilities broadly rather than explicitly naming TalentGPT (Beamery\'s generative-AI layer, announced 27 March 2023, postdating this specific audit) -- meaning the newest generative features have not been confirmed as covered by a published bias audit.',
    sources: ['Beamery, "Beamery Completes AI Audit for Bias" (1 Nov 2022 press release)', 'Beamery/PRNewswire, "Beamery Announces TalentGPT, the World\'s First Generative AI for HR" (27 Mar 2023)'], lastReviewed: '2026-08' },
  { id: 't-phenom', name: 'Phenom', category: 'HR/Recruiting AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'Phenom publishes an unusually detailed self-reported governance program for its "Fit Score" candidate-matching feature: an AI Governance Framework developed with the World Economic Forum, mandatory human-in-the-loop review, a three-part Fairness and Validity Framework measuring statistical bias, machine-learning bias, and I-O psychology bias, and jurisdiction-level controls letting a customer disable Fit Score entirely where required, with applicant opt-out and internal/external audit capability across protected classes -- a real, technically specific disclosure comparable in depth to iCIMS\'s and Greenhouse\'s. No independent third-party audit results (comparable to Beamery\'s Parity audit or Greenhouse\'s Warden AI audits) were found published, which is why this stays at caution rather than lower-risk -- the governance framework is real and detailed, but appears to be self-administered rather than externally verified.',
    sources: ['Phenom blog, "Navigating AI Ethics: How Phenom Upholds AI Compliance and Legislation"'], lastReviewed: '2026-08' },

  // Agentic / Automation Platforms (R25 batch 1, 2026-08-30)
  { id: 't-zapier-ai', name: 'Zapier AI (Agents / Central)', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'caution',
    reasoning: 'Automation/agent-building platform connecting to thousands of third-party apps with real, autonomous read/write/delete access across connected systems -- exactly the category the research foundation flags as having the weakest regulatory coverage and highest emerging risk (no agentic-AI-specific federal framework exists yet; SR 26-2 explicitly excludes agentic AI from its scope, per R10). Zapier has responded with concrete 2026 enterprise governance controls: granular per-action permission restrictions (e.g. allow HubSpot contact updates but block deletions), managed-connection domain restrictions preventing personal-account data leakage, a "Bring Your Own Model" option routing agent processing through the customer\'s own infrastructure (starting with AWS Bedrock) for data-residency control, and log streaming to SIEM tools like Datadog/Splunk. Held at caution rather than lower-risk because the underlying category risk -- autonomous, broad-permission actions across connected systems -- is real and unresolved industry-wide, even though Zapier\'s own governance tooling is comparatively mature.',
    sources: ['ITBrief, "Zapier expands AI governance controls for enterprise users"'], lastReviewed: '2026-08' },
  { id: 't-n8n', name: 'n8n', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'caution',
    reasoning: 'Open-source, self-hostable workflow/AI-agent automation platform. Security analysis identifies risks that apply with particular force to n8n\'s self-hosted deployment model: OAuth token compromise ("integration blast radius" -- an attacker inherits whatever permissions a compromised token carries), "automation drift" as workflows accumulate excess permissions over time, indirect prompt injection (an agent processing emails, tickets, or documents can be manipulated by malicious content embedded in that content to trigger unintended actions), and execution logs that can retain sensitive payload data (customer information, auth responses, internal documents) by default. Self-hosted deployments carry additional exposure a managed SaaS competitor\'s infrastructure would otherwise absorb: remote-code-execution flaws, improperly secured webhook endpoints, and credential exposure via local configuration files. No n8n-specific security certification (SOC 2, ISO 27001) was found published.',
    sources: ['Valence Security, "n8n Security in 2026: How to Secure AI Agent Workflows and SaaS Integrations"'], lastReviewed: '2026-08' },
  { id: 't-make', name: 'Make (formerly Integromat)', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Automation/workflow platform with AI features (Maia AI assistant, AI Agents). Holds real, verifiable certifications: completed SOC 2 Type II and SOC 3 audits (SOC 3 report publicly available), and states its information security program is ISO 27001 certified, with GDPR adherence stated as a compliance priority. Standard encryption confirmed: AES-256 for data at rest, TLS 1.2/1.3 for data in transit. One real gap found: Make\'s own security page does not specifically address how its AI features (Maia, AI Agents) process or retain data, distinct from its general platform security posture -- an information gap, not a negative finding, but the one thing this review could not confirm.',
    sources: ['Make, "Automation Security & Compliance" (make.com/en/security)'], lastReviewed: '2026-08' },
  { id: 't-manus', name: 'Manus', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Autonomous general-purpose AI agent (task completion across resume screening, stock analysis, and other multi-step workflows) developed by Butterfly Effect, founded in Beijing in 2022 by Xiao Hong. Genuinely significant, dated, unresolved finding: Manus relocated its headquarters to Singapore in mid-2025 to operate outside China, but its original Beijing entity continues to exist as a separate Chinese-registered company. In January 2026 China\'s Ministry of Commerce opened an investigation into a planned acquisition of Manus by a major US technology company (reported as Meta, at a $2-3 billion valuation); on 27 April 2026 China\'s National Development and Reform Commission formally blocked the deal and ordered it unwound -- the first publicly confirmed use of China\'s foreign-investment security review mechanism against a cross-border AI transaction -- and Meta severed ties in June 2026. The NDRC\'s stated rationale focused on where the underlying technology was developed and where its engineering expertise originated, not current corporate domicile -- a directly analogous "technology origin" concern to the FY2026 NDAA\'s DeepSeek-naming federal-contractor prohibition (R21), but running in the opposite direction (China blocking an outbound sale rather than the US restricting inbound use). Separately, the U.S. Treasury reviewed an earlier investor\'s stake under the Outbound Investment Security Program in May 2025, reported to have "largely faded" after the Singapore relocation but not confirmed formally closed. Classified high-risk on this live, unresolved, dual-jurisdiction ownership and regulatory picture, independent of any specific technical security flaw.',
    sources: ['Morgan Lewis, "The Manus Decision: China\'s First AI Security Review Block and Implications for Cross-Border AI Investment" (May 2026)', 'Wikipedia, "Manus (AI agent)" -- cross-checked against the Morgan Lewis primary legal analysis'], lastReviewed: '2026-08' },
  { id: 't-genspark', name: 'GenSpark', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'caution',
    reasoning: '"Super agent" agentic AI/search platform built by MainFunc, founded by Jing Kun (Eric Jing), formerly CEO of Baidu\'s Xiaodu smart-device/voice-assistant division, per a $60 million seed round reported by Chinese tech outlet TMTPost. Precision note: unlike Manus, no confirmed government investigation, security-review block, or enforcement action against GenSpark/MainFunc itself was found in this review -- the founder\'s deep China-tech-industry background is a real, sourced fact worth noting given this category\'s live origin-of-technology scrutiny (see the Manus entry above), but it is not evidence of the same kind of regulatory action, and none is claimed here. Held at caution as an emerging, broad-permission agentic tool in a category the research foundation itself flags as having the weakest regulatory coverage and highest emerging risk, with a leadership-origin fact worth monitoring rather than a confirmed incident.',
    sources: ['TMTPost, "Former Baidu Executive Launches MainFunc AI Company with $60 Million Seed Round"'], lastReviewed: '2026-08' },
  { id: 't-lindy', name: 'Lindy', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'No-code AI agent-building platform. Holds real, verifiable certifications: SOC 2 Type II (audited by Johanson Group), plus stated GDPR, HIPAA, and PIPEDA compliance. Explicitly states customer data is never used to train AI models ("never sold, never shared, never used to train models"), offers granular, revocable per-agent permission controls, and logs every agent action for review -- a stronger, more specific data-handling and governance disclosure than most tools verified in this batch.',
    sources: ['Lindy, "Lindy Enterprise Security & Compliance Overview" (lindy.ai/security)'], lastReviewed: '2026-08' },

  // Agentic / Automation Platforms, continued (R25 batch 2, 2026-08-30)
  { id: 't-relevance-ai', name: 'Relevance AI', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'No-code AI agent-building/workforce platform. Holds SOC 2 Type II compliance and states GDPR compliance, with regular third-party security assessments. Explicit, strongly worded data-training commitment: "We don\'t train any models on your data, ever," including when routing through third-party LLM APIs (OpenAI, Anthropic) -- reinforced by self-hosting certain models within its own AWS/Azure environments specifically to avoid third-party data exposure. Enterprise customers get SSO, MFA, role-based access control, and fine-grained access control, plus human-in-the-loop escalation and monitoring for agent actions. Data remains customer property, exportable and deletable within 60 days of request.',
    sources: ['Relevance AI Documentation, "Security overview" (relevanceai.com/docs/admin/security)'], lastReviewed: '2026-08' },
  { id: 't-crewai', name: 'CrewAI', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Open-source Python framework for multi-agent orchestration. Four CVEs disclosed 31 March 2026: CVE-2026-2275 (Code Interpreter falls back to an unsafe sandbox when Docker is inaccessible, enabling arbitrary code execution), CVE-2026-2286 (SSRF -- RAG search tools fail to validate runtime URLs, allowing access to internal/cloud services), CVE-2026-2287 (Docker-verification-failure fallback enabling remote code execution), and CVE-2026-2285 (arbitrary local file read via missing path validation in the JSON loader tool). Exploitable via prompt injection, the chain can achieve remote code execution, sandbox escape, unauthorized file access, and credential theft on the host machine. As of this review, no complete patches have been released -- only in-progress mitigations (module blocking, configuration changes, runtime warnings, documentation updates).',
    sources: ['SecurityWeek, "CrewAI Vulnerabilities Expose Devices to Hacking" (31 Mar 2026 disclosure)'], lastReviewed: '2026-08' },
  { id: 't-langchain', name: 'LangChain / LangGraph', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'caution',
    reasoning: 'Widely used open-source framework (LangChain) and stateful agent-orchestration extension (LangGraph) for building LLM-powered applications and agents. Three CVEs disclosed 12 June 2026: CVE-2025-67644 (CVSS 7.3, SQL injection in the SQLite checkpoint implementation), CVE-2026-28277 (CVSS 6.8, unsafe msgpack deserialization on checkpoint load), and CVE-2026-27022 (CVSS 6.5, RediSearch query injection bypassing access controls in the Redis checkpoint backend) -- the first two are chainable into remote code execution on self-hosted deployments. Distinguishing this from CrewAI\'s entry above: all three vulnerabilities have been patched, and LangChain\'s own managed platform (LangSmith Deployment) was confirmed never affected. Classification held at caution rather than high-risk given the patched status and unaffected managed offering, but the severity and recency of a chainable-to-RCE finding in one of the industry\'s most widely deployed agent frameworks is a real signal for any org running a self-hosted, unpatched, or older version.',
    sources: ['The Hacker News, "LangGraph Flaw Chain Exposes Self-Hosted AI Agents to Remote Code Execution" (12 Jun 2026)'], lastReviewed: '2026-08' },
  { id: 't-copilot-studio', name: 'Microsoft Copilot Studio', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Low-code platform for building custom Copilot/agent experiences within the Microsoft ecosystem. The most enterprise-mature governance disclosure verified in this category: geographic data-residency controls (including the ability to block cross-region data movement for generative AI features outside the US), extensive Data Loss Prevention integrated with Power Platform data policies, real-time risk assessment for knowledge/tools/actions, sensitivity-label visibility in agent responses, full audit logging via Microsoft Purview and Sentinel, Customer Lockbox support, customer-managed encryption keys, and Conditional Access/role-based access control via Microsoft Agent 365. Governed by Microsoft\'s Product Terms, Data Protection Addendum, and published compliance-certification offerings (Microsoft Trust Center).',
    sources: ['Microsoft Learn, "Security and governance - Microsoft Copilot Studio"'], lastReviewed: '2026-08' },
  { id: 't-google-agentspace', name: 'Google Agentspace (now Gemini Enterprise)', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Precision/freshness note: Google renamed Agentspace to Gemini Enterprise on 9 October 2025, and by 2026 the "Agentspace" name has been retired from Google\'s current product materials -- functionality carries over unchanged, but a customer researching "Google Agentspace" today would find the product under its new name. Combines enterprise search with AI agents that research, plan, and act across connected business systems (Google Workspace, Salesforce, ServiceNow, and other pre-built connectors), plus a no-code custom-agent builder. Offers RBAC, data residency controls, and HIPAA/FedRAMP compliance options for regulated deployments. One real limitation flagged in independent commentary: governed context retrieval doesn\'t natively extend across an organization\'s full enterprise data estate -- some orgs supplement with third-party data-governance tooling to close that gap.',
    sources: ['Atlan, "What Is Gemini Enterprise (Formerly Agentspace)? 2026 Guide"'], lastReviewed: '2026-08' },
  { id: 't-autogen', name: 'Microsoft AutoGen', category: 'Agentic/Automation Platform', industries: ['all'],
    classification: 'caution',
    reasoning: 'Open-source multi-agent conversation framework from Microsoft Research (2023). Lifecycle/support finding rather than a security-vulnerability one: as of this review (mid-2026) AutoGen has entered maintenance mode -- Microsoft is not adding new features and is actively directing users toward its successor, Microsoft Agent Framework (a convergence of AutoGen and Semantic Kernel positioned as production-ready). Existing AutoGen codebases remain functionally viable with no immediate crisis, but future model capabilities, new orchestration patterns, and ecosystem integrations will target the newer framework instead -- a real risk for any organization building new production automation on AutoGen today rather than treating it as suitable only for prototyping, learning, or internal tools where long-term support isn\'t critical.',
    sources: ['Starlog, "Microsoft AutoGen: The Pioneering Multi-Agent Framework Now in Maintenance Mode" (May 2026)'], lastReviewed: '2026-08' },

  // Legal-Specific AI (R26 batch 1, 2026-08-30)
  { id: 't-harvey', name: 'Harvey', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'AI legal research/drafting/analysis platform used by large law firms. An independent Feb 2025 benchmark (Vals Legal AI Report) found Harvey Assistant scored strongly on document Q&A (94.8%, the highest of four tools tested) but meaningfully lower on other legal-analysis tasks: 75.1% data extraction, 72.1% document summarization, 77.8% transcript analysis, 80.2% chronology generation -- real, task-specific accuracy gaps rather than a single overall accuracy figure. This sits within a broader legal-AI regulatory context this project has already researched: ABA Formal Opinion 512 (Jul 2024) requires lawyer supervision, competence, and candor-to-the-court obligations specifically because AI legal tools can produce fabricated citations, and a publicly tracked database of AI-hallucination court sanctions (Damien Charlotin\'s tracker, ~1,490 rulings worldwide, over 1,000 in the US as of May 2026, per-attorney penalties reaching $15,000 plus bar suspension by 2026) shows the consequences of unverified reliance on AI legal output are real and escalating industry-wide -- though no Harvey-specific sanctioned case was found in this review.',
    sources: ['Vals Legal AI Report (VLAIR), 27 Feb 2025', 'GC AI, "AI Hallucination Legal Cases: A Sanctions Tracker" (2026), citing Damien Charlotin\'s public database'], lastReviewed: '2026-08' },
  { id: 't-cocounsel', name: 'CoCounsel (Thomson Reuters)', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'Thomson Reuters\' AI legal assistant, built from the former Casetext product. The same Feb 2025 Vals Legal AI Report benchmark scored CoCounsel 2.0 at 89.6% on document Q&A and the top score of the four tools tested on document summarization (77.2%) -- a genuinely strong, independently-verified result on that specific task, alongside 73.2% data extraction and 78.0% chronology generation. Precision note: Casetext (CoCounsel\'s predecessor) previously marketed the product with claims it "does not make up facts, or \'hallucinate\'" -- language a later Stanford/Yale peer-reviewed study found overstated for the broader category of AI legal research tools it tested, but that specific study tested Lexis+ AI, Westlaw AI-Assisted Research, and Ask Practical Law AI, not CoCounsel directly -- a distinction kept precise rather than conflating "AI legal research tools hallucinate" findings across products that weren\'t all actually tested.',
    sources: ['Vals Legal AI Report (VLAIR), 27 Feb 2025', 'LLRX, "\'Hallucinations\' by West & Lexis AI?" (Apr 2026) -- cited for the Casetext marketing-claim quote, not as evidence CoCounsel itself was tested'], lastReviewed: '2026-08' },
  { id: 't-lexis-ai', name: 'Lexis+ AI', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'high-risk',
    reasoning: 'LexisNexis\'s generative AI legal research product, marketed at launch with the claim of "100% hallucination-free linked legal citations." A peer-reviewed Stanford/Yale study (Stanford RegLab, first published ArXiv May 2024, later peer-reviewed in the Journal of Empirical Legal Studies, 2025) directly tested Lexis+ AI alongside Westlaw AI-Assisted Research and Ask Practical Law AI using a preregistered dataset of 200+ legal queries, and found Lexis+ AI accurate only 65% of the time -- hallucinating in roughly 17-33% of responses across the three tools tested, materially contradicting the "hallucination-free" marketing claim for the specific product this entry names. A direct, verified example of the vendor-claims-vs-independent-testing pattern this project has now documented across several categories (e.g. iCIMS in R24).',
    sources: ['Stanford RegLab, "Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools" (ArXiv May 2024; Journal of Empirical Legal Studies, 2025)', 'LexisNexis Pressroom, "LexisNexis Launches Lexis+ AI, a Generative AI Solution with Hallucination-Free Linked Legal Citations" -- cited for the marketing claim being tested against'], lastReviewed: '2026-08' },
  { id: 't-spellbook', name: 'Spellbook', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'lower-risk',
    reasoning: 'AI contract drafting/review tool for transactional lawyers (Microsoft Word add-in). Holds SOC 2 Type II certification (announced 31 Mar 2025) and operates a zero-data-retention (ZDR) architecture: inputs are processed in memory and discarded rather than stored, with contractually negotiated ZDR terms with its underlying LLM providers specifically to block model-training risk on client work product -- a real, specific architectural and contractual commitment, not just a policy statement.',
    sources: ['Spellbook, "Announcing Spellbook\'s SOC 2 Compliance" (31 Mar 2025)', 'Spellbook, "Most Private AI for Lawyers: Why Zero Data Retention Wins in 2026"'], lastReviewed: '2026-08' },
  { id: 't-luminance', name: 'Luminance', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'AI contract review/analysis platform marketed as "Legal-Grade AI," used heavily in M&A due diligence and contract review. Holds real, verifiable certifications: ISO 27001:2022 and SOC 2 Type 2, with AES-256 encryption at rest (via AWS KMS) and TLS 1.2+ in transit. One real information gap found and flagged rather than assumed either way: Luminance\'s own security documentation does not address whether customer contract data is used to train its AI models -- a materially different disclosure posture than Spellbook\'s explicit zero-data-retention/no-training commitment above, which is why this stays at caution rather than lower-risk.',
    sources: ['Luminance, "Security" (luminance.com/security)'], lastReviewed: '2026-08' },

  // Legal-Specific AI, continued (R26 batch 2, 2026-08-30)
  { id: 't-kira', name: 'Kira Systems (Litera)', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'AI-powered contract analysis/due diligence tool, acquired by Litera in 2022. Precision note: Kira still exists as a product but is "no longer an independent company" -- product development, pricing, and support now sit under Litera\'s broader legal-document-workflow platform rather than as a standalone specialized tool, and independent commentary notes the competitive landscape has moved past Kira\'s original clause-extraction strength toward newer generative-AI tools offering contract summarization and plain-English term flagging. No specific security certification or hallucination/accuracy study specific to Kira was found in this review -- an honest information gap, not an assumed weakness.',
    sources: ['AI For Legal Research, "Is Kira Systems Still Available? What Happened After the Litera Acquisition"'], lastReviewed: '2026-08' },
  { id: 't-relativity-air', name: 'Relativity aiR', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'AI-assisted document review/privilege review features (aiR for Review, aiR for Privilege) within the RelativityOne eDiscovery platform. A named case study (a Fortune 100 telecom company) reports 99% recall and 91% precision for aiR for Privilege, with 5,000 privileged documents caught before production and an 80% time reduction -- real, specific, though vendor-published rather than independently audited figures. No explicit court-defensibility or independent third-party validation claim was found on Relativity\'s own product page -- an honest gap, not a confirmed weakness. RelativityOne Government (a distinct, separate offering) holds FedRAMP certification, but this was not found to extend to aiR for Privilege/Review specifically.',
    sources: ['Relativity, "AI Privilege Review Software | Relativity aiR for Privilege"'], lastReviewed: '2026-08' },
  { id: 't-everlaw-ai', name: 'Everlaw AI Assistant', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'lower-risk',
    reasoning: 'AI features within the Everlaw eDiscovery/litigation platform, governed by a published AI Governance Framework (a real, detailed primary-source document, not marketing copy). Confirms data submitted for AI features is used only to fulfill the specific request within Everlaw and is not retained by LLM providers for training; Everlaw states it does not develop its own generative AI/LLMs and partners only with providers committed to zero data retention. Encourages mandatory human verification of all generative AI outputs, requires AI outputs to cite source documents for verification, and evaluates end-to-end pipeline accuracy per feature -- a real, structured accuracy-and-verification methodology built into the product\'s workflow rather than a general claim.',
    sources: ['Everlaw, "Everlaw AI Governance Framework"'], lastReviewed: '2026-08' },
  { id: 't-disco-cecilia', name: 'DISCO Cecilia AI', category: 'Legal AI', industries: ['legal', 'professional'],
    classification: 'caution',
    reasoning: 'Agentic AI assistant for eDiscovery/fact investigation from CS Disco (publicly traded, NYSE: LAW). A genuinely useful, unusually direct source: CS Disco\'s own 10-K SEC filing discloses real AI-related risk factors, including "model hallucinations" and "data leakage risks when using third-party AI" as named operational risks, exposure to evolving AI regulation (EU AI Act and various US state laws) as Cecilia\'s features expand, and a flag that Cecilia\'s own marketing claims about AI capabilities may draw regulatory scrutiny -- a company disclosing its own AI risk profile in a legally binding public filing is a more candid signal than most vendor marketing pages reviewed in this project, even though it provides no quantified accuracy benchmarks.',
    sources: ['CS Disco 10-K (SEC filing, via StockTitan), "AI Ediscovery Growth and Risk Overview"'], lastReviewed: '2026-08' },

  // Remaining General-Purpose LLMs (R27 batch 1, 2026-08-30)
  { id: 't-deepseek', name: 'DeepSeek', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'General-purpose LLM developed by DeepSeek (Hangzhou, China). This is the specific, high-priority connect-the-dots tool R23 flagged for this expansion, given its direct tie to R21\'s finding: the FY2026 NDAA \u00a71532 explicitly names DeepSeek in a federal-contractor prohibition. That federal concern has since broadened: a bipartisan bill, the "No Adversarial AI Act" (introduced 2025, not yet passed into law as of this review), would bar federal agencies more generally from purchasing or using AI models developed in China, Russia, Iran, or North Korea, tracked via a Federal Acquisition Security Council list updated every 180 days -- with DeepSeek cited by the bill\'s proponents as having "documented ties to the Chinese Communist Party and its intelligence apparatus" (an attributed claim from the bill\'s backers, not independently verified in this review). Separately, and independently of federal procurement law, multiple US states and several national governments have banned DeepSeek on government-issued devices specifically over data-privacy concerns tied to its servers being located in China.',
    sources: ['Cybernews, "US lawmakers push new bill to ban DeepSeek and other Chinese AI models across gov\'t agencies"', 'The Conference Board, "State and Federal Governments Move to Ban DeepSeek on Government Devices"'], lastReviewed: '2026-08' },
  { id: 't-perplexity', name: 'Perplexity', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'AI-powered answer engine/search tool. Named in multiple, separate, currently active copyright infringement lawsuits from major publishers: CNN (filed 28 May 2026, S.D.N.Y., alleging use of thousands of CNN articles, videos, and images for AI training and reproduction of "identical or substantially similar" content), plus separately reported actions from The New York Times, Reddit, and Dow Jones. Perplexity disputes the underlying legal theory ("You can\'t copyright facts," per a company spokesperson). For context on the financial stakes of this class of claim: Anthropic (a competitor) settled a comparable author-group copyright claim for $1.5 billion in 2025, signaling this exposure is real and materialized industry-wide, not theoretical.',
    sources: ['TechStartups, "Perplexity sued by CNN over alleged AI-powered content scraping" (28 May 2026)'], lastReviewed: '2026-08' },
  { id: 't-mistral-le-chat', name: 'Mistral Le Chat', category: 'General LLM', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'French/EU-headquartered general-purpose AI assistant, positioned explicitly around EU data sovereignty. Le Chat Enterprise supports private cloud, on-premises, or serverless deployment specifically to meet GDPR/EU AI Act requirements, offers an incognito mode to disable conversation history, an opt-out from training-data use, configurable moderation controls, and stated support for GDPR data-subject rights (access, rectification, erasure). As a genuinely EU-headquartered company, Mistral\'s regulatory alignment is structural -- its home jurisdiction is the same one setting the requirements -- rather than a retrofit onto a non-EU product.',
    sources: ['Reworked, "Mistral AI Launches Le Chat Enterprise, a Privacy-First AI Alternative"'], lastReviewed: '2026-08' },
  { id: 't-llama', name: 'Llama (self-hosted)', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'Meta\'s open-weight model family, typically self-hosted by the deploying organization -- a materially different risk profile than a hosted SaaS LLM, since the organization directly controls where inference runs and what happens to input data. Precision check: contrary to some secondary commentary describing Llama as "banned in the EU," Meta\'s Llama Community License is not a true open-source license (it restricts things like concurrent-user counts via an Acceptable Use Policy) but does not itself prohibit EU use -- deploying Llama for non-high-risk applications in the EU is "generally lawful," subject to standard EU AI Act obligations (transparency requirements for all applications, risk assessments specifically for high-risk use cases). Held at caution rather than lower-risk because self-hosting shifts real security and compliance responsibility onto the deploying organization\'s own infrastructure, and the license\'s usage restrictions are worth an org checking against its specific use case.',
    sources: ['basebox.ai, "Under what conditions can Meta\'s Llama 3.1 model be used in the EU?"'], lastReviewed: '2026-08' },
  { id: 't-qwen', name: 'Qwen (Alibaba)', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Alibaba\'s open-weight LLM family. As of July 2026, US federal scrutiny of Chinese-origin AI models has genuinely broadened beyond DeepSeek: the State Department stated on 8 July 2026 that use of Chinese AI models "raises serious concerns," and Congress opened joint investigations into two companies\' use of Chinese models specifically, with Airbnb\'s use of "Alibaba\'s Qwen for at least some workloads" named directly. Separately, a cited security research effort included Qwen3-Coder in its findings, and Alibaba\'s Qwen team was separately alleged to have run "distillation campaigns" against Anthropic\'s Claude. No sweeping US ban on Chinese open-weight models has been enacted or formally proposed as of this review -- real legal/technical obstacles exist (already-downloaded open-weight models can\'t be recalled, First Amendment concerns, enforcement difficulty), with "procurement requirements" (i.e., federal-purchasing restrictions, the same mechanism as R21\'s NDAA \u00a71532 finding for DeepSeek) seen as the more realistic near-term mechanism than an outright prohibition. Classified high-risk given the live, escalating, congressionally-investigated scrutiny specifically naming Qwen, even though no formal ban exists yet.',
    sources: ['TechTimes, "Washington Wants Chinese AI Out of Corporate America: Open Weights Block the Ban" (11 Jul 2026)'], lastReviewed: '2026-08' },
  { id: 't-cohere-command', name: 'Command (Cohere)', category: 'General LLM', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Cohere\'s enterprise LLM family. Cohere\'s own security page confirms its API platform is "SOC 2 Type II compliant," and states customers "maintain full control over your data with customizable handling and retention settings" and can "opt out of model training at any time -- your data stays yours." Cohere also offers private on-premises/VPC deployment options for orgs with stricter regulatory needs. No FedRAMP certification was found on this review -- an honest gap for federal-contractor use cases, not an assumed weakness.',
    sources: ['Cohere, "AI Security and Data Protection"'], lastReviewed: '2026-08' },
  { id: 't-poe', name: 'Poe (Quora)', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Quora\'s multi-model AI chat platform, notable for letting third-party developers build and publish bots on top of underlying LLMs. An independent AI-policy trust audit (VerifyWise AI Trust Index) scored Poe 27/100 (Grade F), ranking 193rd of 211 apps reviewed, driven by three concrete, quoted findings from Poe\'s own privacy policy rather than a generic low score: (1) third-party bot creators "may view and store your chats on their servers to train their models," with no clear user consent or opt-out mechanism described; (2) users grant Poe a "worldwide, non-exclusive, royalty-free, transferable, and perpetual license" to their content and bots; (3) the policy is silent on data-deletion rights, retention periods, and whether training practices differ by subscription tier. This is a disclosure/consent-mechanism finding, not an alleged breach or lawsuit -- but the combination of third-party training exposure and an unusually broad, perpetual content license is a real, concrete risk pattern for any org considering Poe for work involving sensitive prompts.',
    sources: ['VerifyWise, "AI Trust Index -- Poe"'], lastReviewed: '2026-08' },
  { id: 't-you-com', name: 'You.com', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-powered search/answer engine with an enterprise offering, marketed with privacy-forward positioning. An independent enterprise-vendor profile (RFP.wiki) scores You.com 3.7/5 on data security and compliance but flags that "independent compliance proof is less visible than top enterprise vendors" -- no confirmed, published SOC 2 or GDPR audit evidence was found in this review, despite the marketing emphasis on privacy and compliance. This review\'s own search for independent SOC 2 confirmation likewise returned no corroborating result.',
    sources: ['RFP.wiki, "You.com - Key Compliance: SOC 2, GDPR, Audits (2026)"'], lastReviewed: '2026-08' },
  { id: 't-ollama', name: 'Ollama (local)', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: '**The headline finding of this batch.** Ollama is a widely-used open-source tool for running LLMs locally. A critical vulnerability, CVE-2026-7482 ("Bleeding Llama," CVSS 9.3), disclosed 6 May 2026, is a heap out-of-bounds read in Ollama\'s GGUF model loader: an attacker sends a maliciously crafted GGUF file to the /api/create endpoint, causing memory exposure of "prompts, messages, and environment variables, including API keys, tokens, and secrets," exfiltrated via Ollama\'s own model-push feature using only three unauthenticated API calls. Approximately 300,000 Ollama servers were found exposed to the public internet and vulnerable. The parsing bug itself is patched as of Ollama 0.17.1. Held at high-risk rather than caution (the tier used for LangChain/LangGraph\'s patched CVEs) for a distinguishing structural reason: the root cause enabling exploitation at scale is that Ollama listens on all network interfaces without authentication by default, and that default-insecure-networking posture is not itself changed by this specific patch -- it is a persistent deployment-configuration risk independent of any single CVE, and the 300,000-server exposure figure is a real, already-realized blast radius rather than a theoretical one.',
    sources: ['runZero, "Ollama vulnerability CVE-2026-7482: Find impacted assets"', 'SecurityWeek, "Critical Bug Could Expose 300,000 Ollama Deployments to Information Theft"'], lastReviewed: '2026-08' },
  { id: 't-lm-studio', name: 'LM Studio (local)', category: 'General LLM', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Desktop application for running LLMs locally. LM Studio\'s own privacy policy makes an unusually direct commitment: "LM Studio can run entirely on your device. If you download and run models locally, none of your messages, chat histories, and documents are ever transmitted from your system." Minimal telemetry is collected only for app-update checks and model-search/download queries. If a user opts into LM Studio\'s cloud-model or web-search features, prompts are transmitted, but the policy states these are "processed transiently and not stored after the request completes" under Zero Data Retention or substantially equivalent terms with those providers. Classified lower-risk rather than caution (the tier given to Llama/self-hosted generally) because this is a specific, explicit product-level policy commitment about the application\'s own default data flow, not a general inference about self-hosting as a category.',
    sources: ['LM Studio, "Privacy Policy"'], lastReviewed: '2026-08' },
  { id: 't-zendesk-ai', name: 'Zendesk AI', category: 'Customer Service AI', industries: ['all', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'AI-powered customer service/CX platform. Holds the broadest, most specific certification set verified across any Customer Service AI tool in this review: SOC 2 Type II, ISO 27001:2022, ISO 27018:2019, ISO 27017:2015, ISO 27701:2019, ISO 42001 (AI Management System), CSA STAR AI Levels 1 and 2, PCI-DSS, HIPAA (BAA available), HDS (France), and FedRAMP LI-SaaS (Low-Impact SaaS) authorization. Zendesk explicitly states its generative AI features "are NOT trained on Zendesk customer data" and that "no third-party will use your inputs to train their models" -- its own proprietary ML models train only on a given customer\'s own data, opt-in and account-scoped, not pooled across customers. Gained the federal-contractors industries tag on the strength of the confirmed FedRAMP LI-SaaS authorization, consistent with R23b\'s per-tool FedRAMP-tagging convention.',
    sources: ['AIFOXX, "Zendesk, Inc. Security & Compliance (SOC 2, ISO 27001, ISO 42001)"'], lastReviewed: '2026-08' },
  { id: 't-intercom-fin', name: 'Intercom Fin', category: 'Customer Service AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI customer-service agent from Intercom. Intercom\'s own site (fin.ai) markets Fin at a "76% average resolution rate across 12,000+ customers, with many seeing over 85%." **A precision check worth flagging, though from a source with a competing commercial interest rather than an independent audit:** a competitor-published analysis (CloneDesk, which sells a rival AI support product) reports documented production deployments actually achieving 45-53% resolution -- a 23-31 percentage-point gap from the marketed figure -- attributing it to Fin\'s retrieval-from-documentation architecture struggling with workflow-specific tickets, unnecessary escalations, and stale knowledge-base content (citing roughly 25% of enterprise help-center articles containing outdated information at any time). **This is reported here as [REPORTED], explicitly not adopted as this project\'s own verified finding, given the source\'s commercial incentive to make a competing product look strong by comparison** -- but the size and specificity of the claimed gap, and the plausibility of the RAG-architecture explanation given, are enough to flag as a real question worth an org\'s own pilot-testing before assuming Intercom\'s marketed resolution rate will hold in a specific deployment.',
    sources: ['fin.ai, official Intercom Fin resolution-rate claims'], lastReviewed: '2026-08' },
  { id: 't-ada', name: 'Ada', category: 'Customer Service AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Enterprise AI customer service platform. Ada\'s own platform page confirms a broad certification set: SOC 2 Type II, HIPAA, GDPR, PCI DSS, CCPA/CPRA, PIPEDA, and AIUC-1 -- a dedicated AI-specific use-case certification, a newer and more specific credential than the general security certifications most other tools in this inventory cite. Ada states "zero data retention policies with LLM providers" and "independent annual penetration testing including LLMs." One honest gap: the published platform page does not explicitly address data-residency options or restrictions on training on customer data specifically, distinct from its LLM-provider zero-retention commitment.',
    sources: ['Ada, "AI Customer Service Platform for Enterprise CX"'], lastReviewed: '2026-08' },
  { id: 't-forethought', name: 'Forethought', category: 'Customer Service AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI customer-support automation platform. Forethought\'s own security policy (a primary source) confirms SOC 2 Type II certification mapped to ISO 27001, NIST 800-53 (Moderate level), and GDPR requirements, plus annual HIPAA audits with attestation reports available to customers on request. Notably specific data-handling detail: automatic ML- and regex-based redaction of PII/PHI/financial records during ingestion, customer-requested data deletion within one week with complete purging within 30 days following AWS\'s NIST 800-88 decommissioning standard, AES-256 encryption at rest, mandatory two-factor authentication for internal access, and a public bug-bounty program.',
    sources: ['Forethought, "Security Policy"'], lastReviewed: '2026-08' },
  { id: 't-kustomer', name: 'Kustomer', category: 'Customer Service AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'CRM-native customer service platform with AI features. **A structural/ownership check worth running directly rather than assuming, given how often "Kustomer" gets described as a Meta product:** Meta acquired Kustomer for roughly $1 billion in 2022, but spun it out in a rare divestiture completed 15 May 2023, selling it for $250 million to a consortium of venture firms (Redpoint Ventures, Battery Ventures, Boldstart Ventures); Meta retains a passive minority stake with no board representation. Kustomer is not, as of this review, a Meta-operated product. On the compliance side, Kustomer publishes a Trust Center and a dedicated AI Compliance FAQ (covering which AI models it uses and how it handles data/privacy/security in its AI systems), but this review could not access the actual answer content behind those FAQ headers, nor independently confirm a specific certification (SOC 2, ISO, etc.) the way Zendesk\'s, Ada\'s, and Forethought\'s own pages could be directly verified -- an honest information gap, not an assumed weakness.',
    sources: ['Yahoo Finance, "Meta Platforms Sells Kustomer For $250M In A Rare Divestiture Deal"', 'Kustomer, "Trust Center"'], lastReviewed: '2026-08' },
  { id: 't-freshdesk-freddy', name: 'Freshdesk Freddy AI', category: 'Customer Service AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI features within Freshworks\' Freshdesk helpdesk platform. Freshdesk\'s underlying platform holds a genuine SOC 2 Type II report plus ISO 27001/27701, PCI DSS, and GDPR/CCPA compliance -- a solid, verifiable certification set at the platform level. **The gap is specific to Freddy AI itself**, not the platform generally: this review found no explicit, primary-sourced statement of whether Freddy AI trains on customer data, distinct from the platform-level security certifications above. Third-party commentary on Freshdesk security notes that some organizations layer supplementary AI-governance tooling on top specifically because native AI-feature data policy isn\'t as explicitly documented as the platform\'s general security posture.',
    sources: ['eesel AI, "A deep dive into Freshdesk security and SOC 2 compliance for 2026"'], lastReviewed: '2026-08' },
  { id: 't-sierra', name: 'Sierra', category: 'Customer Service AI', industries: ['all', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'AI customer-service agent platform co-founded by Bret Taylor. Sierra\'s own Trust and Reliability page states the broadest certification set found for any Customer Service AI tool in this review: **SOC 2, HIPAA, GDPR, PCI, FedRAMP High, CCPA, CSA STAR, ISO 27001, and ISO 42001**, plus PCI DSS Level 1 Service Provider certification (the industry\'s most stringent payment-processing tier). Sierra states customer data "is only used as you instruct, and is never shared with other customers," with automatic PII encryption/masking, and describes a supervisory-layer architecture specifically built to "reduce hallucinations, ensure security, and prevent abuse," including automatic switching between underlying models. Gained `federal-contractors` in its industries array on the confirmed FedRAMP High authorization.',
    sources: ['Sierra, "Trust and reliability"'], lastReviewed: '2026-08' },
  { id: 't-decagon', name: 'Decagon', category: 'Customer Service AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI customer-support agent platform (valued at $4.5B, Jan 2026). Decagon\'s own published Security and Compliance page describes real technical controls -- TLS v1.2 encryption in transit, AES-256 at rest, SSO, 2FA, role-based least-privilege access, Google Cloud hosting behind Cloudflare WAF -- but, unlike Zendesk, Ada, Forethought, and Sierra above, **this review could not directly confirm a specific formal certification (SOC 2 Type II, ISO 27001, HIPAA) from Decagon\'s own primary security page or its Trust Center**, despite third-party vendor-comparison sites claiming Decagon holds all three. This is treated as an unconfirmed claim, not adopted as verified, consistent with this project\'s primary-source discipline -- an honest gap rather than an assumed one.',
    sources: ['Decagon, "Security and Compliance"'], lastReviewed: '2026-08' },
  { id: 't-agentforce', name: 'Salesforce Agentforce', category: 'Customer Service AI', industries: ['all', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'Salesforce\'s AI agent platform, including customer-service agent use cases built on the Salesforce CRM. **A real, Agentforce-specific finding:** "ForcedLeak" (disclosed by Noma Security, reported 28 Jul 2025), a critical indirect prompt-injection vulnerability (CVSS 9.4) in Agentforce\'s Web-to-Lead functionality -- malicious instructions hidden in lead-form submissions could cause Agentforce to query sensitive CRM data and exfiltrate it to attacker-controlled domains, enabled partly by an expired domain the attackers purchased for about $5 and a Content Security Policy bypass. **Patched**: Salesforce deployed a Trusted-URL allowlist enforcement and reclaimed the expired domain, with the fix in place by the time of reporting (Sep 2025) -- roughly a year before this review, with no further Agentforce-specific incident found since. **A separate, distinct incident worth keeping clearly apart rather than conflating:** a 2025 breach of Salesloft\'s Drift integration (stolen OAuth tokens, not an Agentforce vulnerability) led to over a dozen class-action filings against Salesforce alleging inadequate cybersecurity procedures; Salesforce disputes that its own platform was compromised, and the suit targets the broader Salesforce/Salesloft integration incident, not Agentforce specifically. Salesforce separately documents FedRAMP-related security/compliance material for Agentforce on its own compliance site.',
    sources: ['The Hacker News, "Salesforce Patches Critical ForcedLeak Bug Exposing CRM Data via AI Prompt Injection"', 'The Register, "Salesforce faces class action after Salesloft breach"'], lastReviewed: '2026-08' },
  { id: 't-gong', name: 'Gong', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-powered revenue/conversation-intelligence platform that records and analyzes sales calls. Gong\'s own published security materials confirm SOC 2 Type II, multiple ISO standards, and GDPR/CCPA compliance. **A real gap, not an assumed weakness:** this review found no explicit primary-sourced statement addressing whether Gong uses customer call/conversation recordings to train its AI models -- a materially relevant question given the product\'s core function is recording and analyzing live sales conversations, distinct from the data-protection and access-management controls its security materials do document in detail.',
    sources: ['Gong, "Security best practices for the Gong Revenue AI OS"'], lastReviewed: '2026-08' },
  { id: 't-outreach', name: 'Outreach', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI-assisted sales engagement platform (rebranded from outreach.io to outreach.ai on its own domain, a minor naming note worth flagging for anyone referencing the older domain). Outreach\'s own platform security page confirms SOC 2 Type II, ISO 27001, ISO 27701, EU-U.S. Privacy Shield, and TRUSTe certifications, plus an explicit, specific data-use commitment: "As a customer of Outreach, you own and control your data. We do not use your data for anything other than providing you with the service to which you have subscribed," and a specific prohibition on scanning customer email/documents "for advertising purposes." No explicit AI-model-training statement was found, though the general data-use restriction is unusually specific and strongly worded relative to most other tools reviewed.',
    sources: ['Outreach, "Enterprise Data Security"'], lastReviewed: '2026-08' },
  { id: 't-salesloft', name: 'Salesloft (incl. Drift)', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'high-risk',
    reasoning: '**The headline finding of this batch, and a direct continuation of R28 batch 2\'s Agentforce entry, which referenced this same incident from the Salesforce side.** Salesloft (which also operates the Drift AI chat product) suffered a real, large-scale supply-chain breach in 2025: attackers gained unauthorized access to Salesloft\'s GitHub repositories between March-June 2025, established persistence via a rogue guest user and GitHub Actions workflows, and used that foothold to reach AWS infrastructure and extract OAuth tokens from Secrets Manager. Active exploitation and data exfiltration ran 8-18 August 2025; Salesloft disclosed the breach and revoked affected tokens on 20 August 2025. The compromised per-user OAuth tokens affected hundreds of Salesloft/Drift customers\' connected **Salesforce instances, Google Workspace integrations, and "dozens of other integrated applications,"** with compromised admin-level tokens granting attackers elevated access, and a follow-on credential-harvesting campaign specifically targeting Snowflake and AWS resources found via the stolen data. Salesloft\'s own security-compliance page confirms SOC 2 Type II, ISO 27001, and ISO 27701 certifications, annually audited -- real credentials, but ones that did not prevent this incident. **A second, structural finding worth flagging:** Salesloft and Clari (also in this batch) announced a merger 7 August 2025 -- during the same window as the breach\'s active-exploitation phase -- completing in Fall 2025 under CEO Steve Cox; the combined entity now serves 5,000+ organizations. This review found no evidence the breach was connected to the merger announcement or vice versa, and treats the timing overlap as a fact worth noting rather than an implied causal link.',
    sources: ['Permiso, "Anatomy of the Salesloft Breach"'], lastReviewed: '2026-08' },
  { id: 't-clari', name: 'Clari', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Revenue intelligence/forecasting AI platform. Clari\'s own press materials confirm SOC 2 Type II certification completed with zero exceptions, plus ISO 27001, HIPAA, GDPR, CCPA, and EU-US/Swiss-US Privacy Shield compliance -- a broad, verifiable certification set independent of and predating the Salesloft entry below. **A structural/ownership fact worth carrying alongside this entry rather than treating separately:** Clari and Salesloft (also in this batch) announced a merger 7 August 2025, completing Fall 2025, with Clari CEO Andy Byrne\'s successor Steve Cox leading the combined company. Clari\'s own strong, independently-verified certification record is assessed here on its own terms; this review found no evidence connecting Clari\'s infrastructure to Salesloft\'s 2025 OAuth breach specifically, and does not assume shared-infrastructure risk without evidence -- but the corporate relationship is real and worth an org checking on directly given how recent the merger is.',
    sources: ['Clari, "Clari Achieves Completion of SOC 2 Type II Certification"', 'Clari, "Clari and Salesloft Announce Agreement to Merge"'], lastReviewed: '2026-08' },
  { id: 't-apollo', name: 'Apollo.io', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'B2B contact-database and sales-engagement platform built substantially on scraped/aggregated public profile data. Two real, concrete findings: (1) a proposed class action (Illinois state court, case § 2023CH05114, filed 25 May 2023, still a live legal theory as of this review) alleges Apollo.io (operated by Zenleads, Inc.) used Illinois residents\' personal information without consent under the **Illinois Right of Publicity Act**, specifically to market paid subscriptions -- the complaint states the business model\'s core purpose is "to advertise and convince prospective customers to enroll in and ultimately purchase its monthly subscription services" using non-consenting individuals\' profiles; (2) **LinkedIn removed Apollo.io\'s business pages in October 2025** as part of a platform-wide crackdown on data scraping, citing "aggressive use of browser extensions and large-scale data scraping" violating LinkedIn\'s Terms of Service -- an enforcement action, not itself a lawsuit, but directly analogous to the hiQ Labs precedent this category has long operated under.',
    sources: ['ClassAction.org, "Apollo.io Profited from Illinois Residents\' Personal Data Without Consent, Class Action Says"', 'LeadGenius, "LinkedIn\'s Crackdown on Data Scrapers: Why Apollo.io and Seamless.ai Were Targeted"'], lastReviewed: '2026-08' },
  { id: 't-zoominfo-copilot', name: 'ZoomInfo Copilot', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI sales agent built on ZoomInfo\'s go-to-market data platform. ZoomInfo\'s own security overview confirms it is "ISO 27001, ISO 27701, TRUSTe, and SOC 2 Type II certified." **A real gap:** that security overview does not address whether ZoomInfo Copilot specifically trains on customer data, distinct from the platform-level certifications -- a relevant open question given ZoomInfo\'s own core business model is built on aggregated contact/company data, the same data-provenance risk category R29 batch 1 surfaced for Apollo.io, though no comparable lawsuit or platform-enforcement action against ZoomInfo specifically was found in this review.',
    sources: ['ZoomInfo, "Security Overview"'], lastReviewed: '2026-08' },
  { id: 't-clay', name: 'Clay', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI-powered B2B data enrichment and outbound-workflow orchestration platform. Clay\'s own blog confirms **SOC 2 Type 2** certification (completed September 2024), covering access controls (customer-data access "strictly limited to those who need it"), continuous compliance monitoring, background-checked staff, and a specific architectural privacy option: a **"Headless CRM mode where no data is stored in Clay"** for enterprise customers who want to avoid Clay itself retaining enriched data. A precision check confirmed clay.com (the sales-enrichment platform relevant here) is a distinct company from similarly-named clay.earth (a personal-CRM product) and clayhr.com (HR software) -- easy names to conflate, kept separate.',
    sources: ['Clay, "Clay is SOC 2 Type 2 compliant"'], lastReviewed: '2026-08' },
  { id: 't-6sense', name: '6sense', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI-powered account-based marketing (ABM) and buyer-intent-data platform. 6sense\'s own Trust site confirms one of the broadest AI-specific governance postures verified in this project: **SOC 2 Type 2 across all five Trust Service Criteria**, **ISO 27001**, and **ISO 42001** (the AI-management-system-specific standard, also held by Zendesk AI and Sierra), GDPR/CCPA/CPRA compliance, UK-US and Swiss-US Data Privacy Framework participation, annual independent penetration testing, and a described **formal AI Governance Program overseen by an "AI Management System (AIMS) Council,"** including a dedicated secure AI development lifecycle, AI model risk assessments, and AI guardrails (input validation, output filtering, continuous output monitoring). The page does not explicitly confirm whether customer data trains 6sense\'s AI models, directing that specific question to an NDA-gated Trust Center.',
    sources: ['6sense, "Trust"'], lastReviewed: '2026-08' },
  { id: 't-regie-ai', name: 'Regie.ai', category: 'CRM/Sales AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI sales-content and outbound-sequencing assistant. Regie.ai\'s own GDPR page confirms **SOC 2** and Salesforce **AppExchange security certifications**, GDPR compliance with defined practices (data-subject-rights fulfillment and breach notification within 30 days, secure data deletion/return within 30 days of contract termination, an updated sub-processor list communicated to customers), and operates as a GDPR data processor with customers as data controllers. **A real, self-acknowledged gap worth surfacing directly rather than glossing over:** the page states Regie.ai is still "preparing" for compliance with emerging AI-specific regulation, distinct from its already-completed general SOC2/GDPR certifications -- an honest, dated snapshot of a real-time compliance gap rather than a settled claim either way. **A precision check I ran deliberately:** an unrelated company, RegASK, was initially returned by a search for "Regie.ai security compliance" -- confirmed as a different company and excluded from this entry.',
    sources: ['Regie.ai, "GDPR Compliance With Regie.ai"'], lastReviewed: '2026-08' },
  { id: 't-rogo', name: 'Rogo', category: 'Financial/Research AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'AI analyst-agent platform for investment banking/finance workflows. Rogo\'s own security page confirms **SOC2, ISO 27001, GDPR, CCPA, and EU AI Act** compliance -- a genuinely broad set for a newer entrant (Series D, $160M raised as of Apr 2026), plus an explicit, specific data-use commitment: **"We never use your private data to train or update our models,"** with customer data held in "siloed environments, isolated from other customer data." Built on Amazon Bedrock per AWS\'s own published case study. **One honest gap:** no specific hallucination-safeguard or accuracy-validation detail was found beyond general security-framework language (zero-trust, encryption, access controls).',
    sources: ['Rogo, "Security"'], lastReviewed: '2026-08' },
  { id: 't-bloomberggpt', name: 'BloombergGPT / Bloomberg Terminal AI', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: '**A structural finding worth stating plainly before anything else: BloombergGPT is not an independently selectable product.** It exists as "a quiet layer sitting on top of Bloomberg\'s internal stack," embedded within the Bloomberg Terminal (a $30,000+/year enterprise subscription) rather than offered as a standalone product, separately licensable service, or public API -- there is no GitHub repo, Hugging Face model card, or downloadable checkpoint. Per the team\'s own stated reasoning (BloombergGPT lead David Rosenberg): "Using an API like OpenAI\'s is not suitable for us: we have data we don\'t want to send out." Consistent with this project\'s established discipline for absorbed/non-independent products (Modern Hire into HireVue, Google Agentspace/Gemini Enterprise), this entry is retained as a single line covering both names -- "BloombergGPT" (the underlying model, as R23 originally scoped it) and "Bloomberg Terminal AI" (R30\'s separately-scoped batch-2 item, which is in practice the same product surface a customer would actually select) -- rather than creating two entries for what is functionally one offering. No independent hallucination-rate study or formal SOC2/ISO certification specific to the AI features was found in this review, distinct from Bloomberg\'s well-established enterprise-data reputation generally.',
    sources: ['Belitsoft, "BloombergGPT is Live. A Custom Large Language Model for Finance"'], lastReviewed: '2026-08' },
  { id: 't-daloopa', name: 'Daloopa', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-powered financial-data extraction/normalization platform for equity research and financial modeling ($47M Series C, 2026). Daloopa\'s own published material describes real security practices -- end-to-end encryption, zero-trust session authentication, tokenized handling of sensitive fields, cryptographically sealed audit trails, 99.99% uptime SLAs with 4-hour disaster recovery -- and states its compliance framework **maps to** Basel III, GDPR, MiFID II, and SOC 2 requirements. **A precision distinction worth making directly:** "maps to SOC 2 requirements" is not the same claim as an independently issued SOC 2 certification, and this review found no confirmation of an actual completed third-party SOC 2 audit, distinct from several other tools in this inventory (e.g. Rogo above) that cite a specific completed certification. No hallucination/accuracy-validation safeguard was addressed for the extracted financial data itself.',
    sources: ['Daloopa, "How Model Context Protocol Transforms Financial Analysis"'], lastReviewed: '2026-08' },
  { id: 't-kensho', name: 'Kensho (S&P Global)', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'S&P Global\'s AI engine for enterprise data retrieval and financial-document analysis, used across S&P Global\'s own index and ratings businesses. Kensho\'s own public "About" page contains no specific security-certification detail -- no SOC2, ISO, or formal compliance-framework citation was found -- offering only a general statement that Kensho builds "with safeguards from the start, pilot[s] internally before scaling externally, and use[s] real-world feedback to continuously improve." **This is treated as a real information gap rather than an assumed weakness**, particularly given Kensho operates within S&P Global, a large, established, heavily-regulated financial-data company whose parent-level compliance posture (not independently confirmed as extending to Kensho\'s specific AI features in this review) plausibly exceeds what a standalone startup entry would carry.',
    sources: ['Kensho, "About Kensho"'], lastReviewed: '2026-08' },
  { id: 't-factset-ai', name: 'FactSet AI', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'GenAI features embedded within the FactSet financial-data and analytics platform. FactSet\'s own published governance material (a primary source) states the company "does not use AI tools which do not have their own enterprise ready policies, including guarantees to keep our data private rather than using it to train future models," and describes real governance mechanics: updated data-governance policies, strict data-access controls, regular compliance audits, incident-reporting protocols, developer training on the OWASP Top 10 for LLMs, and an internal "enterprise safe interactive chat instance" (chat.factset.io) for employee use. **No formal SOC2 or ISO certification was found cited for the GenAI features specifically** in this review, despite the detailed governance-process description -- a real gap between described process rigor and confirmed third-party certification.',
    sources: ['FactSet, "Securing GenAI at FactSet"'], lastReviewed: '2026-08' },
  { id: 't-sardine', name: 'Sardine', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-powered fraud/AML detection and risk-scoring platform for financial institutions. Sardine\'s own public security page does not itself list specific certifications, instead pointing customers to a separate Trust Center: "If you are looking for our Trust Center with SOC2, pentest reports, and other security documentation, please visit: Sardine Trust Center." **This review could not independently access or confirm the specific certification content behind that gated Trust Center**, so the likely-held SOC2 certification referenced in passing is not treated as independently verified here, consistent with this project\'s primary-source discipline.',
    sources: ['Sardine, "Security"'], lastReviewed: '2026-08' },
  { id: 't-feedzai', name: 'Feedzai', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-native fraud and financial-crime prevention platform. Feedzai\'s own press materials describe a genuinely specific architectural privacy approach for its "Feedzai IQ" cross-institution intelligence-sharing feature: **federated learning** that "eliminates the need for raw data exchange," transforming "anonymized, distributed data into real-time fraud intelligence" across participating banks rather than sharing raw customer data directly -- a real, specific technical mitigant, not just a policy statement. **No formal security certification (SOC2, ISO 27001) was found cited** in this review\'s primary sources, despite the specific architectural detail found for the federated-learning approach itself; the press material states the solution helps institutions "stay fully compliant with global privacy regulations" without naming a specific framework.',
    sources: ['Feedzai, "Feedzai IQ AI Fraud Prevention & Privacy-Preserving Intelligence"'], lastReviewed: '2026-08' },
  { id: 't-zest-ai', name: 'Zest AI', category: 'Financial/Research AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-automated credit-underwriting platform -- squarely in ECOA/Reg B adverse-action and fair-lending territory, per this project\'s research foundation. Zest AI\'s own product page describes real fairness-oriented technique names ("proven LDA searches and advanced adversarial debiasing techniques") and specific marketed outcomes ("lift approvals by 30% on average across protected classes"), plus notes its Head of Public Policy is the former Chief Counsel to the House Financial Services Committee. **A precision check I ran deliberately, given how easy the conflation would be:** a Massachusetts AG fair-lending settlement (10 Jul 2025, $2.5M) over AI-underwriting bias and an unlawful immigration-status "Knockout Rule" targeted **Earnest Operations LLC**, a student-loan lender -- not Zest AI, and the settlement documents do not name Zest AI or any specific AI-underwriting vendor. This finding is explicitly NOT attributed to Zest AI. **The real gap for Zest AI itself:** its own product marketing page cites no specific ECOA/Reg B compliance certification, no named third-party disparate-impact audit, and no cited independent model-explainability validation -- a genuine documentation gap on precisely the regulatory dimension (fair lending) that matters most for this specific product category.',
    sources: ['Zest AI, "AI-Automated Credit Underwriting"', 'Consumer Financial Services Review, "Massachusetts AG Settles Fair Lending Action Based Upon AI Underwriting Model"'], lastReviewed: '2026-08' },
  { id: 't-upstart', name: 'Upstart', category: 'Financial/Research AI', industries: ['all'],
    classification: 'high-risk',
    reasoning: '**The headline finding of this batch, and the most legally exposed tool verified in this entire Financial/Research AI category.** Upstart operates an AI-driven consumer-lending platform -- also squarely in ECOA/Reg B adverse-action/fair-lending territory per this project\'s research foundation -- with a real, multi-year regulatory and legal history: (1) the CFPB granted Upstart a no-action letter in Nov 2020 providing conditional fair-lending-enforcement protection for its AI underwriting model; Upstart itself requested its termination after notifying the CFPB (13 Apr 2022) of plans to add significant new model variables rather than wait for review, and the letter was terminated 8 Jun 2022 -- Upstart traded regulatory protection for model flexibility; (2) the **SEC subpoenaed Upstart on 17 Nov 2023** specifically over its AI-model disclosures and lending practices, a matter Upstart states remains open ("we are cooperating... and are unable to predict the outcome"); (3) **a current securities class action** (stock drop Nov 2025, lead-plaintiff deadline 8 Jun 2026) alleges Upstart misled investors specifically about its AI model\'s performance, with claims including that its CTO "oversaw a flawed model" and executives "certified false AI claims." As of Q1 2024, Upstart itself disclosed 90% of its loans were fully automated with "no human in the loop whatsoever."',
    sources: ['Consumer Financial Protection Bureau, "CFPB Issues Order to Terminate Upstart No-Action Letter"', 'Banking Dive, "Upstart subpoenaed by SEC over AI, loans"', 'Kavout, "Upstart Under Pressure: What Are the Core Allegations"'], lastReviewed: '2026-08' },
    { id: 't-nuance-dax', name: 'Nuance DAX Copilot (Dragon Copilot)', category: 'Clinical documentation', industries: ['healthcare', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'Microsoft-owned (Nuance acquired 2022) ambient clinical documentation tool built on Azure. Microsoft\'s own published security whitepaper confirms the broadest certification set found in this batch: HITRUST CSF, HIPAA, ISO 27001/27017/27018, FedRAMP, SOC I/II/III, GDPR, PIPEDA, Germany\'s C5, France\'s HDS, and Switzerland\'s revFADP, plus an explicit data-residency commitment ("data never leaves a geography"). One honest gap: this review could not directly confirm from the security whitepaper itself whether patient conversation data is used to train Microsoft\'s underlying models -- that detail sits in a separate, unreviewed privacy whitepaper, so it is left as an open question rather than assumed either way. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['Microsoft Learn, "Security white paper" (Dragon Copilot)'], lastReviewed: '2026-08' },
    { id: 't-suki-ai', name: 'Suki AI', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'Ambient AI scribe and voice-assistant platform for clinical documentation. Suki\'s own developer documentation makes a specific, checkable data-use commitment: "Any data that is used for ML training and improving the product is de-identified," including an audio-specific de-identification process that "breaks audio into chunks and isolates them such that the original audio cannot be re-constructed." No named formal certification (SOC2, ISO 27001, HITRUST) was found in this review beyond a generic reference to HIPAA compliance through Business Associate Agreements -- a real disclosure gap next to Corti\'s and Nuance DAX\'s more specific certification claims in this same batch. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['Suki, "Security & Compliance"'], lastReviewed: '2026-08' },
    { id: 't-deepscribe', name: 'DeepScribe', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'AI medical scribe platform. DeepScribe\'s own published material describes a genuinely detailed accuracy-transparency mechanism -- a "Trust and Safety Suite" (launched Feb 2024) combining "Clinical Moments" (letting clinicians trace any AI-generated note snippet back to the exact moment in the patient encounter), "Note Insights" (an audit dashboard tracking edits-per-100-notes and a "DeepScribe Trust Score"), and an Expert Human Audits team that grades outputs against a clinical accuracy framework -- plus a stated SOC 2 compliance and "continuous AI training and monitoring for accuracy and bias mitigation." No ISO 27001 or HITRUST certification was found cited, and hallucination-specific safeguards beyond this general monitoring language are not detailed. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['DeepScribe, "DeepScribe Launches New and Innovative Trust and Safety Suite for its Ambient AI Technology"', 'DeepScribe, "Security Practices"'], lastReviewed: '2026-08' },
    { id: 't-ambience-healthcare', name: 'Ambience Healthcare', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'Ambient AI documentation platform (Series C, $243M raised Jul 2025; KLAS #1 ranking for clinician experience). Ambience\'s own Trust Center confirms it is "classified as a Business Associate under HIPAA, and that law\'s protections apply to all patient information we access," but this review could not confirm any specific formal certification (SOC 2, ISO 27001, HITRUST) or a statement on whether patient data trains its AI models from the pages accessible in this review -- a real disclosure gap for a vendor of this scale and valuation. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['Ambience Healthcare, "Trust Center"'], lastReviewed: '2026-08' },
    { id: 't-augmedix', name: 'Augmedix', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'AI-assisted medical documentation platform, historically combining AI transcription with remote human medical-scribe review. A structural/ownership fact worth carrying directly: Commure acquired Augmedix in an all-cash, $139M deal (announced 19 Jul 2024, Augmedix becoming "a wholly owned subsidiary of Commure") -- unlike this project\'s fold-in findings for Modern Hire or Drift, Augmedix continues to operate under its own brand with its own site, privacy policy, and Business Associate Addendum rather than being discontinued or merged into Commure\'s own product line, so it is kept as its own entry here rather than folded. No specific formal certification (SOC2, ISO 27001, HITRUST) was found cited beyond generic HIPAA Business Associate Addendum language. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['Fierce Healthcare, "Health tech company Commure to acquire Augmedix in $139M deal as AI scribe competition heats up"', 'Augmedix, "Business Associate Addendum"'], lastReviewed: '2026-08' },
    { id: 't-corti', name: 'Corti', category: 'Clinical documentation', industries: ['healthcare'],
    classification: 'lower-risk',
    reasoning: 'AI platform for clinical documentation, EHR integration, and real-time triage/dispatch support, with foundation models described as "trained exclusively on clinical data." Corti\'s own published material confirms the strongest and most recently-dated certification set verified in this batch: ISO/IEC 27001 (certified Aug 2025), SOC 2 Type II (renewed Jun 2025), Germany\'s BSI C5 Type II (Jun 2025), and ISAE 3000 Type II covering GDPR privacy/data-protection controls (Jun 2025), plus a UK MHRA Class I medical-device registration for "Corti Assistant MD" (Jul 2025) with EU Class I registration stated as pending (Sep 2025). One real, worth-stating gap: no FDA clearance or US medical-device pathway was found cited anywhere in this review, distinct from the UK/EU device registrations Corti does document -- a genuine gap for US-market deployment specifically. A category-wide caution worth carrying across this batch: Ontario\'s Auditor General reported (12 May 2026) that of 20 provincially-approved AI medical-scribe vendors tested against two simulated doctor-patient interactions, 45% fabricated information or suggested treatment plans never discussed, 60% captured incorrect medications, and 85% missed mental-health details in at least one test -- no individual vendor was named in the public report, so this is cited as category context, not a finding against this specific tool.',
    sources: ['Corti, "Safer AI for healthcare starts here: Corti achieves ISO/IEC 27001"', 'Corti, "New certifications and medical device support from Corti"'], lastReviewed: '2026-08' },
    { id: 't-aidoc', name: 'Aidoc', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'AI-powered radiology triage and diagnostic platform, positioned as the AI-radiology vendor with the most FDA clearances on the market. In January 2026 Aidoc secured what it calls healthcare\'s first comprehensive foundation-model AI clearance, covering 11 newly cleared indications for body CT plus three previously cleared indications, on top of a platform ("aiOS") that has analyzed more than 100 million patient cases. Aidoc\'s own security page states it "complies with the strictest international security and privacy standards and regulations," but this review could not independently confirm which specific named certifications (SOC2, ISO 27001, HITRUST) are held -- the page displays them only as an image, not readable text, a real access/verification gap rather than an assumed weakness. No statement was found on whether patient imaging data is used to train Aidoc\'s models.',
    sources: ['Aidoc, "Aidoc Secures FDA Clearance for Healthcare\'s First Comprehensive Foundation Model AI"', 'Aidoc, "Security & Privacy"'], lastReviewed: '2026-08' },
    { id: 't-viz-ai', name: 'Viz.ai', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'lower-risk',
    reasoning: 'AI-powered disease-detection and care-coordination platform, with the longest-standing FDA regulatory record verified in this batch: the FDA\'s own De Novo clearance (13 Feb 2018) for Viz.AI Contact -- the first FDA-cleared clinical decision support software for stroke -- explicitly limits it to "analysis of imaging data" that "should not be used as a replacement of a full patient evaluation or solely relied upon to make or confirm a diagnosis," a real, primary-sourced use restriction the FDA itself imposed. Viz.ai has since added further 510(k) clearances (including RV/LV analysis and aneurysm detection) and confirms ISO 27001:2022 certification plus completion of a SOC 2 Type II and HIPAA audit for its Viz.ai One platform (26 Feb 2024) -- the broadest confirmed certification set of any tool in this batch. No statement was found on whether patient imaging data trains its models.',
    sources: ['U.S. Food and Drug Administration, "FDA Permits Marketing of Clinical Decision Support Software for Alerting Providers of a Potential Stroke"', 'Viz.ai, "Viz.ai Strengthens Information Security with ISO-27001:2022 Certification"', 'Viz.ai, "Viz.ai Announces Successful Completion of SOC 2 Type II + HIPAA Audits for Viz.ai One Platform"'], lastReviewed: '2026-08' },
    { id: 't-pathai', name: 'PathAI', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'lower-risk',
    reasoning: 'AI-powered digital pathology platform. PathAI holds a real, specific combination of certifications distinct from a generic security claim: ISO 27001 (information security) plus ISO 13485 and MDSAP (medical-device quality management system, certified since 29 Jan 2019, predating most tools in this project\'s inventory). Its AISight Dx platform received 510(k) FDA clearance for primary diagnosis on 30 Jun 2025, notably including a Predetermined Change Control Plan (PCCP) that lets PathAI validate and deploy specified future model changes without a fresh 510(k) submission each time -- a real, specific regulatory governance mechanism, not just a one-time clearance. No statement was found on whether pathology slide data trains its models.',
    sources: ['PathAI, "PathAI Earns ISO 27001 Security Certification"', 'PathAI, "PathAI Earns Major Quality Certification, Expands Executive Team with Regulatory Expertise"', 'PathAI, "PathAI Receives FDA Clearance for AISight Dx Platform for Primary Diagnosis"'], lastReviewed: '2026-08' },
    { id: 't-tempus', name: 'Tempus AI', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'high-risk',
    reasoning: 'AI-driven precision-medicine and genomics platform (publicly traded, NASDAQ: TEM). **The headline finding of this batch, and one of the most severe findings verified anywhere in this project\'s inventory** -- Tempus is defending two separate, real, active federal lawsuits connected to the same underlying event. First, a consolidated genetic-data-privacy class action (Farrier et al. v. Tempus AI, N.D. Ill., complaint consolidated 15 Apr 2026) alleges Tempus\'s Feb 2025 acquisition of Ambry Genetics ($600M) led to genetic data from "hundreds of thousands of individuals" being disclosed to more than 70 pharmaceutical and biotech partners under commercial agreements worth $1.1 billion, without consent, in violation of the Illinois Genetic Information Privacy Act (GIPA) and consumer-protection laws in six other states -- plaintiffs specifically argue genetic data "cannot be deidentified because such data serves as an inherently unique biomarker." Second, and separately, a securities fraud class action (class period 6 Aug 2024 to 27 May 2025) alleges Tempus inflated related-party contract values, engaged in a suspicious SoftBank joint-venture capital "round-tripping" arrangement, relied on the Ambry acquisition\'s "aggressive and potentially unethical billing practices," and mischaracterized a reduced AstraZeneca funding commitment as a genuine $35 million extension when it was allegedly a pass-through payment.',
    sources: ['HIPAA Journal, "Healthcare AI Firm Sued Over Alleged Unlawful Disclosures of Genetic Data"', 'Kessler Topaz, "Tempus AI, Inc. (NASDAQ: TEM) Securities Fraud Class Action"'], lastReviewed: '2026-08' },
    { id: 't-glass-health', name: 'Glass Health', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'AI clinical decision support and ambient scribing platform for physicians, positioned around differential-diagnosis and clinical-plan assistance. Glass Health\'s own published material is candid about hallucination risk in a way worth naming directly, in the same spirit as this project\'s other self-disclosed-risk findings (DISCO Cecilia AI, R26): "Large language models can hallucinate -- generating plausible-sounding but factually incorrect information," and states outright that "AI does not guarantee clinical accuracy." Glass Health frames physician review as a non-negotiable operational requirement rather than a legal hedge: "The physician-in-the-loop is not a legal disclaimer. It is a clinical safety requirement." No specific formal security certification (SOC2, HIPAA attestation, ISO 27001) or FDA/CDS regulatory-status statement was found cited in the material reviewed.',
    sources: ['Glass Health, "AI for Doctors 2026: Scribing, CDS, DDx -- Physician Guide"'], lastReviewed: '2026-08' },
    { id: 't-openevidence', name: 'OpenEvidence', category: 'Clinical Diagnostics & Decision Support AI', industries: ['healthcare'],
    classification: 'caution',
    reasoning: 'AI-powered clinical-evidence and question-answering platform marketed to physicians (Elsevier Health content partnership). OpenEvidence\'s own security page states it "fully complies with the U.S. Health Insurance Portability and Accountability Act (HIPAA)," but this review found no named third-party certification (SOC2, ISO 27001) confirming that compliance independently, no statement on whether physician queries are used to train its models, and no confirmation of how physician identity or licensure is verified before clinical answers are served -- three real, unaddressed gaps for a tool marketed specifically on evidence-based clinical trustworthiness.',
    sources: ['OpenEvidence, "Security and Compliance"'], lastReviewed: '2026-08' },
    { id: 't-copy-ai', name: 'Copy.ai', category: 'Marketing content', industries: ['media'],
    classification: 'lower-risk',
    reasoning: 'AI-powered marketing copywriting and workflow-automation platform. Copy.ai confirms SOC 2 Type II compliance (its own dedicated announcement plus its current security page) and makes an explicit, threefold data-use commitment: "We don\'t train on your data," "We don\'t share your prompts," "We don\'t sell your data" -- stated directly as "our models are trained without utilizing your individual data."',
    sources: ['Copy.ai, "Copy.ai is Now SOC 2 Type II Compliant"', 'Copy.ai, "Secure Generative AI you can trust"'], lastReviewed: '2026-08' },
    { id: 't-writer', name: 'Writer', category: 'Marketing content', industries: ['media', 'professional'],
    classification: 'lower-risk',
    reasoning: 'Enterprise generative-AI content platform. Writer\'s own Trust Center confirms the broadest certification set found in this batch: annual SOC 2 Type II evaluations, ISO/IEC 27001, 27701, and **42001** (the AI-management-system-specific standard, joining the precedent set by 6sense, Zendesk AI, and Sierra elsewhere in this project), HIPAA Type 1, and PCI compliance. Writer states plainly: "WRITER does not train its models on your data, nor does it train on user inputs or any outputs," and confirms customers retain ownership of all data and materials they provide.',
    sources: ['Writer, "World-class enterprises trust WRITER" (Trust Center)'], lastReviewed: '2026-08' },
    { id: 't-anyword', name: 'Anyword', category: 'Marketing content', industries: ['media', 'retail'],
    classification: 'caution',
    reasoning: 'AI copywriting platform for ads and marketing copy, with a built-in performance-prediction score. Anyword\'s own security page states it upholds "SOC 2, ISO, and GDPR regulations" and displays HIPAA, SOC 2 Type II, and AICPA compliance badges. **A real precision gap:** the page names "ISO" generically without specifying which ISO standard (27001, 42001, or otherwise) is actually held -- a materially less specific disclosure than Writer\'s or 6sense\'s named-standard claims elsewhere in this project. No statement was found on whether customer data is used to train Anyword\'s models.',
    sources: ['Anyword, "Security"'], lastReviewed: '2026-08' },
    { id: 't-persado', name: 'Persado', category: 'Marketing content', industries: ['media', 'retail'],
    classification: 'caution',
    reasoning: 'AI-generated marketing-language platform built around emotionally- and psychologically-optimized copy for retail/e-commerce campaigns, trained on a domain-specific model drawing on "120K+ campaigns with real performance outcomes." Persado\'s own governance page confirms SOC 2 Type II, plus PCI DSS Level 1 and SOC 1 coverage inherited through AWS hosting. **A real precision distinction, in the same spirit as this project\'s Daloopa finding (R30):** Persado\'s own page describes itself as "ISO 27001 Aligned" -- an internal alignment claim, not a confirmed completed third-party ISO 27001 certification. **A second, more specific gap:** despite a business model centered on psychologically-targeted, emotion-optimized marketing language -- arguably the category most directly implicated by manipulative-design and dark-pattern scrutiny -- no bias, fairness, or manipulation-safeguard governance statement was found anywhere in the material reviewed.',
    sources: ['Persado, "Governance, Security, & Privacy"'], lastReviewed: '2026-08' },
    { id: 't-phrasee', name: 'Phrasee (now Jacquard)', category: 'Marketing content', industries: ['media', 'retail'],
    classification: 'caution',
    reasoning: 'AI-generated marketing-language platform for retail/e-commerce email and campaign copy. **A structural/ownership finding worth stating directly, consistent with this project\'s other absorbed/rebranded-product findings** (Google Agentspace/Gemini Enterprise, R25; BloombergGPT/Bloomberg Terminal AI, R30): following a private-equity takeover by a Capital D-led consortium, Phrasee formally rebranded as **Jacquard on 12 June 2024** and now markets itself around AI-driven personalized campaigns rather than the original Phrasee brand -- kept as one entry covering both names rather than treated as two separate products. **A real gap:** this review could not locate a dedicated, current security/trust page for Jacquard confirming any specific formal certification (SOC2, ISO), a materially thinner disclosure picture than several other tools in this same batch.',
    sources: ['Business Wire, "A New Frontier for Enterprise SaaS Tooling: Jacquard Set to Redefine AI in Marketing"', 'CapitalD, "Phrasee rebrands as Jacquard and launches its Personalised Campaigns product"'], lastReviewed: '2026-08' },
    { id: 't-canva-magic-write', name: 'Canva Magic Write', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI text-generation feature within the Canva design platform. Canva\'s own security page confirms a strong platform-level certification set: SOC 2 Type II, SOC 3, ISO 27001, PCI DSS, and Data Privacy Framework participation. **A real, dated finding worth stating precisely:** Canva\'s Terms of Use frame AI-training data use as something a user "opt[s] into... via the privacy settings," but independent reporting (Mar 2025) found the general AI-training usage setting was already turned on by default for new accounts, requiring users to manually find and disable it -- the same opt-out-by-default pattern this project has flagged for ChatGPT, Gemini, Microsoft Copilot, and GitHub Copilot, here specifically confirmed for the parent Canva product that hosts Magic Write. Private designs and Canva for Education content are excluded from this training-data use.',
    sources: ['Canva, "Security at Canva"', 'The Phoblographer, "Canva is Using Your Work To Train Its AI"'], lastReviewed: '2026-08' },
    { id: 't-surfer-seo', name: 'Surfer SEO', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI-powered SEO content-optimization and briefing platform. Surfer\'s own enterprise page states it is "fully compliant with key industry regulations and standards, including GDPR," and cites ISO 27001 certification held by its parent company, Positive Group -- a real precision distinction worth naming: this is a parent-company certification cited on Surfer\'s own page, not independently confirmed as a Surfer-specific audit scope. No SOC2 certification and no statement on whether customer content trains Surfer\'s AI models were found in this review.',
    sources: ['Surfer SEO, "Positive Surfer - Enterprise"'], lastReviewed: '2026-08' },
    { id: 't-clearscope', name: 'Clearscope', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI-powered content-optimization and SEO grading platform. **A real, worth-stating gap:** this review\'s access to Clearscope\'s own privacy policy showed a last-updated date of 5 October 2017 -- nearly a decade old, predating GDPR enforcement (May 2018), CCPA, and any AI-specific policy consideration entirely. The policy states only general, non-specific safeguards ("measures reasonably necessary to protect against... unauthorized access, use, alteration or destruction") and contains no mention of SOC2, ISO certification, or AI-model-training practices.',
    sources: ['Clearscope, "Privacy policy"'], lastReviewed: '2026-08' },
    { id: 't-marketmuse', name: 'MarketMuse', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI-powered content-strategy and topic-modeling platform. MarketMuse\'s public privacy notice states the company is "both DPA and GDPR compliant," but names no SOC2 or ISO certification and makes no statement on AI-model-training practices. **A real scope-limitation gap worth flagging directly:** the notice\'s own text states it "only governs the use of personal data on our website... including the sub-pages" -- meaning this is a marketing-website privacy notice, not a confirmed statement of the software platform\'s own data-handling practices.',
    sources: ['MarketMuse, "Privacy Policy"'], lastReviewed: '2026-08' },
    { id: 't-seventh-sense', name: 'Seventh Sense', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI-powered email send-time optimization platform for HubSpot and Marketo, marketed as "The AI engagement layer." Seventh Sense\'s site footer displays SOC 2 Type II, GDPR, and CCPA compliance badges, though the privacy policy text itself does not elaborate on the certifications\' scope or audit dates. The product connects directly into a customer\'s HubSpot/Marketo account via a "connector" to collect personal data and build subscriber engagement profiles. **A real, notable omission given the product\'s own AI-forward positioning:** no statement was found anywhere in the reviewed material on whether this profile data is used to train Seventh Sense\'s models.',
    sources: ['Seventh Sense, "Privacy Policy"'], lastReviewed: '2026-08' },
    { id: 't-mutiny', name: 'Mutiny', category: 'Marketing content', industries: ['media'],
    classification: 'caution',
    reasoning: 'AI-powered B2B website and account-based personalization platform for go-to-market teams. Mutiny\'s own privacy policy makes the most specific, granular data-use commitment found in this batch: **"Mutiny does not use Personal Information such as names, email addresses, contact data, or call recordings to train its AI models,"** while separately disclosing that de-identified and aggregated data derived from customer content may be used "to improve services" -- with an explicit customer opt-out available by contacting privacy@mutinyhq.com. **A real gap:** no SOC2 or ISO certification was found cited anywhere in the material reviewed.',
    sources: ['Mutiny, "Privacy Policy"'], lastReviewed: '2026-08' },
    { id: 't-beautiful-ai', name: 'Beautiful.ai', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'lower-risk',
    reasoning: 'AI-assisted presentation-design platform. Beautiful.ai confirms SOC 2 Type II, PCI, GDPR, and CCPA compliance plus annual independent web-application penetration testing, and makes a specific, strongly-worded data-use commitment: "Data processed by our AI models will not be used to train public LLM models," with AI sub-processor data retention capped at a maximum of 30 days and sub-processors "barred from using customer data for training."',
    sources: ['Beautiful.ai, "Security at Beautiful.ai"'], lastReviewed: '2026-08' },
    { id: 't-coda-ai', name: 'Coda AI', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'caution',
    reasoning: 'AI-assisted all-in-one document/workspace platform. Coda confirms a strong general certification set -- ISO/IEC 27001:2022, 27017:2015, and 27018:2019, plus SOC 2 Type II attestation, full GDPR compliance, and CCPA compliance. **A real, notable gap given the strength of this general certification set:** no statement was found anywhere in the reviewed material on whether customer document content is used to train Coda AI\'s underlying models -- a real omission for a core, AI-branded product feature.',
    sources: ['Coda, "ISO certification and beyond: How Coda ensures enterprise readiness"', 'Coda, "Trust at Coda"'], lastReviewed: '2026-08' },
    { id: 't-mem', name: 'Mem', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'lower-risk',
    reasoning: 'AI-powered personal notes and knowledge-management app (get.mem.ai). **A precision check worth naming directly, given how easy the collision would be to miss:** Mem is a distinct company and product from Mem0 (mem0.ai), an unrelated open-source universal memory layer for AI agents -- kept carefully separate. Mem itself achieved SOC 2 Type II compliance (announced 15 Jan 2026) and makes an unusually strong, specific data-use commitment: "We never let third parties train on your data. Your notes, your thoughts, your knowledge -- none of it is used to train AI models by us or any vendor we work with."',
    sources: ['Mem, "Mem is Now SOC 2 Type II Compliant"'], lastReviewed: '2026-08' },
    { id: 't-guru', name: 'Guru', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'lower-risk',
    reasoning: 'AI-powered knowledge-management platform. Guru confirms SOC 2 Type II (independently audited), PCI compliance (annual SAQ A-EP plus monthly vulnerability scans), GDPR readiness via standard contractual clauses, Google CASA certification for its Google Drive integration, and Microsoft 365 App Compliance Program certification. Guru states plainly: "Guru does not use your content to train the LLM in any way; your content remains exclusively yours," and implements "zero day retention" -- content submitted to third-party LLMs is removed immediately after processing. **A real gap:** no ISO 27001 certification was found cited, and HIPAA coverage is offered only as a Business Associate Agreement on request rather than a confirmed existing certification.',
    sources: ['Guru, "Security Compliance: Information & Knowledge Sharing"'], lastReviewed: '2026-08' },
    { id: 't-glean', name: 'Glean', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'caution',
    reasoning: 'AI-powered enterprise search and work-assistant platform. **A precision check worth naming directly:** this entry covers Glean (glean.com), the enterprise search platform R23 scoped -- not the similarly-named Glean.ai (glean.ai), an unrelated spend-management company that separately announced its own SOC 2 Type II certification; the two were kept carefully distinct. Glean\'s own security page confirms a strong certification set -- ISO 42001 (the AI-management-specific standard), SOC 2 Type II, ISO 27001, HIPAA, GDPR, and TX-RAMP Level 2 -- plus a real permission-syncing architecture: "Enforce source-system permissions on every read and write; an agent should not automatically access everything the user can." **This is the exact permission-inheritance concern R23 flagged for this cluster, and it deserves precise framing rather than a blanket caution or a blanket pass.** An independent security analysis (Knostic.ai) argues Glean\'s source-permission enforcement, while real, does not fully resolve a distinct risk: "LLMs introduce a new class of access risk where users receive information they are technically authorized to access, but not operationally cleared to know" -- because synthesis across many individually-permissioned documents can reveal an aggregate picture (e.g., a full product roadmap) no single source document exposed on its own. This is framed as a general, industry-wide architectural risk, not a documented Glean-specific breach or incident. No statement was found on whether indexed customer content trains Glean\'s models.',
    sources: ['Glean, "AI Security: Protecting Enterprise Data with Glean"', 'Knostic.ai, "Glean Secures LLM Search. Who Stops Oversharing?"'], lastReviewed: '2026-08' },
    { id: 't-slack-ai', name: 'Slack AI', category: 'Productivity', industries: ['technology', 'professional', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'AI-powered search, summarization, and assistant features built into Slack. Slack\'s own published material describes the strongest permission-and-training combination found in this cluster: **"Slack AI only operates on the data that the user can already see,"** enforced by using "the requesting user\'s Access Control List (ACLs) when fetching the data to summarize or search"; **"We do not train large language models (LLMs) on customer data,"** using off-the-shelf models with Retrieval Augmented Generation instead of fine-tuning, so "the model does not retain any of that data"; and customer data is kept within "Slack\'s trust boundary" via an AWS escrow-VPC hosting approach. Slack\'s own compliance page confirms SOC 2 Type II, ISO 27001/27017/27018/27701, HIPAA-configurability, and **FedRAMP Moderate** authorization for standard Enterprise/Enterprise+ plans, with the separate GovSlack offering holding **FedRAMP JAB High** authorization. Gained `federal-contractors` on this FedRAMP finding.',
    sources: ['Slack, "How we built Slack AI to be secure and private"', 'Slack, "Resources for compliance"'], lastReviewed: '2026-08' },
    { id: 't-box-ai', name: 'Box AI', category: 'Productivity', industries: ['technology', 'professional', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'AI features (via OpenAI, Anthropic, and Google models) built into the Box content-management platform. Box AI\'s own trust material states plainly: **"Box will not train AI models on our customers\' content without their explicit approval,"** described as a "core pillar" of Box\'s AI Principles, and confirms permission enforcement: "Box AI is governed by Box\'s built-in permissions and designed to keep customers in control of their data so users can only see and interact with the files and content they are allowed to access." Box itself holds a substantial federal-authorization record confirmed via the FedRAMP Marketplace: **FedRAMP High, FedRAMP Moderate, and DoD IL4** authorizations (certified 25 Mar 2025), with 53 total Authority to Operate/Authority to Use letters from federal agencies -- a genuinely broad federal-adoption record. Gained `federal-contractors` on this finding. **A real gap:** this review did not find a specific third-party-model data-handling policy distinguishing how OpenAI/Anthropic/Google each individually handle Box-forwarded content, beyond Box\'s own platform-level commitment.',
    sources: ['Box, "Box AI Trust"', 'FedRAMP Marketplace, "Box Enterprise Cloud Content Collaboration Platform"'], lastReviewed: '2026-08' },
    { id: 't-dropbox-dash', name: 'Dropbox Dash', category: 'Productivity', industries: ['technology', 'professional'],
    classification: 'caution',
    reasoning: 'AI-powered universal-search platform that indexes content across connected apps (Google Drive, Slack, and others). Dash\'s own security page confirms SOC 2 Type II compliance and states explicitly: "end-users only have access to the content they have permissions for across any given connector," with admins able to control "who has access to specific company content within source connectors at the individual document level." Dash also makes a clear AI-training commitment: "We will not build generative AI models using your content without consent." **A real gap next to Slack AI\'s and Box AI\'s stronger records in this same cluster:** no ISO 27001, ISO 42001, or FedRAMP authorization was found cited for Dropbox Dash specifically.',
    sources: ['Dropbox Dash, "AI-powered universal search with high security compliance standards"'], lastReviewed: '2026-08' },
    { id: 't-brisk-teaching', name: 'Brisk Teaching', category: 'Education AI', industries: ['education'],
    classification: 'lower-risk',
    reasoning: 'AI-powered Chrome extension for teachers (lesson planning, feedback, differentiation, assessment creation). Brisk confirms SOC 2 Type II compliance and explicit student-privacy-law compliance: "complies with strict student privacy laws (FERPA, COPPA, GDPR, Canadian provincial and territorial privacy legislation, and more)." Brisk makes an unusually strong, unqualified data-training commitment: "Student and teacher inputs are never used to train, fine-tune, or improve AI models. This applies to every interaction, every tool, every feature in Brisk."',
    sources: ['Brisk Teaching, "Privacy Center"'], lastReviewed: '2026-08' },
    { id: 't-schoolai', name: 'SchoolAI', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-powered classroom platform for teachers and students ("Spaces" for guided AI activities). SchoolAI\'s own material confirms "the platform is FERPA and COPPA compliant, with SOC 2 compliance and 1EdTech certification" -- 1EdTech is a specific, education-sector-specific interoperability/privacy certification distinct from the generic security certifications most other tools in this project cite. The platform includes automatic consent documentation and data-deletion schedules. **A real gap:** no statement was found on whether student interaction data is used to train SchoolAI\'s own AI models.',
    sources: ['SchoolAI, "FERPA & COPPA compliance guide for school AI infrastructure"'], lastReviewed: '2026-08' },
    { id: 't-curipod', name: 'Curipod', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-powered interactive lesson and classroom-activity generator. Curipod makes a specific, direct data-training and data-sharing commitment: "We never use teacher or student data to train the AI models we use," and "Teacher and student personal data is not shared with model providers," alongside a stated compliance posture: "Curipod is built for schools with COPPA, FERPA, and GDPR compliance at the center." **A real gap:** no third-party formal certification (SOC2, ISO) was found cited anywhere in the material reviewed, distinct from Brisk Teaching\'s and SchoolAI\'s confirmed SOC 2 status elsewhere in this batch.',
    sources: ['Curipod, "Safe AI in Curipod - Teacher-controlled AI for learning"'], lastReviewed: '2026-08' },
    { id: 't-diffit', name: 'Diffit', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-powered tool that adapts reading passages and materials to different reading levels. Diffit states it is "FERPA and COPPA compliant" and has earned a "Pass" rating from Common Sense Media\'s independent privacy evaluation program -- a genuine third-party assessment, distinct from a vendor\'s own self-reported compliance claim. **Two real gaps:** no SOC2 or ISO certification was found cited, and no statement was found on whether user-uploaded text (which may include student writing) is used to train Diffit\'s underlying models.',
    sources: ['Diffit, "Privacy"'], lastReviewed: '2026-08' },
    { id: 't-turnitin-ai-detection', name: 'Turnitin AI Detection', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-writing-detection feature within Turnitin\'s academic-integrity platform. Turnitin holds SOC 2 Type 1/Type 2 attestation and states GDPR compliance; Gradescope\'s privacy policy (adopting Turnitin\'s companywide policy) confirms "the Turnitin service is compliant with and helps institutions comply with FERPA." Common Sense Media\'s independent privacy evaluation gives Turnitin a moderate Basic Score of 68/100 -- notably lower than Diffit\'s "Pass" rating found elsewhere in this batch -- and flags behavioral-advertising/data-tracking practices as a weak point. No statement was found on whether student submissions are used to train Turnitin\'s own AI-detection models. **A real, dated finding worth precisely framing:** in Matter of Newby v Adelphi Univ. (NY Supreme Court, Nassau County, decided 28 Jan 2026, an Article 78 proceeding), a state-court judge annulled a university\'s AI-plagiarism finding that had been based on Turnitin\'s "AI-generated score of 100%," after the student\'s own re-testing with two other detectors returned 0%. Secondary press coverage (Inside Higher Ed, Plagiarism Today) described this as a ruling by a "federal judge" -- a precision check against the primary court record found this is inaccurate: it was a New York state Article 78 special proceeding before a state Supreme Court justice, not a federal case. The court\'s decision itself rested on the university\'s procedural due-process failures (denying the student\'s chosen advisor, not considering his counter-evidence), not on a substantive judicial finding that Turnitin\'s detector was unreliable -- a distinction this entry preserves rather than overstating.',
    sources: ['Turnitin, "Turnitin Announces Updates to Privacy Center, SOC 2 Certification Ahead of the GDPR"', 'Gradescope, "Privacy Policy"', 'Common Sense Media, "Privacy Report for Turnitin"', 'Matter of Newby v Adelphi Univ., 2026 NY Slip Op 26021 (Sup Ct, Nassau County, Jan 28, 2026)', 'Inside Higher Ed, "Adelphi Student Wins AI Plagiarism Lawsuit" (11 Feb 2026)'], lastReviewed: '2026-08' },
    { id: 't-gptzero', name: 'GPTZero', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-generated-text detection tool marketed directly to educators. GPTZero confirms a genuinely broad compliance set: SOC 2 Type II with annual audits, FERPA compliance ("we comply with FERPA by not storing educational records"), CCPA, GDPR, multiple completed HECVAT (Higher Education Community Vendor Assessment Toolkit) reviews, and a completed VPAT for accessibility; the company states data is collected "on an opt-in basis only" and is not used for advertising or marketing. No statement was found on whether student-submitted text is used to train GPTZero\'s own detection models. **A real, peer-reviewed reliability finding specific to the product\'s core function:** a Stanford-authored study (Liang et al., published in Patterns/Cell Press, Jul 2023) tested seven AI-text detectors, GPTZero included by name, against TOEFL essays written by non-native English speakers and against US 8th-grade essays written by native speakers. The detectors misclassified non-native writers\' essays as AI-generated at an average false-positive rate of 61.22%, versus 5.19% for native-speaker essays -- a roughly twelve-fold disparity. The paper reports this as an aggregate across all seven detectors rather than isolating a GPTZero-specific rate, a precision this entry preserves rather than overstating into a GPTZero-only figure.',
    sources: ['GPTZero, "GPTZero\'s Privacy, Security, Compliance and Certifications"', 'GPTZero, "GPTZero & Student Privacy"', 'Liang, W. et al., "GPT detectors are biased against non-native English writers," Patterns 4(7), Cell Press (Jul 2023)'], lastReviewed: '2026-08' },
    { id: 't-gradescope', name: 'Gradescope', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-assisted grading platform (STEM, economics, and business coursework) acquired by Turnitin in Oct 2018; it continues operating under its own "Gradescope by Turnitin" brand rather than being folded into a generic Turnitin entry, consistent with this project\'s established discipline for acquired-but-independently-branded products (Augmedix under Commure, R31 batch 1). Gradescope reports 100% compliance across 160+ SOC 2 controls and holds Cyber Essentials certification (Nov 2019); its privacy policy explicitly states "the Turnitin service is compliant with and helps institutions comply with FERPA," and supports pseudonymous submissions to minimize personal-data collection. **A real, specific gap distinct from a simple absence of disclosure:** rather than staying silent on AI training, Gradescope\'s own privacy policy states user data is used "to analyze our offerings and functionality" and references "refining the algorithms behind AI-based features such as text matching, handwriting recognition, and automated answer grouping" -- language that reads as an acknowledgment that student-submission data does inform its AI features, with no opt-out mechanism found described for this use.',
    sources: ['Gradescope, "Privacy Policy"', 'Turnitin, "Turnitin Adds Gradescope: Enhancing Assessment Tools"'], lastReviewed: '2026-08' },
    { id: 't-century-tech', name: 'Century Tech', category: 'Education AI', industries: ['education'],
    classification: 'caution',
    reasoning: 'AI-powered adaptive-learning platform for K-12 and further-education institutions (UK-headquartered). Century\'s own support documentation states only a general, unelaborated compliance posture: "CENTURY complies with all relevant GDPR and data protection regulations both in terms of data processing and our internal processes," with no FERPA/COPPA-specific statement found (consistent with its primarily UK/EU customer base) and no AI-training-data statement found. **The most concrete, primary-sourced gap finding in this batch:** Microsoft\'s own Microsoft 365 App Certification page for "CENTURY by CENTURY Tech" (a self-attested disclosure by the vendor, last updated 17 Jun 2026) states plainly that CENTURY "has not achieved major certifications like SOC 2, ISO 27001, or FedRAMP," and separately reports "No" for having formal security-incident-response documentation and regular log-review practices -- a rare case in this project where a vendor\'s own certification disclosure directly confirms the absence of standard security attestations, rather than this review inferring a gap from silence.',
    sources: ['Century Tech, "Security"', 'Century Tech, "Privacy Notice"', 'Microsoft Learn, "Application Information for CENTURY by CENTURY Tech - Microsoft 365 App Certification"'], lastReviewed: '2026-08' },
    { id: 't-microsoft-security-copilot', name: 'Microsoft Security Copilot', category: 'Security/Infrastructure AI', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'Generative-AI security-analyst assistant for SOC teams, built into Microsoft\'s security stack. Microsoft\'s own Security Copilot data-and-compliance FAQ states plainly: "No, Customer Data isn\'t used to train Azure OpenAI Service foundation models, and this commitment is documented in our Product Terms." Data residency is tenant-scoped -- Customer Data and prompts stay within the customer\'s tenant Geo, EU customers not opted into data sharing are stored entirely at rest within the EU, and data is logically isolated between customers. Certification set is broad: ISO 27001, 27017, 27018, 27701, 20000-1, 9001, and 22301, plus SOC 2, a HIPAA Business Associate Agreement, and HITRUST CSF. **A real, worth-flagging gap for a security-specific product:** Security Copilot is explicitly stated as not eligible for FedRAMP or US Government Cloud (GCC, GCC High, DoD) at this time -- a real limitation for the federal-agency segment of its likely customer base, distinct from the FedRAMP High authorizations confirmed for three of this batch\'s five other tools.',
    sources: ['Microsoft Learn, "Microsoft Security Copilot Data and Compliance Frequently Asked Questions"'], lastReviewed: '2026-08' },
    { id: 't-crowdstrike-charlotte-ai', name: 'CrowdStrike Charlotte AI', category: 'Security/Infrastructure AI', industries: ['all', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'Generative/agentic-AI security analyst built into the CrowdStrike Falcon platform (detection triage, SOAR playbook actions, natural-language threat hunting). CrowdStrike confirms two strong, recently-dated certifications: **FedRAMP High Authorization** (25 Nov 2025), enabling GovCloud deployment for federal, state, and local agencies, and **ISO/IEC 42001:2023** (22 Jan 2026), the AI-management-system standard, which the company states covers the entire core Falcon platform -- "CrowdStrike Endpoint Security, Falcon Insight XDR, and CrowdStrike Charlotte AI" -- not Charlotte AI alone. **A real gap:** despite reviewing Charlotte AI\'s own datasheet, its introductory blog post, and CrowdStrike\'s compliance pages, no explicit statement was found on whether customer telemetry is used to train Charlotte AI\'s underlying models or how customer data is isolated between tenants for AI purposes -- a notable omission given the strength of the regulatory certifications confirmed elsewhere.',
    sources: ['CrowdStrike, "CrowdStrike Charlotte AI Achieves FedRAMP High Authorization"', 'CrowdStrike, "CrowdStrike Achieves ISO 42001 Certification for Responsible AI-Powered Cybersecurity"', 'CrowdStrike, "Charlotte AI Data Sheet"'], lastReviewed: '2026-08' },
    { id: 't-sentinelone-purple-ai', name: 'SentinelOne Purple AI', category: 'Security/Infrastructure AI', industries: ['all', 'federal-contractors'],
    classification: 'lower-risk',
    reasoning: 'Agentic AI security-analyst product built into the SentinelOne Singularity platform. SentinelOne\'s own product page for Purple AI makes a direct, unqualified data-training commitment: **"Customer data is never used to train models."** The same page confirms **FedRAMP High** authorization, and describes concrete operational safeguards beyond the training commitment: explainable verdicts with justification for each AI decision, human-in-the-loop approval gates before automated actions execute, and complete audit logging.',
    sources: ['SentinelOne, "Purple AI: Agentic AI Security Analyst"'], lastReviewed: '2026-08' },
    { id: 't-darktrace', name: 'Darktrace', category: 'Security/Infrastructure AI', industries: ['all'],
    classification: 'caution',
    reasoning: 'AI-native network/cloud/email security platform (self-learning anomaly detection plus generative-AI investigation features). Darktrace confirms **ISO/IEC 42001** (certified by BSI, announced Jul 2025, described as a "pioneering" AI-management-system certification), alongside **ISO 27001** and **ISO 27018** (PII-in-the-cloud) and Cyber Essentials. **A real gap:** no SOC 2 certification was found confirmed in the material reviewed, and no statement was found addressing whether customer network/security data is used to train Darktrace\'s AI models -- the only AI-training disclosure found in its privacy policy concerns an unrelated data flow (recruitment applicant data processed through a third-party hiring vendor, Paradox, training Paradox\'s own LLM), which this entry deliberately does not conflate with the separate question of customer security-telemetry use. **A structural note worth flagging:** Darktrace was taken private in a $5.3B acquisition by Thoma Bravo, formally completed in 2024, a real ownership change consistent with this project\'s practice of noting corporate-structure shifts (Salesloft/Clari, Kustomer/Meta) even where it does not itself change the governance-risk classification.',
    sources: ['Darktrace, "Darktrace Achieves Pioneering ISO/IEC 42001 Certification From BSI for Responsible AI Management & Development"', 'Darktrace, "Privacy & Data Protection Notice"', 'Thoma Bravo, "Thoma Bravo Completes Acquisition of Darktrace"'], lastReviewed: '2026-08' },
    { id: 't-abnormal-security', name: 'Abnormal Security', category: 'Security/Infrastructure AI', industries: ['all', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'AI-native email-security platform (behavioral AI detecting phishing, business-email-compromise, and account-takeover attacks). Abnormal AI\'s own Trust Center states the company maintains 16+ compliance frameworks, independently and annually audited, including **SOC 2 Type II, ISO 27001, ISO 27701 (privacy), ISO 42001 (AI management), and FedRAMP Moderate**, plus GDPR/CCPA/PIPEDA compliance -- one of the broadest certification sets confirmed anywhere in this project\'s Security/Infrastructure batch. **A real gap that matters more here than for most other tools in this batch:** despite reviewing both the Trust Center and a dedicated company blog post on its security and privacy commitments, no statement was found on whether customer email content is used to train Abnormal\'s AI models -- a materially more sensitive omission for a product whose core function is analyzing the full content of customer email traffic, not just security telemetry or metadata.',
    sources: ['Abnormal AI, "Cloud Email Security" (Trust Center)', 'Abnormal AI, "An Abnormal Commitment to Security and Privacy"'], lastReviewed: '2026-08' },
    { id: 't-vectra-ai', name: 'Vectra AI', category: 'Security/Infrastructure AI', industries: ['all', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'AI-native network detection-and-response (NDR) platform. Vectra achieved **FedRAMP High Authorization** (6 Aug 2026) through a partnership with Knox Systems, a FedRAMP-authorized federal managed-cloud provider -- **a real precision distinction worth naming directly**: this is a co-authorization arrangement in which Vectra\'s platform operates within Knox\'s already-authorized federal cloud infrastructure, not an independently-obtained Vectra-only ATO, a distinction similar in kind to this project\'s earlier parent-company-certification precision checks (Surfer SEO/Positive Group, R32 batch 2). Vectra also holds **SOC 2 Type 2** compliance, but the only confirmation found for this dates to a 2021 announcement covering the "Cognito Detect and Cognito Recall" product lines -- Vectra\'s older product naming, since superseded by the current Vectra AI Platform -- and no more recent reattestation or ISO 27001/42001 certification was found confirmed for the current platform. No statement was found on whether customer network telemetry is used to train Vectra\'s AI models.',
    sources: ['Vectra AI, "Vectra AI Achieves FedRAMP High Authorization Through Partnership with Knox Systems"', 'Vectra, "Vectra Achieves SOC 2 Type 2 Compliance"'], lastReviewed: '2026-08' },
    { id: 't-airspace-intelligence', name: 'Air Space Intelligence (Flyways AI / FMDS+SMART)', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'AI-powered flight-routing and national-airspace-management platform. Commercially, Flyways AI is deployed at Alaska Airlines as a dispatcher decision-support tool -- primary reporting (NPR, Aug 2026) confirms it explicitly does NOT set routes autonomously: "dispatchers retain full control... the tool offers suggestions but doesn\'t determine actual routes or waypoints," reportedly saving Alaska tens of thousands of flight hours and roughly one million gallons of fuel annually. **The single most consequential finding across this entire R24-R36 tool-inventory expansion:** the FAA awarded Air Space Intelligence an $875 million, 12-year contract (announced 10 Aug 2026) to deploy two of its platforms -- Flow Management Data and Services (FMDS) and Strategic Management of Airspace, Routes, and Trajectories (SMART) -- inside the FAA\'s own Air Traffic Control System Command Center, to manage congestion and delays across the entire U.S. National Airspace System, with initial deployment beginning fall 2026. A separate subsidiary, Air Space Intelligence Federal, achieved **CMMC (Cybersecurity Maturity Model Certification) Level 2** in Oct 2025 -- a rigorous, 110-control NIST SP 800-171-aligned DoD certification held by only 366 of roughly 200,000Defense Industrial Base companies as of Sep 2025 -- the first CMMC finding surfaced anywhere in this project. **A real gap given the stakes involved:** no general-audience security certification (SOC2, ISO 27001) was found confirmed for the core commercial platform outside the separate Federal subsidiary\'s CMMC credential, and this review could not independently verify, from primary sources, what specific safety-case or human-oversight guarantees will govern FMDS/SMART\'s national-airspace deployment beyond the dispatcher-decision-support framing established for the narrower, already-operational Flyways product.',
    sources: ['NPR, "How one airline is using AI to optimize operations" (10 Aug 2026)', 'Aviation News, "FAA Selects Air Space Intelligence for $875 Million Modernization of US Airspace Management" (Aug 2026)', 'PR Newswire, "Air Space Intelligence Federal Achieves Cybersecurity Maturity Model Certification (CMMC) Level 2" (Oct 2025)'], lastReviewed: '2026-08' },
    { id: 't-openairlines-skybreathe', name: 'OpenAirlines SkyBreathe', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI-powered fuel-efficiency and flight-data-analytics platform for airlines, including an AI assistant feature ("SkyBreathe Advisor"). OpenAirlines confirms its own information security management system is **ISO 27001 certified**, and its privacy policy notes its AWS hosting infrastructure separately maintains ISO 27001 and **SOC 2 Type II**; the policy also grants GDPR-aligned data-subject rights (access, rectification, erasure, objection, portability) with a stated one-month response window, though it does not explicitly invoke "GDPR" by name or describe formal Data Protection Impact Assessments. **A real gap:** despite reviewing the company\'s privacy policy directly, no statement was found on whether flight, fuel, or pilot-behavior data is used to train SkyBreathe\'s AI models, including the SkyBreathe Advisor AI assistant referenced elsewhere on the site.',
    sources: ['OpenAirlines, "Privacy Policy"'], lastReviewed: '2026-08' },
    { id: 't-airbus-skywise', name: 'Airbus Skywise', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'Airbus\'s shared, multi-airline aviation data and predictive-analytics platform (fleet health monitoring, MRO forecasting, AI-based predictive maintenance), used across a large share of the world\'s major airlines. Airbus confirms **Skywise is ISO/IEC 27001:2022 certified**, verified directly via Airbus\'s own published certificate of registration for its Information Security Management System -- a real, primary-sourced confirmation rather than an inferred or marketing-only claim. **A real, structurally distinctive gap given this platform\'s specific architecture:** unlike a typical single-tenant SaaS product, Skywise is explicitly a shared platform used simultaneously by many airlines, some of them direct competitors -- and this review found no statement addressing how airline data is technically isolated or governed between competing customers on the shared platform, nor any statement on whether pooled/aggregated airline data trains Skywise\'s AI and predictive-maintenance models. This is a materially different and more specific concern than a generic "no AI-training statement found" gap elsewhere in this project, given the competitive-sensitivity of the underlying operational data.',
    sources: ['Airbus, "Certificate of Registration, ISO/IEC 27001:2022"', 'Airbus, "Skywise Core"'], lastReviewed: '2026-08' },
    { id: 't-lufthansa-technik-aviatar', name: 'Lufthansa Technik AVIATAR', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'Digital operations suite for predictive aircraft maintenance and fleet health monitoring (AI-based component-failure forecasting), offered to airline customers beyond Lufthansa itself. AVIATAR\'s own product page states only a general, unelaborated assurance: "the cloud-based infrastructure of AVIATAR ensures the highest standard of data security for customer data in compliance with European data protection requirements" -- **a real gap: this review found no specific SOC 2 or ISO certification named for AVIATAR**, in contrast to Airbus Skywise\'s directly-confirmed ISO 27001:2022 certification elsewhere in this batch, and no statement was found on whether customer aircraft-health data is used to train AVIATAR\'s predictive-failure models.',
    sources: ['Lufthansa Technik, "AVIATAR - Digital Operations Suite"'], lastReviewed: '2026-08' },
    { id: 't-searidge-aimee', name: 'Searidge Technologies (Aimee / Digital Tower)', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI framework ("Aimee") for digital/remote air traffic control towers and airport-efficiency applications -- computer-vision object detection/tracking, natural-language processing of controller-pilot radio communications, and multi-source data fusion (video, ADS-B, ATC radio, airport-operations systems). Searidge\'s own material is explicit that Aimee is **"not a replacement for human control"** and is designed to "predict and certify performance within a safety-critical context." **A real, dated, and genuinely positive regulatory finding, precisely framed:** Searidge\'s digital control tower at Vigo Airport, Spain, delivered through a joint venture with Skyway, was reported as **"successfully certified by Spanish aviation regulators"** and is now providing live air traffic control services -- the first ATC-specific regulatory-certification finding surfaced anywhere in this project. **This entry deliberately does not overstate that certification\'s scope**, however: the source material does not specify which Spanish regulatory body issued it or whether the certification covers Aimee\'s AI features specifically, as opposed to the underlying remote/digital-tower video and communications infrastructure more broadly. No general-purpose security certification (SOC2, ISO) was found confirmed for Searidge itself.',
    sources: ['Searidge Technologies, "Aimee AI Framework for Airports, ATC & ANSPs"', 'Searidge Technologies, "Searidge Powers Spain\'s First Regulator-Certified Digital Control Tower at Vigo Airport"'], lastReviewed: '2026-08' },
    { id: 't-assaia', name: 'Assaia (ApronAI / SafetyControl)', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'Computer-vision AI platform for monitoring airport apron/ramp turnaround operations, flagging standard-operating-procedure deviations (e.g., an aerobridge not fully parked) in real time, reporting a self-described "50% reduction in unsafe behavior." Assaia\'s own material is explicit that the product is designed to support, not replace, ground-operations staff: it is framed as letting teams "watch their game tapes" for continuous-improvement review rather than as an autonomous safety-enforcement system. **A genuinely distinctive positive found nowhere else in this project\'s inventory:** Assaia publishes a dedicated **"AI Ethical Use Policy"** as a standalone governance document, a rarer artifact than the generic privacy policies most other tools in this project rely on. Assaia\'s site also displays SOC 2 and ISO certification badges. **A real gap:** the specific ISO standard (27001, 42001, or another) could not be confirmed from the material reviewed -- the badge is present but unlabeled in the page content available to this review -- and no FAA or EASA regulatory approval was found mentioned for SafetyControl or ApronAI specifically, in contrast to the Spanish-regulator finding confirmed for Searidge\'s Aimee elsewhere in this batch.',
    sources: ['Assaia, "Insight: Harnessing AI for Enhanced Airport Safety"', 'Assaia, "SafetyControl"'], lastReviewed: '2026-08' },
    { id: 't-skydio', name: 'Skydio', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace', 'federal-contractors'],
    classification: 'caution',
    reasoning: 'Autonomous-flight AI drone platform for commercial inspection, public safety, and national-security use. Skydio confirms **SOC 2 Type II** certification covering general infrastructure controls (access controls, software development, network/platform monitoring, vendor risk management), and its current drone solutions -- including the only Blue UAS-cleared Drone-as-First-Responder (DFR) solution -- are on the U.S. Department of Defense\'s **Blue UAS Cleared List**, a secure-supply-chain approval confirming DoD-grade component and software sourcing. **A real gap:** the SOC 2 announcement addresses general infrastructure security but does not state whether drone-captured imagery is used to train Skydio\'s autonomy/AI models. **A real, dated, and genuinely novel evidentiary finding for this project -- a supply-chain and geopolitical-resilience risk distinct from data privacy or AI safety:** in Oct 2024, China imposed sanctions on Skydio in retaliation for U.S. arms sales to Taiwan, cutting off Skydio\'s battery supply chain and forcing the company into temporary battery rationing for customers, confirmed both in Skydio\'s own blog post ("China\'s Sanctions on Skydio") and extensive independent press coverage (Forbes, TechCrunch, DroneLife). This is not a data-governance or AI-reliability failure, but it is a real, material operational-continuity risk worth surfacing for any organization evaluating Skydio for mission-critical or time-sensitive deployments, given the company\'s own confirmation that the sanctions directly constrained its ability to supply customers.',
    sources: ['Skydio, "Skydio Announces SOC 2 Type 2 Compliance"', 'Skydio / PR Newswire, "All current Skydio drone solutions added to Blue UAS Cleared List"', 'Skydio, "China\'s Sanctions on Skydio"', 'Forbes, "Largest U.S. Drone Manufacturer Says It Will Need To Ration Batteries For Customers After Sanctions By China" (31 Oct 2024)'], lastReviewed: '2026-08' },
    { id: 't-dronedeploy', name: 'DroneDeploy', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI-powered drone data-capture, photogrammetry, and reality-capture analytics platform used across construction, energy, agriculture, and inspection use cases. DroneDeploy confirms **SOC 2 Type 2** compliance with annual audits since 2020 (following an initial SOC 2 Type 1 certification), **ISO 27001** certification dated 2019, and a specific container-security hardening effort on Google Kubernetes Engine also certified to ISO 27001. **A real currency gap worth flagging, similar in kind to a pattern this project has surfaced before (Vectra AI\'s 2021-dated SOC2 claim, R35):** the ISO 27001 certification confirmed in available material is dated 2019, and no more recent reattestation date was found confirmed for the current platform. No statement was found on whether customer drone imagery or site data is used to train DroneDeploy\'s AI models.',
    sources: ['DroneDeploy, "DroneDeploy Successfully Completes SOC 2 Type 2 Audit"', 'Google Cloud Blog, "Exploring container security: How DroneDeploy achieved ISO-27001 certification on GKE"'], lastReviewed: '2026-08' },
    { id: 't-ramco-aviation', name: 'Ramco Aviation Suite', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI-enabled MRO (maintenance, repair, and overhaul) and fleet-management software suite, used by airlines and MRO shops; Ramco\'s "Aviation Software 6.0" release specifically markets AI-driven engine and aircraft-management capabilities. Ramco maintains a dedicated Trust Center and states its products are "built with enterprise-grade safeguards, proactive monitoring, and strict governance frameworks," and cites industry recognition (ISG Paragon Awards, ARSA, Frost & Sullivan). **A real gap:** despite reviewing both its product page and Trust Center summary, no specific certification (SOC2, ISO 27001) was found named, no DO-178C or FAA/EASA AI-certification-framework reference was found, and no statement was found on whether customer maintenance data is used to train Ramco\'s AI models.',
    sources: ['Ramco, "Aviation MRO Software"', 'Ramco, "Ramco Systems Unveils Aviation Software 6.0, Leveraging AI for Smarter Aircraft Management"'], lastReviewed: '2026-08' },
    { id: 't-honeywell-forge', name: 'Honeywell Forge / Ensemble', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'AI-driven predictive-maintenance platform for commercial aviation: Honeywell Ensemble uses an "EngineCompressorAI" algorithm to continuously monitor engine vibration, temperature, and pressure data, feeding it into the Honeywell Forge analytics platform to predict component failures before they occur. **The strongest overall certification and AI-governance combination confirmed anywhere in this batch:** Honeywell\'s Trust Center confirms ISO/IEC 27001:2013 and 27001:2022, SOC 2 Type II for Honeywell Forge Performance+, SOC 2 Type I for other connected services, ISO/IEC 20000-1:2018, IEC 62443-4-1 (a secure-software-development-lifecycle standard specific to industrial/operational-technology systems), CSA STAR Level I, and UK Cyber Essentials/Cyber Essentials Plus. Honeywell also publishes six named "responsible AI principles" (accountability; safety and security; validity and reliability; fairness and equity; privacy and intellectual-property protection; transparency with explainability) -- a real, if not ISO-42001-certified, AI-governance framework. **A real gap despite this strength:** no statement was found on whether customer engine/aircraft telemetry is used to train Honeywell\'s predictive-maintenance AI models.',
    sources: ['Honeywell, "How Honeywell Ensemble Uses AI to Predict Engine Health"', 'Honeywell, "Trust Center"'], lastReviewed: '2026-08' },
    { id: 't-aloft', name: 'Aloft', category: 'Aviation & Aerospace AI', industries: ['aviation-aerospace'],
    classification: 'caution',
    reasoning: 'Drone fleet-management and UAS Traffic Management (UTM) software platform, providing airspace authorization, compliance, and fleet-operations tools for commercial and public-sector drone operators. Aloft confirms **SOC2 Type II and ISO 27001** certification, and states it undergoes regular **FAA LAANC (Low Altitude Authorization and Notification Capability) audits** -- a genuinely aviation-specific regulatory-compliance signal tied directly to the FAA\'s own drone-airspace-authorization system, distinct from the generic SaaS certifications common elsewhere in this project. **A structural note:** Terra Drone\'s board resolved on 16 Sep 2025 to acquire all remaining shares of Aloft (previously a Terra Drone equity-method affiliate since Feb 2024), making Aloft a wholly-owned Terra Drone subsidiary, expected to complete by end of Dec 2025; Aloft continues to operate its own branded product (aloft.ai) as of this research. **A real gap:** no statement was found on whether customer flight-log or airspace data is used to train Aloft\'s AI models.',
    sources: ['Aloft, "Security for Drone Airspace & Fleet Management"', 'Terra Drone, "Notice Regarding the Acquisition of Aloft Technologies, Inc., an Equity-Method Affiliate, as a Wholly Owned Subsidiary"'], lastReviewed: '2026-08' }
];
