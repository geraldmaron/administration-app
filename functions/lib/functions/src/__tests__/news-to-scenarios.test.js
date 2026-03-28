"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const news_to_scenarios_1 = require("../news-to-scenarios");
(0, globals_1.describe)('buildGenerationScopeForHeadline', () => {
    (0, globals_1.test)('maps regional headlines to regional scope with canonical region tags', () => {
        const result = (0, news_to_scenarios_1.buildGenerationScopeForHeadline)({
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
        (0, globals_1.expect)(result).toEqual({
            scopeTier: 'regional',
            region: 'Middle East',
            regions: ['middle_east'],
            sourceKind: 'news',
        });
    });
    (0, globals_1.test)('leaves country headlines country-filtered without fabricating unsupported scope metadata', () => {
        const result = (0, news_to_scenarios_1.buildGenerationScopeForHeadline)({
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
        (0, globals_1.expect)(result).toEqual({
            applicable_countries: ['us'],
            sourceKind: 'news',
        });
    });
});
//# sourceMappingURL=news-to-scenarios.test.js.map