/**
 * Daily News-to-Scenarios Pipeline
 *
 * Runs once per day, fetches recent global news headlines, classifies each
 * headline for game relevance and geographic scope, deduplicates against
 * existing scenarios, and generates new scenarios from qualified headlines.
 *
 * Flow:
 *   1. Fetch headlines from multiple RSS feeds
 *   2. Filter out headlines already processed in the last 48 h
 *   3. LLM classification (GPT-4o-mini): relevance, bundle, scope, applicable countries
 *   4. Deduplicate against existing news-sourced scenarios (title text + semantic)
 *   5. Generate scenarios via existing pipeline; save to Firestore
 *   6. Write ingestion log to news_ingestion_logs collection
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import RssParser from 'rss-parser';
import { generateScenarios, getGenerationConfig } from './scenario-engine';
import { saveScenario, getActiveBundleCount } from './storage';
import { validateConfig } from './lib/config-validator';
import { callModelProvider } from './lib/model-providers';
import { isValidBundleId, type BundleId } from './data/schemas/bundleIds';
import { normalizeRegion } from './data/schemas/regions';
import { type NewsItem } from './types';
import {
    generateEmbedding,
    findSimilarByEmbedding,
    isSemanticDedupEnabled,
} from './lib/semantic-dedup';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum scenarios to generate per daily run (cost guard). */
const MAX_SCENARIOS_PER_RUN = 6;

/** Maximum active news-sourced scenarios per bundle (accumulation guard). */
const MAX_NEWS_SCENARIOS_PER_BUNDLE = 50;

/** Minimum LLM relevance score (0-10) before a headline is used. */
const MIN_RELEVANCE_SCORE = 7;

/** How many hours back to look when filtering already-processed headlines. */
const PROCESSED_LOOKBACK_HOURS = 48;

