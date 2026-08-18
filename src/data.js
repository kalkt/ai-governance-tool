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
  { id: 'other', label: 'Other' }
];

// Base NIST questions (from v1, unchanged)
export const BASE_QUESTIONS = [
  { id: 'g1', fn: 'govern', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'Does your business have a written policy on how employees can use AI tools?',
    hint: 'Includes ChatGPT, Copilot, Gemini, or any AI feature inside existing software.',
    options: [
      { v: 0, label: 'No policy exists' },
      { v: 1, label: 'Informal guidance only' },
      { v: 2, label: 'Written policy, not consistently followed' },
      { v: 3, label: 'Written policy, reviewed and enforced' }
    ]},
  { id: 'g2', fn: 'govern', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'Who is accountable when an AI tool causes a problem?',
    hint: 'Wrong output sent to a customer, sensitive data exposed to a model, and so on.',
    options: [
      { v: 0, label: 'No one has been named' },
      { v: 1, label: 'Unclear, depends on the situation' },
      { v: 2, label: 'A specific person, but not documented' },
      { v: 3, label: 'A named owner with documented responsibility' }
    ]},
  { id: 'g3', fn: 'govern', module: 'base', depths: ['standard','comprehensive'],
    text: 'Do you have an approval process before adopting new AI tools?',
    options: [
      { v: 0, label: 'No, teams adopt tools freely' },
      { v: 1, label: 'Ad hoc, sometimes reviewed' },
      { v: 2, label: 'Yes, informal review' },
      { v: 3, label: 'Formal review with approval criteria' }
    ]},
  { id: 'g4', fn: 'govern', module: 'base', depths: ['comprehensive'],
    text: 'Do you train employees on responsible AI use?',
    options: [
      { v: 0, label: 'No training' },
      { v: 1, label: 'One-time onboarding mention' },
      { v: 2, label: 'Occasional refreshers' },
      { v: 3, label: 'Structured, role-specific, updated regularly' }
    ]},
  { id: 'g5', fn: 'govern', module: 'base', depths: ['comprehensive'],
    text: 'Are AI risks discussed at leadership or board level?',
    options: [
      { v: 0, label: 'Never' },
      { v: 1, label: 'Only after incidents' },
      { v: 2, label: 'Occasionally as part of tech updates' },
      { v: 3, label: 'Regularly, with dedicated agenda time' }
    ]},
  { id: 'm1', fn: 'map', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'Do you know which AI tools your team is actually using?',
    hint: 'Includes tools built into products you already pay for.',
    options: [
      { v: 0, label: 'No visibility' },
      { v: 1, label: 'A rough idea, not documented' },
      { v: 2, label: 'Documented list, updated occasionally' },
      { v: 3, label: 'Current inventory reviewed quarterly' }
    ]},
  { id: 'm2', fn: 'map', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'For each AI use case, have you identified who could be harmed by a mistake?',
    options: [
      { v: 0, label: 'Not considered' },
      { v: 1, label: 'Considered for one or two visible cases' },
      { v: 2, label: 'Considered for most cases' },
      { v: 3, label: 'Systematic impact analysis per use case' }
    ]},
  { id: 'm3', fn: 'map', module: 'base', depths: ['standard','comprehensive'],
    text: 'Do you classify AI use cases by risk level?',
    hint: 'Example: low (drafting), medium (customer response), high (hiring, credit, medical).',
    options: [
      { v: 0, label: 'No classification' },
      { v: 1, label: 'Informal, case by case' },
      { v: 2, label: 'Simple tiers used sometimes' },
      { v: 3, label: 'Documented tiers applied to every new use case' }
    ]},
  { id: 'm4', fn: 'map', module: 'base', depths: ['comprehensive'],
    text: 'Do you know what data your AI tools can access?',
    options: [
      { v: 0, label: 'No, and no easy way to find out' },
      { v: 1, label: 'Only for the biggest tools' },
      { v: 2, label: 'Mostly known, some gaps' },
      { v: 3, label: 'Fully mapped, reviewed regularly' }
    ]},
  { id: 'm5', fn: 'map', module: 'base', depths: ['comprehensive'],
    text: 'Do you evaluate third-party AI vendors before onboarding them?',
    options: [
      { v: 0, label: 'No vendor review' },
      { v: 1, label: 'Informal check of the website' },
      { v: 2, label: 'Basic security or privacy questionnaire' },
      { v: 3, label: 'Structured review including AI-specific risks' }
    ]},
  { id: 'me1', fn: 'measure', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'How do you check whether AI output is accurate or reliable?',
    options: [
      { v: 0, label: 'We do not check' },
      { v: 1, label: 'Users spot-check when they notice something odd' },
      { v: 2, label: 'Sampling reviews on high-stakes outputs' },
      { v: 3, label: 'Structured review with documented metrics' }
    ]},
  { id: 'me2', fn: 'measure', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'Do you track incidents related to AI use?',
    hint: 'Wrong outputs sent externally, prompt leakage, biased results, and so on.',
    options: [
      { v: 0, label: 'No tracking' },
      { v: 1, label: 'Only major incidents get discussed' },
      { v: 2, label: 'Informal log kept' },
      { v: 3, label: 'Formal incident register with review cadence' }
    ]},
  { id: 'me3', fn: 'measure', module: 'base', depths: ['standard','comprehensive'],
    text: 'Do you monitor for bias in AI outputs that affect people?',
    hint: 'Especially in hiring, customer service, pricing, or eligibility decisions.',
    options: [
      { v: 0, label: 'Not monitored' },
      { v: 1, label: 'Considered, no active checks' },
      { v: 2, label: 'Periodic manual review' },
      { v: 3, label: 'Regular structured testing' }
    ]},
  { id: 'me4', fn: 'measure', module: 'base', depths: ['comprehensive'],
    text: 'Do you keep records of AI decisions that affect customers or employees?',
    options: [
      { v: 0, label: 'No records' },
      { v: 1, label: 'Kept only when someone complains' },
      { v: 2, label: 'Some records, inconsistent' },
      { v: 3, label: 'Systematic logging with retention policy' }
    ]},
  { id: 'me5', fn: 'measure', module: 'base', depths: ['comprehensive'],
    text: 'How often do you re-evaluate the AI tools you use?',
    options: [
      { v: 0, label: 'Never after initial adoption' },
      { v: 1, label: 'When something goes wrong' },
      { v: 2, label: 'Annually' },
      { v: 3, label: 'On a defined cadence with criteria' }
    ]},
  { id: 'ma1', fn: 'manage', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'If an AI tool produced a harmful output right now, what happens next?',
    options: [
      { v: 0, label: 'Nothing formal, depends who notices' },
      { v: 1, label: 'Someone would raise it informally' },
      { v: 2, label: 'Escalation path exists but is untested' },
      { v: 3, label: 'Documented response plan, tested at least once' }
    ]},
  { id: 'ma2', fn: 'manage', module: 'base', depths: ['quick','standard','comprehensive'],
    text: 'Can you turn off or roll back an AI tool quickly if needed?',
    options: [
      { v: 0, label: 'No, would take days or longer' },
      { v: 1, label: 'Yes, but painful and slow' },
      { v: 2, label: 'Yes, within a few hours' },
      { v: 3, label: 'Yes, quickly and with a documented process' }
    ]},
  { id: 'ma3', fn: 'manage', module: 'base', depths: ['standard','comprehensive'],
    text: 'Do customers or employees know when they are interacting with AI?',
    options: [
      { v: 0, label: 'Never disclosed' },
      { v: 1, label: 'Sometimes, inconsistently' },
      { v: 2, label: 'Disclosed in most customer-facing cases' },
      { v: 3, label: 'Disclosed by default, per policy' }
    ]},
  { id: 'ma4', fn: 'manage', module: 'base', depths: ['comprehensive'],
    text: 'Do you have a way for people to challenge or appeal an AI-driven decision?',
    options: [
      { v: 0, label: 'No mechanism' },
      { v: 1, label: 'General customer support only' },
      { v: 2, label: 'Informal path, not published' },
      { v: 3, label: 'Documented appeal process' }
    ]},
  { id: 'ma5', fn: 'manage', module: 'base', depths: ['comprehensive'],
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
  { id: 'np1', fn: 'govern', module: 'nonprofit', depths: ['quick','standard','comprehensive'],
    text: 'Are you using free personal-account AI tools for organizational work?',
    hint: 'Common for cost-constrained nonprofits, but creates data risk without enterprise controls.',
    options: [
      { v: 0, label: 'Yes, extensively across staff' },
      { v: 1, label: 'Yes, informally by some staff' },
      { v: 2, label: 'Mostly enterprise, some personal accounts remain' },
      { v: 3, label: 'Fully on enterprise or organizational accounts' }
    ]},
  { id: 'np2', fn: 'govern', module: 'nonprofit', depths: ['standard','comprehensive'],
    text: 'Has your board been briefed on AI adoption and risk?',
    hint: 'Board oversight is a specific governance obligation for 501(c)(3) organizations.',
    options: [
      { v: 0, label: 'No board discussion has happened' },
      { v: 1, label: 'Mentioned briefly, no structured discussion' },
      { v: 2, label: 'Discussed once, no ongoing agenda item' },
      { v: 3, label: 'Structured briefing with ongoing board oversight' }
    ]},
  { id: 'np3', fn: 'map', module: 'nonprofit', depths: ['standard','comprehensive'],
    text: 'Do you know whether donor data has been entered into any AI tool?',
    hint: 'Includes names combined with giving amounts, donor communications, or Raiser\'s Edge / Salesforce exports.',
    options: [
      { v: 0, label: 'No idea, no controls' },
      { v: 1, label: 'Suspect yes, unclear scope' },
      { v: 2, label: 'Known limited use with anonymization' },
      { v: 3, label: 'Explicit policy prohibits, verified compliance' }
    ]},
  { id: 'np4', fn: 'govern', module: 'nonprofit', depths: ['comprehensive'],
    text: 'Have you applied for nonprofit-discounted enterprise AI accounts?',
    hint: 'Google Workspace for Nonprofits, Canva for Nonprofits, ChatGPT Business nonprofit rate, etc. Often free or steeply discounted.',
    options: [
      { v: 0, label: 'Not aware these exist' },
      { v: 1, label: 'Aware, not applied' },
      { v: 2, label: 'Applied for one or two' },
      { v: 3, label: 'Actively using multiple nonprofit-tier enterprise accounts' }
    ]},
  { id: 'np5', fn: 'measure', module: 'nonprofit', depths: ['comprehensive'],
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
  { id: 'y1', fn: 'govern', module: 'youth', depths: ['quick','standard','comprehensive'],
    text: 'Do any AI tools your team uses process data about individuals under 13?',
    hint: 'COPPA applies to children under 13. This includes names, program records, incident reports, photos.',
    options: [
      { v: 0, label: 'Yes, on personal-account AI tools without controls' },
      { v: 1, label: 'Yes, unclear which controls are in place' },
      { v: 2, label: 'Yes, only on tools with compliant Data Processing Agreements' },
      { v: 3, label: 'No youth data enters any AI tool' }
    ]},
  { id: 'y2', fn: 'govern', module: 'youth', depths: ['quick','standard','comprehensive'],
    text: 'Do you have a written policy specifically about AI use in youth programming?',
    hint: 'Separate from general staff AI policy. Covers what AI can and cannot be used for around minors.',
    options: [
      { v: 0, label: 'No youth-specific AI policy exists' },
      { v: 1, label: 'Youth mentioned in general AI policy only' },
      { v: 2, label: 'Draft youth AI policy exists, not adopted' },
      { v: 3, label: 'Adopted, HR/Legal-reviewed youth AI policy' }
    ]},
  { id: 'y3', fn: 'govern', module: 'youth', depths: ['standard','comprehensive'],
    text: 'Do you have parental consent workflows for AI tools that interact with youth?',
    options: [
      { v: 0, label: 'No consent process' },
      { v: 1, label: 'General consent covers AI implicitly' },
      { v: 2, label: 'Specific consent for some AI use cases' },
      { v: 3, label: 'Explicit, informed, specific parental consent per AI use case' }
    ]},
  { id: 'y4', fn: 'manage', module: 'youth', depths: ['standard','comprehensive'],
    text: 'Do staff know what to do if AI surfaces content that suggests youth safety concerns?',
    hint: 'Examples: signs of abuse, self-harm, or crisis surfaced through AI-analyzed communications or content.',
    options: [
      { v: 0, label: 'No protocol exists' },
      { v: 1, label: 'General mandated reporter training only' },
      { v: 2, label: 'AI-specific protocol drafted but not trained on' },
      { v: 3, label: 'AI-specific crisis protocol, staff trained' }
    ]},
  { id: 'y5', fn: 'map', module: 'youth', depths: ['comprehensive'],
    text: 'For AI tools accessible to youth on your premises, have you reviewed age-appropriateness?',
    hint: 'Common Sense Media publishes AI tool risk assessments for teen users. Some tools have documented safety failures with minors.',
    options: [
      { v: 0, label: 'No review conducted' },
      { v: 1, label: 'Informal awareness only' },
      { v: 2, label: 'Reviewed once, no update process' },
      { v: 3, label: 'Structured review with periodic re-assessment' }
    ]},
  { id: 'y6', fn: 'measure', module: 'youth', depths: ['comprehensive'],
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
    reasoning: 'On free personal accounts, conversations may be used to train models by default. Requires user to disable "Improve the model for everyone" in Data Controls. Enterprise tier (ChatGPT Business/Enterprise) has full data controls.',
    sources: ['OpenAI Data Controls documentation'], lastReviewed: '2026-04' },
  { id: 't-claude', name: 'Claude', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'On free personal accounts, conversations may be used to improve Claude by default. Requires user to disable "Improve Claude for everyone" in Privacy settings. Team/Enterprise tiers have full data controls.',
    sources: ['Anthropic Privacy documentation'], lastReviewed: '2026-04' },
  { id: 't-copilot', name: 'Microsoft Copilot', category: 'General LLM', industries: ['all'],
    classification: 'lower-risk',
    reasoning: 'When signed in with a personal Microsoft account, chat data is not used to train models by default. Enterprise Copilot has additional controls.',
    sources: ['Microsoft Privacy Statement'], lastReviewed: '2026-04' },
  { id: 't-gemini', name: 'Google Gemini', category: 'General LLM', industries: ['all'],
    classification: 'caution',
    reasoning: 'On personal Google accounts, Gemini Apps Activity is saved by default and may be reviewed by Google. Requires user to disable via account settings. Workspace tiers have organizational controls.',
    sources: ['Google Account privacy settings'], lastReviewed: '2026-04' },
  { id: 't-grok', name: 'Grok / @grok on X', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Multiple documented incidents including generation of CSAM images (December 2025), antisemitic content (July 2025), and injection of extremist narratives into unrelated responses (May 2025). Hundreds of thousands of private conversations found publicly indexed (August 2025). Active regulatory investigations in multiple jurisdictions.',
    sources: ['Common Sense Media 2026 risk assessment', 'Public reporting (multiple outlets)'], lastReviewed: '2026-04' },
  { id: 't-meta-ai', name: 'Meta AI (WhatsApp, Instagram, Facebook)', category: 'General LLM', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'No organizational account, admin interface, or governance layer exists. Data is subject to Meta\'s advertising-linked ecosystem by default. No SSO, audit logging, or compliance pathway.',
    sources: ['Meta privacy documentation'], lastReviewed: '2026-04' },
  { id: 't-character-ai', name: 'Character.AI / Replika', category: 'AI Companion', industries: ['all'],
    classification: 'high-risk',
    reasoning: 'Multiple lawsuits and legislative scrutiny related to harm to minors, including a high-profile wrongful death case. No admin controls or organizational governance capabilities. Optimized for engagement, not accuracy or professional use.',
    sources: ['Public litigation records'], lastReviewed: '2026-04' },

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
    reasoning: 'Zoom does not use audio, video, or chat content to train its AI models by default per current documentation. Enterprise controls available. Should not be enabled on calls containing sensitive information without review.',
    sources: ['Zoom AI Companion documentation'], lastReviewed: '2026-04' },

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
  { id: 't-notion-ai', name: 'Notion AI', category: 'Productivity', industries: ['technology', 'professional', 'media'],
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
  { id: 't-hebbia', name: 'Hebbia', category: 'Document analysis', industries: ['financial', 'professional'],
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
    reasoning: 'Enterprise CRM AI operating within Salesforce\'s trust and compliance framework. Data does not leave the Salesforce environment for AI processing.',
    sources: ['Salesforce Trust'], lastReviewed: '2026-04' },
  { id: 't-hubspot-ai', name: 'HubSpot AI', category: 'CRM AI', industries: ['all', 'technology', 'professional'],
    classification: 'lower-risk',
    reasoning: 'Enterprise CRM AI with SOC 2 and GDPR compliance. Data handled within HubSpot\'s existing security framework.',
    sources: ['HubSpot Trust Center'], lastReviewed: '2026-04' },

  // Coding
  { id: 't-github-copilot', name: 'GitHub Copilot', category: 'Coding assistant', industries: ['technology'],
    classification: 'lower-risk',
    reasoning: 'Enterprise tier does not use code for training. Individual tier requires opt-out. IP indemnification available on Business/Enterprise tiers.',
    sources: ['GitHub Copilot documentation'], lastReviewed: '2026-04' },
  { id: 't-cursor', name: 'Cursor', category: 'Coding assistant', industries: ['technology'],
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
  { id: 't-govgpt', name: 'Government-authorized AI (GovGPT, agency-specific)', category: 'Government AI', industries: ['government'],
    classification: 'lower-risk',
    reasoning: 'FedRAMP-authorized AI platforms deployed within government trust boundaries.',
    sources: ['FedRAMP marketplace'], lastReviewed: '2026-04' }
];
