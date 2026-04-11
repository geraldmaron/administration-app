/**
 * Linguistic Validator
 *
 * Detects determiner errors, double articles, and structural sentence anomalies
 * in scenario text fields. All functions are pure and side-effect free.
 *
 * Findings feed into the audit pipeline (scenario-audit.ts) and the
 * deterministic repair pipeline (scenario-repair.ts).
 */

import { requiresDefiniteArticle, formatCountryWithArticle } from '../lib/country-determiner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LinguisticSeverity = 'critical' | 'high' | 'medium';

export interface LinguisticFinding {
  field: string;
  issue: string;
  severity: LinguisticSeverity;
  suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DOUBLE_ARTICLE_RE = /\b(the\s+the|a\s+an?|an?\s+a(?:n?\b))\b/gi;

/**
 * Sentence boundaries: position 0, or after [.!?] followed by whitespace.
 * Returns a list of (start-index, text) pairs — one per sentence.
 */
function splitSentenceOffsets(text: string): Array<{ start: number; sentence: string }> {
  const results: Array<{ start: number; sentence: string }> = [];
  const re = /[.!?]\s+/g;
  let prev = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    results.push({ start: prev, sentence: text.slice(prev, match.index + 1) });
    prev = match.index + match[0].length;
  }
  results.push({ start: prev, sentence: text.slice(prev) });
  return results.filter((s) => s.sentence.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

/**
 * Detects missing or erroneous definite articles before `countryName` in `text`.
 *
 * Rules:
 * - If the country requires "the" and appears mid-sentence without it → high
 * - If the country requires "the" and appears sentence-initial without it → medium
 *   (sentence-initial capitalisation covers it if the author wrote the country
 *    name directly, but "The" is still missing)
 * - If the country does NOT require "the" but appears with "the " before it → medium
 */
export function validateDeterminer(text: string, countryName: string, field: string): LinguisticFinding[] {
  const findings: LinguisticFinding[] = [];
  const needs = requiresDefiniteArticle(countryName);

  // Case-insensitive pattern for the country name as a word-boundary match
  const namePattern = new RegExp(`\\b${escapeRegex(countryName)}\\b`, 'gi');
  let match: RegExpExecArray | null;

  while ((match = namePattern.exec(text)) !== null) {
    const pos = match.index;
    const preceding = text.slice(Math.max(0, pos - 5), pos);
    const hasPrecedingThe = /\bthe\s+$/i.test(preceding);

    if (needs && !hasPrecedingThe) {
      const atSentenceStart = pos === 0 || /[.!?]\s+$/.test(text.slice(0, pos));
      findings.push({
        field,
        issue: `"${countryName}" requires "the" but appears without it (${atSentenceStart ? 'sentence-initial' : 'mid-sentence'})`,
        severity: atSentenceStart ? 'medium' : 'high',
        suggestedFix: formatCountryWithArticle(countryName, atSentenceStart),
      });
    } else if (!needs && hasPrecedingThe) {
      findings.push({
        field,
        issue: `"the ${countryName}" — "${countryName}" does not conventionally use a definite article`,
        severity: 'medium',
        suggestedFix: countryName,
      });
    }
  }

  return findings;
}

/**
 * Detects doubled articles ("the the", "a an", etc.) in `text`.
 */
export function detectDoubleArticle(text: string, field: string): LinguisticFinding[] {
  const findings: LinguisticFinding[] = [];
  DOUBLE_ARTICLE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = DOUBLE_ARTICLE_RE.exec(text)) !== null) {
    findings.push({
      field,
      issue: `Double article detected: "${match[0]}"`,
      severity: 'high',
      suggestedFix: match[0].split(/\s+/)[0],
    });
  }

  return findings;
}

/**
 * Detects structural anomalies:
 * - Sentences that start with a lowercase letter (after token substitution artifacts)
 * - Dangling prepositions or articles at the end of a sentence
 * - Very short "orphan" sentences that are likely token-substitution artifacts
 */
export function validateSentenceStructure(text: string, field: string): LinguisticFinding[] {
  const findings: LinguisticFinding[] = [];
  const sentences = splitSentenceOffsets(text);

  const DANGLING_END_RE = /\b(the|a|an|of|in|on|to|by|at|for|with|and|or|but)\s*[.!?]$/i;
  const ORPHAN_RE = /^\s*\{[a-z_]+\}\s*[.!?]?\s*$/;

  for (const { sentence } of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Sentence starts lowercase (and isn't starting with a token placeholder)
    const firstChar = trimmed[0];
    if (firstChar >= 'a' && firstChar <= 'z') {
      findings.push({
        field,
        issue: `Sentence starts with lowercase: "${trimmed.slice(0, 40)}…"`,
        severity: 'medium',
      });
    }

    // Dangling article/preposition at sentence end
    if (DANGLING_END_RE.test(trimmed)) {
      findings.push({
        field,
        issue: `Sentence ends with dangling word: "${trimmed.slice(-30)}"`,
        severity: 'medium',
      });
    }

    // Orphan token placeholder as standalone sentence
    if (ORPHAN_RE.test(trimmed)) {
      findings.push({
        field,
        issue: `Orphan token placeholder sentence: "${trimmed}"`,
        severity: 'high',
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
