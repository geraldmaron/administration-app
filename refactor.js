const fs = require('fs');
let code = fs.readFileSync('web/src/app/generate/page.tsx', 'utf8');

// 1. Remove the conditional rendering wrappers around each mode and build a single unified grid.
// We'll replace the top-level conditionals with a single grid.
code = code.replace(/\{generationMode === 'blitz' \? \(\n\s*\/\* ─── BLITZ MODE ─── \*\/\n\s*<div className="space-y-6">/g, 
`<div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px] items-start">
  {/* LEFT COLUMN: Main Form */}
  <div className="space-y-6 min-w-0">
    {generationMode === 'blitz' && (
      <div className="space-y-6">`);

code = code.replace(/\n\s*\) : generationMode === 'manual' \? \(\n\s*<>\n\s*<div className="mb-4 flex flex-wrap gap-3">[\s\S]*?<\/div>\n\s*<div className="grid gap-6 xl:grid-cols-\[minmax\(0,1\.55fr\)_420px\]">\n\s*<form onSubmit=\{handleSubmit\} className="space-y-6">/g, 
`      </div>
    )}
    {generationMode === 'manual' && (
      <div className="space-y-6">`);

code = code.replace(/\n\s*<\/form>\n\s*<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/(\>|form)>/g, function(match) {
  // We want to drop the right rail of manual mode, we will build a unified one.
  return `      </div>\n    )}`;
});

// Wait, the regex might be too complex and brittle.
