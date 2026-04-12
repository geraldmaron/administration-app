import { callModelProvider, type ModelConfig } from './model-providers';
import { auditScenario, scoreScenario, sanitizeInventedTokens, type BundleScenario, type Issue } from './audit-rules';
import { isValidToken, CONCEPT_TO_TOKEN_MAP, normalizeTokenAliases } from './token-registry';
import type { CompiledTokenRegistry } from '../shared/token-registry-contract';
import { classifyRepairActions, type RepairActionType } from './issue-classification';
import type { GenerationModelConfig } from '../shared/generation-contract';
import { resolvePhaseModel, isOllamaGeneration } from './generation-models';

const AGENTIC_REPAIR_CONFIG: ModelConfig = { maxTokens: 8192, temperature: 0.2 };
const MAX_TOOL_CALLS = 8;

interface RepairToolResult {
  tool: string;
  result: unknown;
}

interface AgenticRepairStep {
  action: string;
  tool: string;
  args: Record<string, unknown>;
  observation: RepairToolResult;
  scoreBefore: number;
  scoreAfter: number;
}

export interface AgenticRepairResult {
  scenario: BundleScenario;
  improved: boolean;
  finalScore: number;
  steps: AgenticRepairStep[];
}

type AgentAction =
  | { tool: 'audit_scenario'; args: Record<string, never> }
  | { tool: 'patch_fields'; args: { title?: string; description?: string; options?: PatchOption[] } }
  | { tool: 'check_tokens'; args: { tokens: string[] } }
  | { tool: 'get_repair_guidance'; args: { action_type: RepairActionType } }
  | { tool: 'done'; args: Record<string, never> };

interface PatchOption {
  id: string;
  text?: string;
  label?: string;
  effects?: Array<{ targetMetricId: string; value: number; duration: number; probability: number; type?: 'delta' | 'absolute'; delay?: number }>;
  outcomeHeadline?: string;
  outcomeSummary?: string;
  outcomeContext?: string;
  advisorFeedback?: { roleId: string; feedback: string; stance?: string }[];
}

const REPAIR_GUIDANCE: Record<RepairActionType, string> = {
  'text-expansion': `Expand flagged fields to meet minimum length requirements. SPECIFIC THRESHOLDS: outcomeContext must be 400+ characters AND 4+ sentences (70–100 words) — structure: institution/actor, mechanism, reaction (opposition/market/public), broader implication; outcomeSummary must be 250+ characters AND 2+ sentences; description must be 60+ words; options[].text must be 50+ words. Add mechanism details, affected groups, institutional reactions, or market impacts. Return COMPLETE expanded text, never truncate. Do NOT introduce new token placeholders unless you have verified them with check_tokens first. NEVER use curly-brace placeholders {like_this} unless they exactly match the approved whitelist. Use approved role/institution tokens for government offices; if no token fits, reframe around cabinet officials or agencies without naming the office.`,
  'token-fix': `Fix token usage errors: write "the {finance_role}" or "your {defense_role}" naturally — NO {the_*} prefix tokens. Never use {the_finance_role}, {the_central_bank}, {the_player_country}, etc. Replace {president} or {prime_minister} with {leader_title}. Replace {country} or {country_name} with {player_country}. Replace hardcoded currency with {currency}. Replace any relationship token placeholders in prose with natural-language actors (e.g. "your border rival", "the allied government"). Use check_tokens to verify any uncertain token before patching.`,
  'advisor-regen': `Rewrite advisor feedback: name specific policy mechanism, constituency affected, causal chain. 1-2 sentences, 30-50 words. FORBIDDEN: "aligns with our", "our department", "course of action", "careful monitoring".`,
  'title-fix': `Fix title: 4–8 words, newspaper headline with named agent + active verb. No tokens. No duplicate words. BANNED endings: Response, Response Options, Crisis, Crises, Challenge, Conflict, Dilemma, Debate, Decision, Dispute, Standoff, Transition. BANNED openers: Managing, Balancing, Handling, Navigating, Addressing. Must contain a conjugated verb (e.g. "Blocks", "Fails", "Approves", "Uncovers").`,
  'label-fix': `Fix labels: MAX 3 words, prefer 1-2. No {token} placeholders. Keep tight for mobile badge.`,
  'voice-fix': `Fix voice: outcomes must be third-person journalistic (no "you"/"your"). Description and option text must be second-person. Rewrite passive as active. Return COMPLETE text.`,
  'tone-fix': `Fix tone: replace hardcoded ministry names with role tokens. Replace government structure terms. Remove jargon. Remove banned phrases ("the government" in second-person → "your government").`,
  'option-differentiation-fix': `Fix option differentiation: if optionDomains are provided, ensure each option has at least one effect targeting its assigned primary metric. Avoid giving all options identical effect metric sets. Preserve effect count limits (2-4 per option).`,
};