/** RSS feeds to pull from. Mix of global, regional, and geopolitical perspectives. */
const FEED_SOURCES: { url: string; source: string }[] = [
    { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR World' },
    { url: 'https://rss.dw.com/rdf/rss-en-world', source: 'Deutsche Welle' },
    { url: 'https://feeds.feedburner.com/reuters/worldNews', source: 'Reuters World' },
    { url: 'https://www.ft.com/rss/home/world', source: 'FT World' },
    { url: 'https://asia.nikkei.com/rss', source: 'Nikkei Asia' },
    { url: 'https://www.scmp.com/rss/91/feed', source: 'South China Morning Post' },
    { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', source: 'AllAfrica' },
    { url: 'https://www.themoscowtimes.com/rss/news', source: 'Moscow Times' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassifiedHeadline {
    newsItem: NewsItem;
    bundle: BundleId;
    /** Geographic scope of the scenario to generate. */
    scope: 'global' | 'regional' | 'country';
    /** Only set when scope === 'regional'. E.g. "Southeast Asia", "Sub-Saharan Africa". */
    region?: string;
    /** ISO-3166-1 alpha-2 codes set when scope === 'country'. */
    applicable_countries?: string[];
    /** 0-10 rating of how well this fits game themes. */
    relevance_score: number;
    /** Brief explanation for why this headline maps to the bundle/scope. */
    rationale: string;
}

interface IngestionLog {
    runAt: admin.firestore.Timestamp;
    headlinesFetched: number;
    headlinesAlreadyProcessed: number;
    headlinesClassified: number;
    headlinesRejected: number;
    headlinesDuplicated: number;
    scenariosGenerated: number;
    scenariosSaved: number;
    bundlesSaturated: number;
    headlinesSaturationFiltered?: number;
    headlinesCeilingSkipped?: number;
    errors: string[];
    savedScenarioIds: string[];
}

export function buildGenerationScopeForHeadline(classified: ClassifiedHeadline): {
    scopeTier?: 'universal' | 'regional';
    region?: string;
    regions?: string[];
    applicable_countries?: string[];
    sourceKind: 'news';
} {
    if (classified.scope === 'regional' && classified.region) {
        const canonicalRegion = normalizeRegion(classified.region);
        return {
            scopeTier: 'regional',
            region: classified.region,
            ...(canonicalRegion ? { regions: [canonicalRegion] } : {}),
            sourceKind: 'news',
        };
    }

    if (classified.scope === 'country' && classified.applicable_countries?.length) {
        return {
            applicable_countries: classified.applicable_countries,
            sourceKind: 'news',
        };
    }

    return {
        scopeTier: 'universal',
        sourceKind: 'news',
    };
}

// ---------------------------------------------------------------------------
// News Fetching
// ---------------------------------------------------------------------------

async function fetchGlobalNews(): Promise<NewsItem[]> {
    const parser = new RssParser();

    // Fetch all feeds in parallel — individual failures are tolerated
    const feedResults = await Promise.allSettled(
        FEED_SOURCES.map(feed => parser.parseURL(feed.url).then(parsed => ({ feed, parsed })))
    );

    const allNews: NewsItem[] = [];
    for (const result of feedResults) {
        if (result.status === 'rejected') {
            logger.warn(`[NewsIngest] Feed fetch failed: ${result.reason?.message ?? result.reason}`);
            continue;
        }
        const { feed, parsed } = result.value;
        for (const item of parsed.items) {
            if (item.title && item.link) {
                allNews.push({
                    title: item.title.trim(),
                    link: item.link,
                    snippet: item.contentSnippet || item.content || '',
                    source: feed.source,
                    pubDate: item.pubDate || new Date().toISOString(),
                });
            }
        }
    }

    // Deduplicate same title across multiple feeds; sort newest first
    const seen = new Set<string>();
    const unique = allNews.filter(n => {
        const key = n.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return unique.slice(0, 60);
}

// ---------------------------------------------------------------------------
// Already-processed filter
// ---------------------------------------------------------------------------

/** Returns a set of normalised headline strings we already processed recently. */
async function getRecentlyProcessedHeadlines(db: admin.firestore.Firestore): Promise<Set<string>> {
    const cutoff = new Date(Date.now() - PROCESSED_LOOKBACK_HOURS * 60 * 60 * 1000);
    let snapshot: admin.firestore.QuerySnapshot;

    try {
        snapshot = await db
            .collection('scenarios')
            .where('metadata.source', '==', 'news')
            .where('created_at', '>=', admin.firestore.Timestamp.fromDate(cutoff))
            .select('metadata.source_news')
            .get();
    } catch (err: any) {
        const message = String(err?.message || err || '');
        if (message.includes('FAILED_PRECONDITION') || message.includes('requires an index')) {
            logger.warn('[NewsIngest] Missing composite index for recent news lookup; using fallback scan.');

            // Fallback avoids compound filter index requirements.
            // We scan a bounded recent window and filter in memory.
            snapshot = await db
                .collection('scenarios')
                .orderBy('created_at', 'desc')
                .limit(500)
                .select('created_at', 'source', 'metadata.source', 'metadata.source_news')
                .get();
        } else {
            throw err;
        }
    }

    const processed = new Set<string>();
    for (const doc of snapshot.docs) {
        const data = doc.data() as any;
        const createdAt: Date | undefined = data?.created_at?.toDate?.();
        if (createdAt && createdAt < cutoff) continue;

        const source = String(data?.metadata?.source || data?.source || '').toLowerCase();
        if (source !== 'news') continue;

        const headline: string | undefined = data?.metadata?.source_news?.headline;
        if (headline) processed.add(headline.toLowerCase());
    }

    // Also read from the ingestion log's recent headlines list
    const logSnapshot = await db
        .collection('news_ingestion_logs')
        .where('runAt', '>=', admin.firestore.Timestamp.fromDate(cutoff))
        .get();
    for (const doc of logSnapshot.docs) {
        const headlines: string[] = doc.data()?.processedHeadlines || [];
        for (const h of headlines) processed.add(h.toLowerCase());
    }

    return processed;
}

// ---------------------------------------------------------------------------
// LLM Classification
// ---------------------------------------------------------------------------

const CLASSIFICATION_SYSTEM_PROMPT = `You are the scenario design lead for "The Administration", a geo-political strategy game where players govern a country and face realistic crises. Your job is to classify real-world news headlines for their game design value.

GAME BUNDLES (each maps to in-game scenario categories):
- economy: supply chains, debt, inflation, trade, fiscal crises, currency
- politics: elections, scandals, constitutional crises, protests, coups
- military: conflicts, arms deals, nuclear threats, peacekeeping, invasions
- tech: AI regulation, cybersecurity, space, digital infrastructure, data
- environment: climate disasters, pollution, carbon policy, natural disasters
- social: inequality, education, healthcare access, strikes, demographics
- health: pandemics, epidemics, healthcare collapse, drug shortages
- diplomacy: sanctions, alliances, hostages, international agreements, trade wars
- justice: crime waves, judicial independence, corruption prosecutions, human rights
- corruption: bribery, embezzlement, government fraud, oligarchs
- culture: media censorship, national identity, cultural conflicts, free speech
- infrastructure: power grids, transport networks, water systems, telecoms
- resources: energy crises, water scarcity, rare earth minerals, food security

For SCOPE:
- global: affects or could apply to any country in the world
- regional: primarily affects a geographic region (e.g. Southeast Asia, Sub-Saharan Africa, Caribbean, European Union, Middle East, South America, Central Asia)
- country: highly specific to one or a small set of countries

For country scope provide ISO 3166-1 alpha-2 codes (e.g. "us", "gb", "cn"). List only countries where this scenario would realistically fire, max 5.

Respond ONLY with a JSON array, no markdown.`;

interface RawClassification {
    headline: string;
    bundle: string;
    scope: 'global' | 'regional' | 'country';
    region?: string;
    applicable_countries?: string[];
    relevance_score: number;
    rationale: string;
    skip: boolean;
}

async function classifyHeadlines(items: NewsItem[]): Promise<ClassifiedHeadline[]> {
    if (items.length === 0) return [];

    const headlineList = items
        .map((n, i) => `${i + 1}. "${n.title}" [${n.source}]`)
        .join('\n');

    const userPrompt = `Classify each headline for "The Administration" game. Return a JSON array of objects with:
{
  "headline": "<exact headline text>",
  "bundle": "<one of the 13 bundle names>",
  "scope": "global" | "regional" | "country",
  "region": "<region name if scope=regional, else omit>",
  "applicable_countries": ["<iso2>", ...] // only if scope=country, max 5
  "relevance_score": <0-10 integer — 10 = perfect fit, 0 = completely irrelevant>,
  "rationale": "<one sentence>",
  "skip": <true if celebrity gossip, sport, entertainment, crime not fit for diplomacy/trade/crisis themes>
}

Headlines to classify:
${headlineList}`;

    const classificationSchema = {
        type: 'object',
        properties: {
            classifications: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        headline: { type: 'string' },
                        bundle: { type: 'string' },
                        scope: { type: 'string', enum: ['global', 'regional', 'country'] },
                        region: { type: 'string' },
                        applicable_countries: { type: 'array', items: { type: 'string' } },
                        relevance_score: { type: 'number' },
                        rationale: { type: 'string' },
                        skip: { type: 'boolean' },
                    },
                    required: ['headline', 'bundle', 'scope', 'relevance_score', 'skip'],
                },
            },
        },
        required: ['classifications'],
    };

    const fullPrompt = `${CLASSIFICATION_SYSTEM_PROMPT}\n\n${userPrompt}\n\nReturn a JSON object: { "classifications": [ ...array of items... ] }`;
    const result = await callModelProvider<{ classifications: RawClassification[] }>(
        { maxTokens: 4096, temperature: 0.2 },
        fullPrompt,
        classificationSchema,
        'gpt-4o-mini'
    );

    if (!result.data) {
        logger.warn('[NewsIngest] Classification returned no data');
        return [];
    }

    const rawItems: RawClassification[] = (result.data as any).classifications || [];

    const classified: ClassifiedHeadline[] = [];
    for (const raw of rawItems) {
        if (raw.skip) continue;
        if (typeof raw.relevance_score !== 'number' || raw.relevance_score < MIN_RELEVANCE_SCORE) continue;
        if (!isValidBundleId(raw.bundle)) continue;

        const matchingItem = items.find(n => n.title === raw.headline);
        if (!matchingItem) continue;

        classified.push({
            newsItem: matchingItem,
            bundle: raw.bundle as BundleId,
            scope: raw.scope || 'global',
            region: raw.region,
            applicable_countries: raw.applicable_countries,
            relevance_score: raw.relevance_score,
            rationale: raw.rationale,
        });
    }

    return classified;
}

// ---------------------------------------------------------------------------
// Duplicate check against existing news scenarios
// ---------------------------------------------------------------------------

/**
 * Returns true if a very similar scenario (same theme) already exists.
 * Does a quick title-fingerprint check against the most recent news-sourced scenarios.
 */
async function isDuplicateOfExistingScenario(
    db: admin.firestore.Firestore,
    headline: string,
    bundle: BundleId
): Promise<boolean> {
    // Fetch recent scenarios from this bundle with news source
    const snapshot = await db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('metadata.source', '==', 'news')
        .where('is_active', '==', true)
        .orderBy('created_at', 'desc')
        .limit(40)
        .select('title', 'metadata.source_news')
        .get();

    const headlineWords = new Set(
        headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 4)
    );

    for (const doc of snapshot.docs) {
        const data = doc.data();
        // Check stored source headline
        const storedHeadline: string | undefined = data.metadata?.source_news?.headline;
        if (storedHeadline) {
            const existingWords = new Set(
                storedHeadline.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w: string) => w.length > 4)
            );
            const overlap = [...headlineWords].filter(w => existingWords.has(w)).length;
            const similarity = overlap / Math.max(headlineWords.size, existingWords.size, 1);
            if (similarity >= 0.6) return true;
        }
        // Also check scenario title similarity
        const storedTitle: string = data.title || '';
        if (storedTitle) {
            const titleWords = new Set(
                storedTitle.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w: string) => w.length > 4)
            );
            const overlap = [...headlineWords].filter(w => titleWords.has(w)).length;
            const similarity = overlap / Math.max(headlineWords.size, titleWords.size, 1);
            if (similarity >= 0.5) return true;
        }
    }

    if (isSemanticDedupEnabled()) {
        try {
            const embedding = await generateEmbedding(headline);
            if (embedding.length > 0) {
                const similar = await findSimilarByEmbedding(embedding, bundle);
                if (similar) {
                    logger.info(
                        `[NewsIngest] Semantic duplicate detected: "${headline}" ≈ ${similar.id} (similarity: ${similar.similarity.toFixed(3)})`
                    );
                    return true;
                }
            }
        } catch (err: any) {
            logger.warn(`[NewsIngest] Semantic dedup check failed (non-fatal): ${err.message}`);
        }
    }

    return false;
}

