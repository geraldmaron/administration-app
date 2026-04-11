import {
  requiresDefiniteArticle,
  formatCountryWithArticle,
  COUNTRIES_REQUIRING_ARTICLE,
} from '../lib/country-determiner';

describe('requiresDefiniteArticle', () => {
  const requiresArticle = [
    'United States',
    'United Kingdom',
    'Netherlands',
    'Philippines',
    'Czech Republic',
    'Bahamas',
    'Maldives',
    'Democratic Republic of the Congo',
    'United Arab Emirates',
    'Dominican Republic',
    'Central African Republic',
    'Gambia',
    'Seychelles',
    'Comoros',
    'Solomon Islands',
    'Marshall Islands',
    'Federated States of Micronesia',
  ];

  const noArticle = [
    'France',
    'Germany',
    'Japan',
    'Brazil',
    'Canada',
    'Ukraine',
    'Russia',
    'Australia',
    'Mexico',
    'India',
    'China',
    'Italy',
    'Spain',
  ];

  test.each(requiresArticle)('"%s" requires "the"', (name) => {
    expect(requiresDefiniteArticle(name)).toBe(true);
  });

  test.each(noArticle)('"%s" does not require "the"', (name) => {
    expect(requiresDefiniteArticle(name)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(requiresDefiniteArticle('UNITED STATES')).toBe(true);
    expect(requiresDefiniteArticle('netherlands')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(requiresDefiniteArticle('  Bahamas  ')).toBe(true);
  });
});

describe('formatCountryWithArticle', () => {
  it('returns "The Netherlands" at sentence start', () => {
    expect(formatCountryWithArticle('Netherlands', true)).toBe('The Netherlands');
  });

  it('returns "the Netherlands" mid-sentence', () => {
    expect(formatCountryWithArticle('Netherlands', false)).toBe('the Netherlands');
  });

  it('returns bare name for countries that do not need article', () => {
    expect(formatCountryWithArticle('France', true)).toBe('France');
    expect(formatCountryWithArticle('Germany', false)).toBe('Germany');
  });

  it('returns "The United States" at sentence start', () => {
    expect(formatCountryWithArticle('United States', true)).toBe('The United States');
  });

  it('returns "the Bahamas" mid-sentence', () => {
    expect(formatCountryWithArticle('Bahamas', false)).toBe('the Bahamas');
  });
});

describe('COUNTRIES_REQUIRING_ARTICLE — simulation test (Phase 4)', () => {
  const testMatrix: Array<{ name: string; expectArticle: boolean; description: string }> = [
    { name: 'United States', expectArticle: true, description: 'compound official name' },
    { name: 'France', expectArticle: false, description: 'simple sovereign name' },
    { name: 'Netherlands', expectArticle: true, description: 'plural name' },
    { name: 'Philippines', expectArticle: true, description: 'plural archipelago' },
    { name: 'Germany', expectArticle: false, description: 'simple sovereign name' },
    { name: 'Czech Republic', expectArticle: true, description: 'contains "Republic"' },
    { name: 'Brazil', expectArticle: false, description: 'simple sovereign name' },
    { name: 'Bahamas', expectArticle: true, description: 'island archipelago' },
    { name: 'Japan', expectArticle: false, description: 'simple sovereign name' },
    { name: 'United Kingdom', expectArticle: true, description: 'compound official name' },
    { name: 'Canada', expectArticle: false, description: 'simple sovereign name' },
    { name: 'Democratic Republic of the Congo', expectArticle: true, description: 'compound official name with "Republic"' },
    { name: 'United Arab Emirates', expectArticle: true, description: 'compound official name with "Emirates"' },
  ];

  test.each(testMatrix)('$name ($description)', ({ name, expectArticle }) => {
    expect(requiresDefiniteArticle(name)).toBe(expectArticle);
  });

  it('produces correctly-cased output for each', () => {
    for (const { name, expectArticle } of testMatrix) {
      const midSentence = formatCountryWithArticle(name, false);
      const initial = formatCountryWithArticle(name, true);

      if (expectArticle) {
        expect(midSentence).toBe(`the ${name}`);
        expect(initial).toBe(`The ${name}`);
      } else {
        expect(midSentence).toBe(name);
        expect(initial).toBe(name);
      }
    }
  });
});