const TOOL_DESCRIPTIONS = `Available tools:

1. audit_scenario — Re-run the audit on the current scenario state. Returns the current score and list of issues.
   Args: none

2. patch_fields — Apply text patches to specific scenario fields. Only include fields you want to change.
   Args: { title?: string, description?: string, options?: [{ id: string, text?: string, label?: string, effects?: [{ targetMetricId: string, value: number, duration: number, probability: number }], outcomeHeadline?: string, outcomeSummary?: string, outcomeContext?: string, advisorFeedback?: [{ roleId: string, feedback: string, stance?: string }] }] }

3. check_tokens — Validate whether token names are in the approved whitelist.
   Args: { tokens: ["token_name_1", "token_name_2"] }

4. get_repair_guidance — Get specific instructions for a repair action type.
   Args: { action_type: "text-expansion" | "token-fix" | "advisor-regen" | "title-fix" | "label-fix" | "voice-fix" | "tone-fix" | "option-differentiation-fix" }

5. done — Signal that repair is complete. Use when score meets threshold or no further improvements possible.
   Args: none`;

const AGENT_ACTION_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: { type: 'string', description: 'Brief reasoning about what to fix and why' },
    tool: {
      type: 'string',
      enum: ['audit_scenario', 'patch_fields', 'check_tokens', 'get_repair_guidance', 'done'],
    },
    args: { type: 'object' },
  },
  required: ['reasoning', 'tool', 'args'],
};

function formatIssues(issues: Issue[]): string {
  if (issues.length === 0) return 'No issues found.';
  return issues
    .map(i => `[${i.severity}] ${i.rule}: ${i.message} (field: ${i.target})`)
    .join('\n');
}

function buildScenarioSnapshot(scenario: BundleScenario): string {
  const snap: Record<string, unknown> = {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    options: scenario.options.map(o => ({
      id: o.id,
      text: o.text,
      label: o.label,
      outcomeHeadline: o.outcomeHeadline,
      outcomeSummary: o.outcomeSummary,
      outcomeContext: o.outcomeContext,
      advisorFeedback: (o as any).advisorFeedback,
    })),
  };
  return JSON.stringify(snap, null, 2);
}

function safeTextField(original: string | undefined, patched: string | undefined): string | undefined {
  if (patched === undefined) return original;
  if (!original) return patched;
  if (typeof patched !== 'string' || patched.trim().length === 0) return original;
  if (patched.length < original.length * 0.5) return original;
  return patched;
}

function applyAgentPatch(
  scenario: BundleScenario,
  args: Extract<AgentAction, { tool: 'patch_fields' }>['args']
): BundleScenario {
  const patched: BundleScenario = { ...scenario };

  if (args.title !== undefined && typeof args.title === 'string' && args.title.trim().length > 0) {
    patched.title = args.title;
  }
  if (args.description !== undefined) {
    patched.description = safeTextField(scenario.description, args.description) ?? scenario.description;
  }
  if (args.options && Array.isArray(args.options)) {
    patched.options = scenario.options.map(orig => {
      const po = args.options!.find((p: PatchOption) => p.id === orig.id);
      if (!po) return orig;
      return {
        ...orig,
        ...(po.text !== undefined ? { text: safeTextField(orig.text, po.text) ?? orig.text } : {}),
        ...(po.label !== undefined ? { label: po.label } : {}),
        ...(po.effects !== undefined ? { effects: po.effects } : {}),
        ...(po.outcomeHeadline !== undefined ? { outcomeHeadline: safeTextField(orig.outcomeHeadline, po.outcomeHeadline) ?? orig.outcomeHeadline } : {}),
        ...(po.outcomeSummary !== undefined ? { outcomeSummary: safeTextField(orig.outcomeSummary, po.outcomeSummary) ?? orig.outcomeSummary } : {}),
        ...(po.outcomeContext !== undefined ? { outcomeContext: safeTextField(orig.outcomeContext, po.outcomeContext) ?? orig.outcomeContext } : {}),
        ...(po.advisorFeedback !== undefined ? {
          advisorFeedback: (() => {
            const patches: any[] = po.advisorFeedback!;
            return ((orig as any).advisorFeedback ?? []).map((origAdvisor: any) => {
              const replacement = patches.find((a: any) => a.roleId === origAdvisor.roleId);
              return replacement ?? origAdvisor;
            });
          })(),
        } : {}),
      };
    });
  }
  return patched;
}

