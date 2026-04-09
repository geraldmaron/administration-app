const fs = require('fs');

const code = fs.readFileSync('web/src/app/tokens/page.tsx', 'utf8');

let newCode = code.replace(
  'const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());',
  `const [mode, setMode] = useState<'registry' | 'country'>('registry');

  // Country Tokens State
  const [countries, setCountries] = useState<{ id: string, name: string, region: string }[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [countryData, setCountryData] = useState<{ id: string, name: string, region: string, tokens: Record<string, string> } | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [editingCountryToken, setEditingCountryToken] = useState<string | null>(null);
  const [editCountryTokenValue, setEditCountryTokenValue] = useState('');

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());`
);

newCode = newCode.replace(
  'fetch(\'/api/token-registry\'),',
  `fetch('/api/token-registry'),
        fetch('/api/countries'),`
);

newCode = newCode.replace(
  'setSummary(data.summary);\n      }',
  `setSummary(data.summary);\n      }
      
      const countriesRes = arguments[0]; // wait
`
);