// ---------------------------------------------------------------------------
// Scheduled Function
// ---------------------------------------------------------------------------

export const dailyNewsToScenarios = onSchedule(
    {
        schedule: '0 6 * * *', // 06:00 UTC every day
        timeZone: 'UTC',
        timeoutSeconds: 540,
        memory: '1GiB',
        secrets: ['OPENAI_API_KEY'],
    },
    async () => {
        logger.info('[NewsIngest] Daily news-to-scenarios run starting');

        const db = admin.firestore();
        const log: IngestionLog = {
            runAt: admin.firestore.Timestamp.now(),
            headlinesFetched: 0,
            headlinesAlreadyProcessed: 0,
            headlinesClassified: 0,
            headlinesRejected: 0,
            headlinesDuplicated: 0,
            scenariosGenerated: 0,
            scenariosSaved: 0,
            bundlesSaturated: 0,
            errors: [],
            savedScenarioIds: [],
        };
        const processedHeadlines: string[] = [];

        try {
            // Guard: validate secrets exist
            const configValidation = validateConfig();
            if (!configValidation.valid) {
                log.errors.push('Configuration invalid: ' + configValidation.errors.join('; '));
                await writeLog(db, log, processedHeadlines);
                return;
            }

            const genConfig = await getGenerationConfig();

            // Step 1 — Fetch headlines
            const headlines = await fetchGlobalNews();
            log.headlinesFetched = headlines.length;
            logger.info(`[NewsIngest] Fetched ${headlines.length} headlines`);

            if (headlines.length === 0) {
                logger.warn('[NewsIngest] No headlines fetched — all feeds may be down');
                await writeLog(db, log, processedHeadlines);
                return;
            }

            // Step 2 — Filter already-processed headlines
            const recentlyProcessed = await getRecentlyProcessedHeadlines(db);
            const freshHeadlines = headlines.filter(n => !recentlyProcessed.has(n.title.toLowerCase()));
            log.headlinesAlreadyProcessed = headlines.length - freshHeadlines.length;
            logger.info(`[NewsIngest] ${freshHeadlines.length} fresh headlines after dedup filter`);

            if (freshHeadlines.length === 0) {
                logger.info('[NewsIngest] No new headlines to process');
                await writeLog(db, log, processedHeadlines);
                return;
            }

            // Step 3 — Classify with LLM (process in batches of 30)
            const BATCH_SIZE = 30;
            const allClassified: ClassifiedHeadline[] = [];
            for (let i = 0; i < freshHeadlines.length; i += BATCH_SIZE) {
                const batch = freshHeadlines.slice(i, i + BATCH_SIZE);
                try {
                    const classified = await classifyHeadlines(batch);
                    allClassified.push(...classified);
                } catch (err: any) {
                    log.errors.push(`Classification batch ${i / BATCH_SIZE + 1} failed: ${err.message}`);
                }
            }

            log.headlinesClassified = allClassified.length;
            log.headlinesRejected = freshHeadlines.length - allClassified.length;
            logger.info(`[NewsIngest] ${allClassified.length} headlines classified as game-relevant`);

            if (allClassified.length === 0) {
                await writeLog(db, log, processedHeadlines);
                return;
            }

            // Bundle saturation guard — skip bundles that already have enough news scenarios
            const uniqueBundles = [...new Set(allClassified.map(c => c.bundle))];
            const bundleCountResults = await Promise.all(
                uniqueBundles.map(async (bundle) => {
                    const snap = await db.collection('scenarios')
                        .where('metadata.bundle', '==', bundle)
                        .where('metadata.source', '==', 'news')
                        .where('is_active', '==', true)
                        .count()
                        .get();
                    return { bundle, existingCount: snap.data().count };
                })
            );
            const saturatedBundles = new Set(
                bundleCountResults
                    .filter(({ existingCount }) => existingCount >= MAX_NEWS_SCENARIOS_PER_BUNDLE)
                    .map(({ bundle }) => bundle)
            );
            const saturatedFiltered = allClassified.filter(c => saturatedBundles.has(c.bundle));
            log.bundlesSaturated = saturatedBundles.size;
            log.headlinesSaturationFiltered = saturatedFiltered.length;
            if (saturatedFiltered.length > 0) {
                logger.info(`[NewsIngest] ${saturatedFiltered.length} headlines skipped — saturated bundles: ${[...saturatedBundles].join(', ')}`);
            }
            const qualifiedHeadlines = allClassified.filter(c => !saturatedBundles.has(c.bundle));

            // Global ceiling check: skip bundles already at max_active_scenarios_per_bundle across all sources
            const uniqueBundlesAfterNews = [...new Set(qualifiedHeadlines.map(h => h.bundle))];
            const ceilingCountEntries = await Promise.all(
                uniqueBundlesAfterNews.map(async (bundle) => {
                    const count = await getActiveBundleCount(bundle, db);
                    return [bundle, count] as [BundleId, number];
                })
            );
            const ceilingCounts = new Map(ceilingCountEntries);
            const ceilingQualified = qualifiedHeadlines.filter(h => {
                const count = ceilingCounts.get(h.bundle) ?? 0;
                if (count >= genConfig.max_active_scenarios_per_bundle!) {
                    logger.info(`[NewsIngest] Bundle ${h.bundle} at ceiling (${count}/${genConfig.max_active_scenarios_per_bundle}), skipping headline`);
                    return false;
                }
                return true;
            });
            const headlinesCeilingSkipped = qualifiedHeadlines.length - ceilingQualified.length;
            if (headlinesCeilingSkipped > 0) log.headlinesCeilingSkipped = (log.headlinesCeilingSkipped ?? 0) + headlinesCeilingSkipped;

            // Sort by relevance score descending; take the top candidates
            ceilingQualified.sort((a, b) => b.relevance_score - a.relevance_score);
            const candidates = ceilingQualified.slice(0, MAX_SCENARIOS_PER_RUN * 2); // over-select; some will dedup

            // Step 4 — Deduplicate against existing scenarios (all checks run in parallel)
            const dedupResults = await Promise.all(
                candidates.map(async (candidate) => {
                    try {
                        const isDupe = await isDuplicateOfExistingScenario(
                            db,
                            candidate.newsItem.title,
                            candidate.bundle
                        );
                        return { candidate, isDupe, error: null };
                    } catch (err: any) {
                        return { candidate, isDupe: false, error: err.message as string };
                    }
                })
            );

            const deduped: ClassifiedHeadline[] = [];
            for (const { candidate, isDupe, error } of dedupResults) {
                if (error) {
                    log.errors.push(`Dedup check failed for "${candidate.newsItem.title}": ${error}`);
                    deduped.push(candidate); // Allow on error rather than silently drop
                } else if (isDupe) {
                    log.headlinesDuplicated++;
                    logger.info(`[NewsIngest] Duplicate skipped: "${candidate.newsItem.title}"`);
                } else {
                    deduped.push(candidate);
                }
                if (deduped.length >= MAX_SCENARIOS_PER_RUN) break;
            }

            logger.info(`[NewsIngest] ${deduped.length} candidates after deduplication`);

            // Step 5 — Generate and save scenarios
            for (const classified of deduped) {
                const { newsItem, bundle, scope } = classified;
                logger.info(
                    `[NewsIngest] Generating from: "${newsItem.title}" → bundle=${bundle}, scope=${scope}`
                );

                try {
                    const generationScope = buildGenerationScopeForHeadline(classified);
                    const genResult = await generateScenarios({
                        mode: 'news',
                        bundle,
                        count: 1,
                        newsContext: [newsItem],
                        distributionConfig: { mode: 'fixed', loopLength: 1 },
                        ...generationScope,
                    });
                    const scenarios = genResult.scenarios;

                    log.scenariosGenerated += scenarios.length;

                    for (const scenario of scenarios) {
                        // Attach source news metadata
                        if (!scenario.metadata) scenario.metadata = {};
                        scenario.metadata.source = 'news';
                        (scenario.metadata as any).source_news = {
                            headline: newsItem.title,
                            url: newsItem.link,
                            date: newsItem.pubDate,
                        };

                        const saveResult = await saveScenario(scenario);
                        if (saveResult.saved) {
                            log.scenariosSaved++;
                            log.savedScenarioIds.push(scenario.id);
                            logger.info(`[NewsIngest] Saved: ${scenario.id} — ${scenario.title}`);
                        } else {
                            logger.info(`[NewsIngest] Save rejected for ${scenario.id}: ${saveResult.reason}`);
                        }
                    }

                    // Mark headline as processed regardless of save outcome
                    processedHeadlines.push(newsItem.title);
                } catch (err: any) {
                    log.errors.push(`Generation failed for "${newsItem.title}": ${err.message}`);
                    logger.error(`[NewsIngest] Generation error for "${newsItem.title}":`, err);
                }
            }

            logger.info(
                `[NewsIngest] Run complete: ${log.scenariosSaved} scenarios saved, ${log.errors.length} errors`
            );
        } catch (err: any) {
            log.errors.push(`Fatal: ${err.message}`);
            logger.error('[NewsIngest] Fatal error:', err);
        }

        await writeLog(db, log, processedHeadlines);
    }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writeLog(
    db: admin.firestore.Firestore,
    log: IngestionLog,
    processedHeadlines: string[]
): Promise<void> {
    try {
        await db.collection('news_ingestion_logs').add({
            ...log,
            processedHeadlines,
        });
    } catch (err: any) {
        logger.error('[NewsIngest] Failed to write ingestion log:', err);
    }
}
