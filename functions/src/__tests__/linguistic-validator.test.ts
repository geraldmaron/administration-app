import {
  validateDeterminer,
  detectDoubleArticle,
  validateSentenceStructure,
  type LinguisticFinding,
} from '../shared/linguistic-validator';

describe('validateDeterminer', () => {
  it('flags mid-sentence Netherlands without "the"', () => {
    const text = 'Trade ministers from Netherlands rejected the proposal.';
    const findings = validateDeterminer(text, 'Netherlands', 'description');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].suggestedFix).toBe('the Netherlands');
  });

  it('flags sentence-initial Netherlands without "the" as medium', () => {
    const text = 'Netherlands announced new tariffs today.';
    const findings = validateDeterminer(text, 'Netherlands', 'description');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].suggestedFix).toBe('The Netherlands');
  });

  it('returns no findings when "the Netherlands" is correct', () => {
    const text = 'the Netherlands announced new tariffs.';
    const findings = validateDeterminer(text, 'Netherlands', 'description');
    expect(findings).toHaveLength(0);
  });

  it('flags "the France" — France does not need article', () => {
    const text = 'Diplomats from the France attended the summit.';
    const findings = validateDeterminer(text, 'France', 'description');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('medium');
  });

  it('returns no findings when France appears without article', () => {
    const text = 'France announced new measures.';
    const findings = validateDeterminer(text, 'France', 'description');
    expect(findings).toHaveLength(0);
  });

  it('returns no findings when United States is preceded by "the"', () => {
    const text = 'Relations with the United States have improved.';
    const findings = validateDeterminer(text, 'United States', 'description');
    expect(findings).toHaveLength(0);
  });

  it('flags United States without "the"', () => {
    const text = 'United States issued a formal warning to the bloc.';
    const findings = validateDeterminer(text, 'United States', 'description');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

describe('detectDoubleArticle', () => {
  it('detects "the the"', () => {
    const text = 'The minister presented the the proposal to cabinet.';
    const findings = detectDoubleArticle(text, 'description');
    expect(findings).toHaveLength(1);
    expect(findings[0].issue).toContain('the the');
  });

  it('returns no findings for clean text', () => {
    const text = 'The minister presented the proposal to cabinet.';
    const findings = detectDoubleArticle(text, 'description');
    expect(findings).toHaveLength(0);
  });

  it('detects "a an"', () => {
    const text = 'This is a an extraordinary moment.';
    const findings = detectDoubleArticle(text, 'description');
    expect(findings).toHaveLength(1);
  });
});

describe('validateSentenceStructure', () => {
  it('flags sentence starting with lowercase', () => {
    const text = 'The cabinet met today. ministers decided to postpone the vote.';
    const findings = validateSentenceStructure(text, 'description');
    const lower = findings.filter((f) => f.issue.includes('lowercase'));
    expect(lower.length).toBeGreaterThanOrEqual(1);
  });

  it('flags dangling article at sentence end', () => {
    const text = 'The minister addressed the.';
    const findings = validateSentenceStructure(text, 'description');
    const dangling = findings.filter((f) => f.issue.includes('dangling'));
    expect(dangling.length).toBeGreaterThanOrEqual(1);
  });

  it('returns no findings for clean well-formed text', () => {
    const text =
      'The minister addressed the cabinet today. Officials confirmed that new measures would take effect next week. Opposition leaders questioned the timeline.';
    const findings = validateSentenceStructure(text, 'description');
    expect(findings).toHaveLength(0);
  });

  it('flags orphan token placeholder', () => {
    const text = 'The cabinet met. {player_country}. Ministers will act.';
    const findings = validateSentenceStructure(text, 'description');
    const orphan = findings.filter((f) => f.issue.includes('Orphan'));
    expect(orphan.length).toBeGreaterThanOrEqual(1);
  });
});
