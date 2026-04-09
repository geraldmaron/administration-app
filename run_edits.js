const fs = require('fs');
let code = fs.readFileSync('web/src/app/generate/page.tsx', 'utf8');

// Edit 1
code = code.replace(
  '<div className="inline-flex rounded-[12px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1">',
  '<div className="inline-flex rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-0.5">'
).replace(
  /className={\`min-h-\[40px\] rounded-\[10px\] px-4 py-2 text-\[11px\]/g,
  'className={`min-h-[32px] rounded-md px-3 py-1.5 text-[10px]'
);

// Edit 2
code = code.replace(/  const \[newsContextEnabled, setNewsContextEnabled\] = useState\(false\);\n/g, '');

// Edit 3
code = code.replace(
  `        const newsEnrichment = newsContextEnabled && selectedArticleIds.size > 0\n          ? Array.from(selectedArticleIds).map(i => newsArticles[i]).filter(Boolean)\n          : [];\n`,
  ''
).replace(
  `        }).map((req) => newsEnrichment.length > 0\n          ? { ...req, mode: 'news' as const, newsContext: newsEnrichment }\n          : req\n        );`,
  `        });`
);

// Edit 4
const newsOnToggle = /<button type="button"\n\s*onClick=\{.*?setNewsContextEnabled[\s\S]*?\{newsContextEnabled \? 'News On' : 'News'\}\n\s*<\/button>/g;
code = code.replace(newsOnToggle, '');

// Edit 5
const inlineNews = /\{\/\* Inline news context — shown when the News toggle is on \*\/\}\n\s*\{newsContextEnabled && \([\s\S]*?<\/CommandPanel>\n\s*\)\}/g;
code = code.replace(inlineNews, '');

// Save temp file to see if edits 1-5 worked
fs.writeFileSync('web/src/app/generate/page.tsx', code);
console.log("Edits 1-5 applied");
