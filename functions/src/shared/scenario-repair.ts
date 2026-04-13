/**
 * Shared deterministic scenario repair logic.
 * Imported by both the web admin API (@shared/scenario-repair) and
 * functions/src/tools/audit-and-fix-scenarios.ts.
 *
 * Pure TypeScript — no Firebase or external dependencies.
 */

import {
  INSTITUTION_PHRASE_RULES,
  GOV_STRUCTURE_RULES,
  repairUnsupportedScaleTokenArtifacts,
  collapseRepeatedSentences,
  type PhraseRule,
  type ScenarioRequirements,
} from './scenario-audit';

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
  confirmedClean?: boolean;
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
  outcomeHeadline?: string;
  outcomeSummary?: string;
  outcomeContext?: string;
  options: RepairableOption[];
  relationship_conditions?: RelationshipCondition[];
  metadata?: {
    bundle?: string;
    actorPattern?: string;
    requires?: Partial<ScenarioRequirements>;
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

// ── Sentence utilities ─────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  const stripped = text.replace(/\{[a-z_]+\}/g, 'TOKEN');
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < stripped.length; i++) {
    current += text[i];
    if (/[.!?]/.test(stripped[i])) {
      let j = i + 1;
      while (j < stripped.length && /[.!?'"\u201D)\]]/.test(stripped[j])) {
        current += text[j];
        j++;
      }
      parts.push(current.trim());
      current = '';
      i = j - 1;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter((s) => s.length > 0);
}

export function condenseSentences(text: string, maxSentences: number): string | null {
  const sentences = splitIntoSentences(text).filter((s) => s.trim().length > 2);
  if (sentences.length <= maxSentences) return null;
  while (sentences.length > maxSentences) {
    let shortestIdx = -1;
    let shortestLen = Infinity;
    for (let i = 1; i < sentences.length; i++) {
      if (sentences[i].length < shortestLen) {
        shortestLen = sentences[i].length;
        shortestIdx = i;
      }
    }
    if (shortestIdx <= 0) shortestIdx = sentences.length - 1;
    const mergeTarget = shortestIdx > 0 ? shortestIdx - 1 : 0;
    const a = sentences[mergeTarget].replace(/[.!?]+$/, '');
    const b = sentences[shortestIdx];
    const bLower = b.charAt(0).toLowerCase() + b.slice(1);
    sentences[mergeTarget] = `${a}, and ${bLower}`;
    sentences.splice(shortestIdx, 1);
  }
  return sentences.join(' ');
}

function capitalizeFirstNarrativeLetter(text: string): string {
  let inToken = false;
  let seenToken = false;
  let prevType: 'boundary' | 'other' = 'boundary';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') { inToken = true; continue; }
    if (ch === '}') { inToken = false; seenToken = true; continue; }
    if (inToken) continue;
    if (seenToken) return text;
    if (/\s/.test(ch)) { prevType = 'boundary'; continue; }
    if (/[A-Za-z]/.test(ch)) {
      if (prevType === 'boundary' && /[a-z]/.test(ch)) {
        return text.slice(0, i) + ch.toUpperCase() + text.slice(i + 1);
      }
      return text;
    }
    prevType = 'other';
  }
  return text;
}

function capitalizeSentenceBoundaries(text: string): string {
  const chars = text.split('');
  let inToken = false;
  let capitalizeNext = false;
  let tokenClosedWhilePending = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '{') { inToken = true; continue; }
    if (ch === '}') {
      inToken = false;
      if (capitalizeNext) tokenClosedWhilePending = true;
      continue;
    }
    if (inToken) continue;
    if (capitalizeNext) {
      if (/[A-Za-z]/.test(ch)) {
        if (!tokenClosedWhilePending && /[a-z]/.test(ch)) chars[i] = ch.toUpperCase();
        capitalizeNext = false;
        tokenClosedWhilePending = false;
        continue;
      }
      if (/\s|["(\[]/.test(ch)) continue;
      if (tokenClosedWhilePending && ch === '\'') { capitalizeNext = false; tokenClosedWhilePending = false; continue; }
      if (/[)}\]"\u201D]/.test(ch)) continue;
      capitalizeNext = false;
      tokenClosedWhilePending = false;
    }
    if (/[.!?]/.test(ch)) { capitalizeNext = true; tokenClosedWhilePending = false; }
  }
  return chars.join('');
}

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

  const applyPhraseRules = (text: string, rules: PhraseRule[]): string => {
    let result = text;
    for (const rule of rules) result = result.replace(rule.detect, rule.replacement);
    return result.replace(/\bthe\s+the\s+\{/gi, 'the {');
  };

  const fix = (text: string | undefined): string | undefined => {
    if (!text) return text;
    let updated = text;

    // Repair token-context grammar errors before any other fixes.
    const beforeGrammar = updated;
    updated = updated.replace(/\b(Your|your)\s+the\s+(\{[a-z_]+\})/g, '$1 $2');
    updated = updated.replace(/\bYou\s+the\s+(\{[a-z_]+\})/g, 'Your $1');
    updated = updated.replace(/\byou\s+the\s+(\{[a-z_]+\})/g, 'your $1');
    updated = updated.replace(/\bYou\s+(\{(?!the_)[a-z_]+_role\})/g, 'Your $1');
    updated = updated.replace(/\byou\s+(\{(?!the_)[a-z_]+_role\})/g, 'your $1');
    updated = updated.replace(/\b(?:a|an|the)\s+(\{the_[a-z_]+\})/gi, '$1');
    if (updated !== beforeGrammar) changed = true;

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

    const afterInstitution = applyPhraseRules(applyPhraseRules(updated, INSTITUTION_PHRASE_RULES), GOV_STRUCTURE_RULES);
    if (afterInstitution !== updated) { updated = afterInstitution; changed = true; }

    // Strip stranded proper names that appear immediately after a role/institution token.
    // These are artifacts from replacing "Finance Minister Davies" → "the {finance_role} Davies"
    // where the role title is replaced but the person name is left floating.
    const afterTokenNameCleanup = updated.replace(
      /(\{[a-z_]+_(?:role|title|agency|force|bank|court|exchange)\})\s+([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?)\b/g,
      '$1'
    );
    if (afterTokenNameCleanup !== updated) { updated = afterTokenNameCleanup; changed = true; }

    const afterScaleArtifacts = repairUnsupportedScaleTokenArtifacts(afterInstitution);
    if (afterScaleArtifacts !== afterInstitution && afterScaleArtifacts) {
      updated = afterScaleArtifacts;
      changed = true;
    }

    // Article form fixes removed — LLM writes "the {token}" naturally, no conversion to {the_token}.

    const afterDedup = collapseRepeatedSentences(updated);
    if (afterDedup !== updated) { updated = afterDedup; changed = true; }

    const { result: wsFixed, changed: wsChanged } = applyWhitespaceFixes(updated);
    if (wsChanged && wsFixed) { updated = wsFixed; changed = true; }

    return updated;
  };

  const clone: T = JSON.parse(JSON.stringify(scenario));

  // Condense description before capitalization so the merged text is properly cased.
  const condensedDesc = condenseSentences(clone.description ?? '', 3);
  if (condensedDesc) { clone.description = condensedDesc; changed = true; }

  clone.title = fix(clone.title) || clone.title;
  clone.description = fix(clone.description) || clone.description;
  clone.outcomeHeadline = fix(clone.outcomeHeadline) || clone.outcomeHeadline;
  clone.outcomeSummary = fix(clone.outcomeSummary) || clone.outcomeSummary;
  clone.outcomeContext = fix(clone.outcomeContext) || clone.outcomeContext;

  // Capitalize after condensing and whitespace fixes.
  const capTitle = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(clone.title));
  if (capTitle !== clone.title) { clone.title = capTitle; changed = true; }
  const capDesc = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(clone.description ?? ''));
  if (capDesc !== clone.description) { clone.description = capDesc; changed = true; }
  if (clone.outcomeHeadline) {
    const capHeadline = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(clone.outcomeHeadline));
    if (capHeadline !== clone.outcomeHeadline) { clone.outcomeHeadline = capHeadline; changed = true; }
  }
  if (clone.outcomeSummary) {
    const capSummary = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(clone.outcomeSummary));
    if (capSummary !== clone.outcomeSummary) { clone.outcomeSummary = capSummary; changed = true; }
  }
  if (clone.outcomeContext) {
    const capContext = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(clone.outcomeContext));
    if (capContext !== clone.outcomeContext) { clone.outcomeContext = capContext; changed = true; }
  }

  clone.options = clone.options.map((opt) => {
    const next = { ...opt };

    const condensedText = condenseSentences(next.text ?? '', 3);
    if (condensedText) { next.text = condensedText; changed = true; }

    next.text = fix(next.text) || next.text;
    const capText = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(next.text ?? ''));
    if (capText !== next.text) { next.text = capText; changed = true; }

    if (next.outcomeHeadline) {
      next.outcomeHeadline = fix(next.outcomeHeadline) || next.outcomeHeadline;
      const capHeadline = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(next.outcomeHeadline));
      if (capHeadline !== next.outcomeHeadline) { next.outcomeHeadline = capHeadline; changed = true; }
    }
    if (next.outcomeSummary) {
      next.outcomeSummary = fix(next.outcomeSummary) || next.outcomeSummary;
      const capSum = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(next.outcomeSummary));
      if (capSum !== next.outcomeSummary) { next.outcomeSummary = capSum; changed = true; }
    }
    if (next.outcomeContext) {
      next.outcomeContext = fix(next.outcomeContext) || next.outcomeContext;
      const capCtx = capitalizeFirstNarrativeLetter(capitalizeSentenceBoundaries(next.outcomeContext));
      if (capCtx !== next.outcomeContext) { next.outcomeContext = capCtx; changed = true; }
    }
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

