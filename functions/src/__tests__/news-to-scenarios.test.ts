import { describe, expect, test } from '@jest/globals';
import { buildGenerationScopeForHeadline } from '../news-to-scenarios';

describe('buildGenerationScopeForHeadline', () => {
    test('maps regional headlines to regional scope with canonical region tags', () => {
        const result = buildGenerationScopeForHeadline({
            newsItem: {
                title: 'Shipping lanes face disruption',
                link: 'https://example.com/story',
                source: 'Example',
                pubDate: '2026-03-23T00:00:00.000Z',
            },
            bundle: 'military',
            scope: 'regional',
            region: 'Middle East',
            relevance_score: 9,
            rationale: 'Regional conflict headline',
        });

        expect(result).toEqual({
            scopeTier: 'regional',
            region: 'Middle East',
            regions: ['middle_east'],
            sourceKind: 'news',
        });
    });

    test('leaves country headlines country-filtered without fabricating unsupported scope metadata', () => {
        const result = buildGenerationScopeForHeadline({
            newsItem: {
                title: 'Domestic unrest grows',
                link: 'https://example.com/story',
                source: 'Example',
                pubDate: '2026-03-23T00:00:00.000Z',
            },
            bundle: 'economy',
            scope: 'country',
            applicable_countries: ['us'],
            relevance_score: 8,
            rationale: 'Country-specific headline',
        });

        expect(result).toEqual({
            applicable_countries: ['us'],
            sourceKind: 'news',
        });
    });
});