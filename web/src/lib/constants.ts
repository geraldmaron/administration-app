export const ALL_BUNDLES = [
  { id: 'economy', label: 'Economy', description: 'Supply chains, debt, inflation, fiscal crises', color: 'amber' },
  { id: 'politics', label: 'Politics', description: 'Elections, scandals, constitutional crises', color: 'violet' },
  { id: 'military', label: 'Military', description: 'Wars, nuclear threats, coups, peacekeeping', color: 'red' },
  { id: 'tech', label: 'Tech', description: 'AI, cybersecurity, space, digital infrastructure', color: 'cyan' },
  { id: 'environment', label: 'Environment', description: 'Climate, pollution, natural disasters', color: 'emerald' },
  { id: 'social', label: 'Social', description: 'Inequality, education, healthcare, strikes', color: 'orange' },
  { id: 'health', label: 'Health', description: 'Pandemics, epidemics, healthcare collapse', color: 'pink' },
  { id: 'diplomacy', label: 'Diplomacy', description: 'Trade wars, sanctions, alliances, hostages', color: 'blue' },
  { id: 'justice', label: 'Justice', description: 'Crime waves, corruption, judicial independence', color: 'indigo' },
  { id: 'corruption', label: 'Corruption', description: 'Government corruption, bribery, fraud', color: 'rose' },
  { id: 'culture', label: 'Culture', description: 'Cultural conflicts, media, censorship', color: 'fuchsia' },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Transportation, utilities, communications', color: 'slate' },
  { id: 'resources', label: 'Resources', description: 'Energy crises, water scarcity, mining', color: 'lime' },
  { id: 'dick_mode', label: 'Dick Mode', description: 'Authoritarian and morally dark options', color: 'rose' },
] as const;

export const ALL_REGIONS = [
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'caribbean', label: 'Caribbean' },
  { id: 'east_asia', label: 'East Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'eurasia', label: 'Eurasia' },
  { id: 'middle_east', label: 'Middle East' },
  { id: 'north_america', label: 'North America' },
  { id: 'oceania', label: 'Oceania' },
  { id: 'south_america', label: 'South America' },
  { id: 'south_asia', label: 'South Asia' },
  { id: 'southeast_asia', label: 'Southeast Asia' },
] as const;

export const METRIC_DISPLAY: Record<string, string> = {
  metric_economy: 'Economy',
  metric_public_order: 'Public Order',
  metric_health: 'Health',
  metric_education: 'Education',
  metric_infrastructure: 'Infrastructure',
  metric_environment: 'Environment',
  metric_foreign_relations: 'Foreign Relations',
  metric_military: 'Military',
  metric_liberty: 'Liberty',
  metric_equality: 'Equality',
  metric_employment: 'Employment',
  metric_innovation: 'Innovation',
  metric_trade: 'Trade',
  metric_energy: 'Energy',
  metric_housing: 'Housing',
  metric_democracy: 'Democracy',
  metric_sovereignty: 'Sovereignty',
  metric_immigration: 'Immigration',
  metric_corruption: 'Corruption',
  metric_inflation: 'Inflation',
  metric_crime: 'Crime',
  metric_bureaucracy: 'Bureaucracy',
  metric_budget: 'Budget',
  metric_approval: 'Approval',
  metric_unrest: 'Unrest',
  metric_economic_bubble: 'Economic Bubble',
  metric_foreign_influence: 'Foreign Influence',
};

export const BUNDLE_THEMES: Record<string, string> = {
  economy: 'fiscal',
  resources: 'fiscal',
  infrastructure: 'fiscal',
  politics: 'governance',
  justice: 'governance',
  corruption: 'governance',
  military: 'security',
  diplomacy: 'security',
  tech: 'security',
  environment: 'welfare',
  health: 'welfare',
  social: 'society',
  culture: 'society',
  dick_mode: 'society',
};

const THEME_COLORS: Record<string, { hex: string; bg: string; text: string }> = {
  fiscal:     { hex: '#fbbf24', bg: 'bg-amber-400/15',   text: 'text-amber-400' },
  governance: { hex: '#a78bfa', bg: 'bg-violet-400/15',  text: 'text-violet-400' },
  security:   { hex: '#60a5fa', bg: 'bg-blue-400/15',    text: 'text-blue-400' },
  welfare:    { hex: '#34d399', bg: 'bg-emerald-400/15', text: 'text-emerald-400' },
  society:    { hex: '#fb923c', bg: 'bg-orange-400/15',  text: 'text-orange-400' },
};

function themeFor(bundle: string) {
  return THEME_COLORS[BUNDLE_THEMES[bundle] ?? 'society'] ?? THEME_COLORS.society;
}

export const BUNDLE_ACCENT_COLORS: Record<string, string> = Object.fromEntries(
  Object.keys(BUNDLE_THEMES).map((b) => [b, themeFor(b).hex])
);

export const BUNDLE_BADGE_CLASSES: Record<string, { bg: string; text: string }> = Object.fromEntries(
  Object.keys(BUNDLE_THEMES).map((b) => {
    const t = themeFor(b);
    return [b, { bg: t.bg, text: t.text }];
  })
);

export const STANCE_CLASSES: Record<string, string> = {
  support: 'text-[var(--success)]',
  oppose: 'text-[var(--error)]',
  neutral: 'text-[var(--foreground-muted)]',
  concerned: 'text-[var(--warning)]',
};

export const STATUS_CLASSES: Record<string, string> = {
  pending: 'text-[var(--info)]',
  running: 'text-[var(--accent-primary)]',
  completed: 'text-[var(--success)]',
  failed: 'text-[var(--error)]',
  cancelled: 'text-[var(--foreground-muted)]',
};

export const INVERSE_METRICS = new Set([
  'metric_corruption',
  'metric_inflation',
  'metric_crime',
  'metric_bureaucracy',
]);

export const BUNDLE_IDS = ALL_BUNDLES.map((b) => b.id);
export const REGION_IDS = ALL_REGIONS.map((r) => r.id);

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
