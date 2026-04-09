/**
 * Shared deterministic scenario repair logic.
 * Imported by both the web admin API (@shared/scenario-repair) and
 * functions/src/tools/audit-and-fix-scenarios.ts.
 *
 * Pure TypeScript — no Firebase or external dependencies.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface FieldChange {
  path: string;
  before: string;
  after: string;
}

export interface RepairAnalysis {
  id: string;
  title: string;
  bundle: string | null;
  auditScore: number | null;
  auditIssues: string[];
  changes: FieldChange[];
  hasChanges: boolean;
}

export interface ApprovedRepair {
  id: string;
  patches: { path: string; value: string }[];
}

/** Minimal scenario shape required for analysis and patching. */
export interface RepairableOption {
  text: string;
  outcomeHeadline?: string;
  outcomeSummary?: string;
  outcomeContext?: string;
  advisorFeedback?: { feedback?: string }[];
}

export interface RelationshipCondition {
  relationshipId: string;
  min?: number;
  max?: number;
}

export interface RepairableScenario {
  id: string;
  title: string;
  description: string;
  options: RepairableOption[];
  relationship_conditions?: RelationshipCondition[];
  metadata?: {
    bundle?: string;
    actorPattern?: string;
    auditMetadata?: {
      score?: number;
      issues?: string[];
    };
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

export const ARTICLE_FORM_TOKENS: Record<string, string> = {
  // Relationship tokens
  adversary: 'the_adversary',
  border_rival: 'the_border_rival',
  regional_rival: 'the_regional_rival',
  ally: 'the_ally',
  trade_partner: 'the_trade_partner',
  neutral: 'the_neutral',
  rival: 'the_rival',
  partner: 'the_partner',
  neighbor: 'the_neighbor',
  player_country: 'the_player_country',
  nation: 'the_nation',
  // Role tokens
  leader_title: 'the_leader_title',
  vice_leader: 'the_vice_leader',
  finance_role: 'the_finance_role',
  defense_role: 'the_defense_role',
  interior_role: 'the_interior_role',
  foreign_affairs_role: 'the_foreign_affairs_role',
  justice_role: 'the_justice_role',
  health_role: 'the_health_role',
  education_role: 'the_education_role',
  commerce_role: 'the_commerce_role',
  labor_role: 'the_labor_role',
  energy_role: 'the_energy_role',
  environment_role: 'the_environment_role',
  transport_role: 'the_transport_role',
  agriculture_role: 'the_agriculture_role',
  // Institutional tokens
  intelligence_agency: 'the_intelligence_agency',
  domestic_intelligence: 'the_domestic_intelligence',
  security_council: 'the_security_council',
  central_bank: 'the_central_bank',
  legislature: 'the_legislature',
  upper_house: 'the_upper_house',
  lower_house: 'the_lower_house',
  judicial_role: 'the_judicial_role',
  governing_party: 'the_governing_party',
  prosecutor_role: 'the_prosecutor_role',
  state_media: 'the_state_media',
  press_role: 'the_press_role',
  armed_forces_name: 'the_armed_forces_name',
  capital_mayor: 'the_capital_mayor',
  regional_governor: 'the_regional_governor',
};

// ── Fix functions ──────────────────────────────────────────────────────────

export function applyHardcodedTheFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };
  let result = text;
  let changed = false;
  for (const [bare, article] of Object.entries(ARTICLE_FORM_TOKENS)) {
    const regex = new RegExp(`\\bthe \\{${bare}\\}`, 'gi');
    const replaced = result.replace(regex, `{${article}}`);
    if (replaced !== result) { result = replaced; changed = true; }
  }
  return { result, changed };
}

export function applyArticleFormFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };
  let result = text;
  let changed = false;
  for (const [bare, article] of Object.entries(ARTICLE_FORM_TOKENS)) {
    const sentenceInitialRegex = new RegExp(
      `(^|(?<=[.!?]\\s{1,3}))\\{${bare}\\}(?=\\s|'s\\b|"s\\b)`,
      'gim'
    );
    const replaced = result.replace(sentenceInitialRegex, (_match, prefix) => `${prefix ?? ''}{${article}}`);
    if (replaced !== result) { result = replaced; changed = true; }
  }
  return { result, changed };
}

export function applyWhitespaceFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };
  let result = text;
  const before = result;
  result = result.replace(/  +/g, ' ');
  result = result.replace(/\.\s+\./g, '.');
  result = result.replace(/([^.])\.\.([^.])/g, '$1.$2');
  result = result.replace(/,,+/g, ',');
  result = result.replace(/\s+([,.!?;:])/g, '$1');
  return { result, changed: result !== before };
}