function normalizeScenarioText(scenario: BundleScenario): BundleScenario {
  const s = { ...scenario };
  s.title = normalizeTokenAliases(s.title);
  s.description = normalizeTokenAliases(s.description);
  s.options = s.options.map(opt => ({
    ...opt,
    text: normalizeTokenAliases(opt.text),
    ...(opt.label ? { label: normalizeTokenAliases(opt.label) } : {}),
    ...(opt.outcomeHeadline ? { outcomeHeadline: normalizeTokenAliases(opt.outcomeHeadline) } : {}),
    ...(opt.outcomeSummary ? { outcomeSummary: normalizeTokenAliases(opt.outcomeSummary) } : {}),
    ...(opt.outcomeContext ? { outcomeContext: normalizeTokenAliases(opt.outcomeContext) } : {}),
    ...((opt as any).advisorFeedback ? {
      advisorFeedback: (opt as any).advisorFeedback.map((fb: any) => ({
        ...fb,
        ...(fb.feedback ? { feedback: normalizeTokenAliases(fb.feedback) } : {}),
      })),
    } : {}),
  }));
  return s;
}

function executeTool(
  tool: string,
  args: Record<string, unknown>,
  currentScenario: BundleScenario,
  bundle: string,
  isNews: boolean,
  registry?: CompiledTokenRegistry
): { result: unknown; updatedScenario: BundleScenario } {
  switch (tool) {
    case 'audit_scenario': {
      const normalized = normalizeScenarioText(currentScenario);
      const issues = auditScenario(normalized, bundle, isNews);
      const score = scoreScenario(issues);
      const actions = classifyRepairActions(issues);
      return {
        result: {
          score,
          issueCount: issues.length,
          issues: formatIssues(issues),
          suggestedActions: actions.map(a => a.type),
        },
        updatedScenario: currentScenario,
      };
    }

    case 'patch_fields': {
      const patched = applyAgentPatch(currentScenario, args as any);
      const updated = normalizeScenarioText(patched);
      const validSet = registry ? new Set(registry.allTokens) : undefined;
      const tokenValidator = (t: string) => validSet ? validSet.has(t) : isValidToken(t);
      sanitizeInventedTokens(updated, tokenValidator);
      const issues = auditScenario(updated, bundle, isNews);
      const score = scoreScenario(issues);
      return {
        result: {
          applied: true,
          newScore: score,
          issueCount: issues.length,
          issues: formatIssues(issues),
        },
        updatedScenario: updated,
      };
    }

    case 'check_tokens': {
      const tokens = (args as any).tokens ?? [];
      const validSet = registry ? new Set(registry.allTokens) : undefined;
      const results = tokens.map((t: string) => ({
        token: t,
        valid: validSet ? validSet.has(t) : isValidToken(t),
      }));
      return { result: { tokens: results }, updatedScenario: currentScenario };
    }

    case 'get_repair_guidance': {
      const actionType = (args as any).action_type as RepairActionType;
      const guidance = REPAIR_GUIDANCE[actionType] ?? 'No guidance available for this action type.';
      const concepts: ReadonlyArray<{ concept: string; token: string }> = registry
        ? registry.conceptToTokenMap
        : CONCEPT_TO_TOKEN_MAP;
      const conceptTable = concepts
        .slice(0, 15)
        .map(({ concept, token }) => `  - ${concept} → ${token}`)
        .join('\n');
      return {
        result: { action_type: actionType, guidance, conceptTokenMap: conceptTable },
        updatedScenario: currentScenario,
      };
    }

    case 'done':
      return { result: { done: true }, updatedScenario: currentScenario };

    default:
      return { result: { error: `Unknown tool: ${tool}` }, updatedScenario: currentScenario };
  }
}

function buildSystemPrompt(passThreshold: number): string {
  return `You are a surgical scenario repair agent for a geopolitical simulation game.

Your goal: fix audit issues on the given scenario to raise its score above ${passThreshold}/100.

STRATEGY:
1. Start by reviewing the initial audit results provided.
2. Use get_repair_guidance to understand how to fix specific issue types.
3. Use check_tokens to verify token names before using them in patches.
4. Use patch_fields to fix issues. Only change fields that have issues. You may update effects only when fixing option differentiation issues (e.g., option-metric-overlap or option-domain-missing-primary).
5. After each patch, the audit automatically re-runs and you see the new score. If score regressed, adjust.
6. Call done when the score meets ${passThreshold} or you've exhausted viable fixes.

CONSTRAINTS:
- Preserve ALL institution tokens exactly (e.g. {leader_title}, {legislature}, {finance_role}).
- The text must never contain the literal substring "the {" anywhere.
- Outcome fields (outcomeHeadline, outcomeSummary, outcomeContext) must be third-person. Description and option text must be second-person.
- Do NOT invent tokens. Use check_tokens if unsure.
- Return COMPLETE field text in patches — never truncate or abbreviate.

${TOOL_DESCRIPTIONS}

Respond with a single JSON object: { "reasoning": "...", "tool": "...", "args": {...} }`;
}