// Maps actorPattern values to the requires flag they imply on the country profile.
const ACTOR_PATTERN_REQUIRES_FLAG: Record<string, keyof ScenarioRequirements> = {
  adversary: 'adversary',
  border_rival: 'land_border_adversary',
  rival: 'adversary',
  regional_rival: 'adversary',
  ally: 'formal_ally',
};

export function applyRelationshipConditionRepair<T extends RepairableScenario>(
  scenario: T
): { updated: T; changed: boolean } {
  const actorPattern = scenario.metadata?.actorPattern;
  if (!actorPattern) return { updated: scenario, changed: false };

  const defaultCondition = ACTOR_PATTERN_DEFAULT_CONDITIONS[actorPattern];
  const requiresFlag = ACTOR_PATTERN_REQUIRES_FLAG[actorPattern];
  if (!defaultCondition && !requiresFlag) return { updated: scenario, changed: false };

  const hasRelConditions = Array.isArray(scenario.relationship_conditions) && scenario.relationship_conditions.length > 0;
  const hasRequiresFlag = requiresFlag ? !!scenario.metadata?.requires?.[requiresFlag] : true;

  if (hasRelConditions && hasRequiresFlag) return { updated: scenario, changed: false };

  const clone: T = JSON.parse(JSON.stringify(scenario));
  if (!hasRelConditions && defaultCondition) {
    clone.relationship_conditions = [defaultCondition];
  }
  if (!hasRequiresFlag && requiresFlag) {
    clone.metadata = clone.metadata ?? {};
    clone.metadata.requires = { ...clone.metadata.requires, [requiresFlag]: true };
  }
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
  diff('outcomeHeadline', scenario.outcomeHeadline, updated.outcomeHeadline);
  diff('outcomeSummary', scenario.outcomeSummary, updated.outcomeSummary);
  diff('outcomeContext', scenario.outcomeContext, updated.outcomeContext);

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
  if (path === 'outcomeHeadline') return 'Outcome headline';
  if (path === 'outcomeSummary') return 'Outcome summary';
  if (path === 'outcomeContext') return 'Outcome context';

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