export function applyDeterministicTextFixes<T extends RepairableScenario>(
  scenario: T
): { updated: T; changed: boolean } {
  let changed = false;

  const fix = (text: string | undefined): string | undefined => {
    if (!text) return text;
    let updated = text;

    const trillionPattern = /\$\d{5,}\s+trillion/gi;
    if (trillionPattern.test(updated)) {
      updated = updated.replace(trillionPattern, 'a massive share of the national budget');
      changed = true;
    }

    const governingPartyPattern = /\bthe governing party\b/gi;
    if (governingPartyPattern.test(updated)) {
      updated = updated.replace(governingPartyPattern, '{governing_party}');
      changed = true;
    }

    // Article form fixes removed — LLM writes "the {token}" naturally, no conversion to {the_token}.

    const { result: wsFixed, changed: wsChanged } = applyWhitespaceFixes(updated);
    if (wsChanged && wsFixed) { updated = wsFixed; changed = true; }

    return updated;
  };

  const clone: T = JSON.parse(JSON.stringify(scenario));
  clone.title = fix(clone.title) || clone.title;
  clone.description = fix(clone.description) || clone.description;
  clone.options = clone.options.map((opt) => {
    const next = { ...opt };
    next.text = fix(next.text) || next.text;
    if (next.outcomeHeadline) next.outcomeHeadline = fix(next.outcomeHeadline) || next.outcomeHeadline;
    if (next.outcomeSummary) next.outcomeSummary = fix(next.outcomeSummary) || next.outcomeSummary;
    if (next.outcomeContext) next.outcomeContext = fix(next.outcomeContext) || next.outcomeContext;
    if (Array.isArray(next.advisorFeedback)) {
      next.advisorFeedback = (next.advisorFeedback as { feedback?: string }[]).map((fb) => ({
        ...fb,
        feedback: fix(fb.feedback) || fb.feedback,
      }));
    }
    return next;
  });

  return { updated: clone, changed };
}

// ── Relationship condition repair ──────────────────────────────────────────

const ACTOR_PATTERN_DEFAULT_CONDITIONS: Record<string, RelationshipCondition> = {
  adversary: { relationshipId: 'adversary', min: -100, max: -40 },
  border_rival: { relationshipId: 'border_rival', min: -60, max: 0 },
  rival: { relationshipId: 'rival', min: -80, max: -20 },
  regional_rival: { relationshipId: 'regional_rival', min: -70, max: -10 },
  ally: { relationshipId: 'ally', min: 40, max: 100 },
};

export function applyRelationshipConditionRepair<T extends RepairableScenario>(
  scenario: T
): { updated: T; changed: boolean } {
  const actorPattern = scenario.metadata?.actorPattern;
  if (!actorPattern) return { updated: scenario, changed: false };
  const defaultCondition = ACTOR_PATTERN_DEFAULT_CONDITIONS[actorPattern];
  if (!defaultCondition) return { updated: scenario, changed: false };
  const hasConditions = Array.isArray(scenario.relationship_conditions) && scenario.relationship_conditions.length > 0;
  if (hasConditions) return { updated: scenario, changed: false };
  const clone: T = JSON.parse(JSON.stringify(scenario));
  clone.relationship_conditions = [defaultCondition];
  return { updated: clone, changed: true };
}

// ── Analysis ───────────────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function analyzeScenario(scenario: RepairableScenario): RepairAnalysis {
  const { updated } = applyDeterministicTextFixes(scenario);
  const changes: FieldChange[] = [];

  function diff(path: string, before: string | undefined, after: string | undefined) {
    if (!before || before === after) return;
    changes.push({ path, before, after: after! });
  }

  diff('title', scenario.title, updated.title);
  diff('description', scenario.description, updated.description);

  scenario.options.forEach((opt, oi) => {
    const updOpt = updated.options[oi];
    diff(`options.${oi}.text`, opt.text, updOpt.text);
    diff(`options.${oi}.outcomeHeadline`, opt.outcomeHeadline, updOpt.outcomeHeadline);
    diff(`options.${oi}.outcomeSummary`, opt.outcomeSummary, updOpt.outcomeSummary);
    diff(`options.${oi}.outcomeContext`, opt.outcomeContext, updOpt.outcomeContext);
    if (Array.isArray(opt.advisorFeedback)) {
      opt.advisorFeedback.forEach((fb, fi) => {
        const updFb = updOpt.advisorFeedback?.[fi];
        diff(`options.${oi}.advisorFeedback.${fi}.feedback`, fb.feedback, updFb?.feedback);
      });
    }
  });

  return {
    id: scenario.id,
    title: scenario.title,
    bundle: scenario.metadata?.bundle ?? null,
    auditScore: scenario.metadata?.auditMetadata?.score ?? null,
    auditIssues: scenario.metadata?.auditMetadata?.issues ?? [],
    changes,
    hasChanges: changes.length > 0,
  };
}

// ── Patching ───────────────────────────────────────────────────────────────

export function applyPatchesToScenario<T extends RepairableScenario>(
  scenario: T,
  patches: ApprovedRepair['patches']
): T {
  const clone: T = JSON.parse(JSON.stringify(scenario));
  for (const patch of patches) {
    const parts = patch.path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cursor: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
      cursor = cursor[key];
      if (cursor == null) break;
    }
    if (cursor != null) {
      const last = parts[parts.length - 1];
      const key = /^\d+$/.test(last) ? parseInt(last, 10) : last;
      cursor[key] = patch.value;
    }
  }
  return clone;
}

// ── Display ────────────────────────────────────────────────────────────────

export function formatRepairPath(path: string): string {
  if (path === 'title') return 'Title';
  if (path === 'description') return 'Description';

  const optMatch = path.match(/^options\.(\d+)\.(.+)$/);
  if (optMatch) {
    const label = OPTION_LABELS[parseInt(optMatch[1], 10)] ?? optMatch[1];
    const rest = optMatch[2];
    if (rest === 'text') return `Option ${label} — text`;
    if (rest === 'outcomeHeadline') return `Option ${label} — outcome headline`;
    if (rest === 'outcomeSummary') return `Option ${label} — outcome summary`;
    if (rest === 'outcomeContext') return `Option ${label} — outcome context`;
    const fbMatch = rest.match(/^advisorFeedback\.(\d+)\.feedback$/);
    if (fbMatch) return `Option ${label} — advisor ${parseInt(fbMatch[1], 10) + 1} feedback`;
    return `Option ${label} — ${rest}`;
  }

  return path;
}