function buildInitialUserMessage(
  scenario: BundleScenario,
  issues: Issue[],
  score: number,
  passThreshold: number
): string {
  return `SCENARIO TO REPAIR:
${buildScenarioSnapshot(scenario)}

INITIAL AUDIT (score: ${score}/${passThreshold} target):
${formatIssues(issues)}

Choose your first action.`;
}

export async function agenticRepair(
  scenario: BundleScenario,
  issues: Issue[],
  bundle: string,
  isNews: boolean,
  passThreshold: number,
  modelConfig?: GenerationModelConfig,
  registry?: CompiledTokenRegistry,
): Promise<AgenticRepairResult> {
  const model = resolvePhaseModel(modelConfig, isOllamaGeneration(modelConfig) ? 'drafter' : 'repair');
  let currentScenario = scenario;
  let currentScore = scoreScenario(issues);

  const scoreGap = passThreshold - currentScore;
  if (scoreGap > 30) {
    console.warn(`[AgenticRepair] Skipping for ${scenario.id}: score ${currentScore} is ${scoreGap}pts below ${passThreshold} — too far gone`);
    return { scenario, improved: false, finalScore: currentScore, steps: [] };
  }

  const steps: AgenticRepairStep[] = [];
  const systemPrompt = buildSystemPrompt(passThreshold);

  const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  conversationHistory.push({
    role: 'user',
    content: buildInitialUserMessage(scenario, issues, currentScore, passThreshold),
  });

  for (let i = 0; i < MAX_TOOL_CALLS; i++) {
    if (currentScore >= passThreshold) break;

    const fullPrompt = `${systemPrompt}\n\n${conversationHistory.map(m => `[${m.role}]\n${m.content}`).join('\n\n')}`;

    const result = await callModelProvider<{ reasoning?: string; tool?: string; args?: Record<string, unknown> }>(
      AGENTIC_REPAIR_CONFIG,
      fullPrompt,
      AGENT_ACTION_SCHEMA,
      model
    );

    if (!result.data || !result.data.tool) {
      console.warn(`[AgenticRepair] Step ${i + 1}: LLM returned no action for ${scenario.id}`);
      break;
    }

    const { reasoning, tool, args } = result.data;
    console.log(`[AgenticRepair] ${scenario.id} step=${i + 1} tool=${tool} reasoning=${(reasoning ?? '').slice(0, 120)}`);

    if (tool === 'done') {
      steps.push({
        action: reasoning ?? 'Repair complete',
        tool: 'done',
        args: {},
        observation: { tool: 'done', result: { done: true } },
        scoreBefore: currentScore,
        scoreAfter: currentScore,
      });
      break;
    }

    const scoreBefore = currentScore;
    const { result: toolResult, updatedScenario } = executeTool(
      tool,
      args ?? {},
      currentScenario,
      bundle,
      isNews,
      registry
    );

    if (tool === 'patch_fields') {
      const newIssues = auditScenario(updatedScenario, bundle, isNews);
      const newScore = scoreScenario(newIssues);
      if (newScore >= scoreBefore) {
        currentScenario = updatedScenario;
        currentScore = newScore;
      } else {
        console.warn(`[AgenticRepair] ${scenario.id} patch rolled back: ${scoreBefore} → ${newScore}`);
      }
    }

    steps.push({
      action: reasoning ?? tool,
      tool,
      args: args ?? {},
      observation: { tool, result: toolResult },
      scoreBefore,
      scoreAfter: currentScore,
    });

    conversationHistory.push({
      role: 'assistant',
      content: JSON.stringify({ reasoning, tool, args }),
    });
    conversationHistory.push({
      role: 'user',
      content: `Tool result:\n${JSON.stringify(toolResult, null, 2)}\n\nCurrent score: ${currentScore}/${passThreshold}. ${currentScore >= passThreshold ? 'Score meets threshold — call done.' : 'Choose next action.'}`,
    });
  }

  const improved = currentScore > scoreScenario(issues);
  console.log(`[AgenticRepair] ${scenario.id} finished: ${scoreScenario(issues)} → ${currentScore} in ${steps.length} steps (improved=${improved})`);

  return {
    scenario: improved ? currentScenario : scenario,
    improved,
    finalScore: currentScore,
    steps,
  };
}
