import { describe, expect, it } from 'vitest';
import { buildManualGenerationRequests, buildNewsGenerationRequests, countExpectedScenarios } from '@/lib/generation-request';
import type { ArticleClassification, NewsArticle } from '@/lib/types';

const distributionConfig = { mode: 'fixed' as const, loopLength: 2 as const };

describe('buildManualGenerationRequests', () => {
  it('splits regional manual generation into one job per region', () => {
    const requests = buildManualGenerationRequests({
      bundles: ['economy', 'diplomacy'],
      count: 2,
      priority: 'normal',
      distributionConfig,
      targetMode: 'regions',
      selectedRegions: ['caribbean', 'Middle East'],
      exclusivityReason: 'unique_institution',
    });

    expect(requests).toEqual([
      {
        bundles: ['economy', 'diplomacy'],
        count: 2,
        priority: 'normal',
        distributionConfig,
        mode: 'manual',
        region: 'caribbean',
        regions: ['caribbean'],
        scopeTier: 'regional',
        scopeKey: 'region:caribbean',
        sourceKind: 'evergreen',
      },
      {
        bundles: ['economy', 'diplomacy'],
        count: 2,
        priority: 'normal',
        distributionConfig,
        mode: 'manual',
        region: 'middle_east',
        regions: ['middle_east'],
        scopeTier: 'regional',
        scopeKey: 'region:middle_east',
        sourceKind: 'evergreen',
      },
    ]);
    expect(countExpectedScenarios(requests)).toBe(8);
  });

  it('maps country-targeted manual generation to exclusive scope', () => {
    const requests = buildManualGenerationRequests({
      bundles: ['justice'],
      count: 1,
      priority: 'high',
      distributionConfig,
      targetMode: 'country',
      selectedRegions: [],
      selectedCountry: 'jp',
      exclusivityReason: 'constitution',
    });

    expect(requests).toEqual([
      {
        bundles: ['justice'],
        count: 1,
        priority: 'high',
        distributionConfig,
        mode: 'manual',
        scopeTier: 'exclusive',
        scopeKey: 'country:jp',
        exclusivityReason: 'constitution',
        applicable_countries: ['jp'],
        sourceKind: 'evergreen',
      },
    ]);
  });
});

describe('buildNewsGenerationRequests', () => {
  it('groups news jobs by bundle and scope slice', () => {
    const articles: NewsArticle[] = [
      { title: 'Caribbean fuel shock', link: 'https://example.com/1', source: 'Example', pubDate: '2026-03-27T00:00:00.000Z' },
      { title: 'Caribbean sanctions', link: 'https://example.com/2', source: 'Example', pubDate: '2026-03-27T00:00:00.000Z' },
      { title: 'Japan constitutional dispute', link: 'https://example.com/3', source: 'Example', pubDate: '2026-03-27T00:00:00.000Z' },
    ];
    const classifications: ArticleClassification[] = [
      { articleIndex: 0, bundle: 'economy', scope: 'regional', region: 'Caribbean', relevance_score: 9, rationale: 'fits' },
      { articleIndex: 1, bundle: 'economy', scope: 'regional', region: 'caribbean', relevance_score: 8, rationale: 'fits' },
      { articleIndex: 2, bundle: 'politics', scope: 'country', applicable_countries: ['JP'], relevance_score: 8, rationale: 'fits' },
    ];

    const requests = buildNewsGenerationRequests({
      count: 1,
      priority: 'low',
      distributionConfig,
      selectedArticleIds: [0, 1, 2],
      articles,
      classifications,
    });

    expect(requests).toEqual([
      {
        bundles: ['economy'],
        count: 1,
        priority: 'low',
        distributionConfig,
        mode: 'news',
        newsContext: [articles[0], articles[1]],
        region: 'caribbean',
        regions: ['caribbean'],
        scopeTier: 'regional',
        scopeKey: 'region:caribbean',
        sourceKind: 'news',
      },
      {
        bundles: ['politics'],
        count: 1,
        priority: 'low',
        distributionConfig,
        mode: 'news',
        newsContext: [articles[2]],
        scopeTier: 'universal',
        scopeKey: 'universal',
        applicable_countries: ['jp'],
        sourceKind: 'news',
      },
    ]);
  });
});