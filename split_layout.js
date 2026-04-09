const fs = require('fs');
const code = fs.readFileSync('web/src/app/generate/page.tsx', 'utf8');

const prefixIdx = code.indexOf(`      {generationMode === 'blitz' ? (`);
const prefix = code.slice(0, prefixIdx);

// Blitz UI
const blitzStart = code.indexOf(`<div className="space-y-6">`, prefixIdx) + 27;
const blitzEnd = code.indexOf(`        </div>\n      ) : generationMode === 'manual' ? (`);
const blitzContent = code.slice(blitzStart, blitzEnd).trim()
  .replace('{aiModelsPanel}', '')
  .replace(/<div className="grid gap-6 lg:grid-cols-\[minmax\(0,1fr\)_380px\]">/g, '<div className="space-y-6">');

// Manual UI
const manualStart = code.indexOf(`      ) : generationMode === 'manual' ? (\n        <>\n          <div className="mb-4 flex flex-wrap gap-3">`) + 109;
const manualFormStart = code.indexOf(`<form onSubmit={handleSubmit} className="space-y-6">`, manualStart) + 54;
const manualFormEnd = code.indexOf(`            </form>`, manualFormStart);
let manualForm = code.slice(manualFormStart, manualFormEnd).trim()
  .replace('{aiModelsPanel}', '')
  .replace('{runSettingsPanel}', '');
manualForm = manualForm.replace(/<div className="flex flex-wrap items-center gap-3">[\s\S]*?<\/div>$/, '');

const manualSidebarStart = code.indexOf(`<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">`, manualFormEnd) + 62;
const manualSidebarEnd = code.indexOf(`            </div>\n          </div>\n        </>`, manualSidebarStart);
const manualSidebar = code.slice(manualSidebarStart, manualSidebarEnd).trim();

// Extract Manual Summary and Readiness
const manualSummary = manualSidebar.match(/<CommandPanel className="p-5 md:p-6">\n\s*<div className="mb-5">\n\s*<div className="section-kicker mb-2">Summary<\/div>[\s\S]*?<\/CommandPanel>/)[0];
const manualReadiness = manualSidebar.match(/<CommandPanel className="p-5 md:p-6">\n\s*<div className="mb-4">\n\s*<div className="section-kicker mb-2">Readiness<\/div>[\s\S]*?<\/CommandPanel>/)[0];

// News UI
const newsStart = code.indexOf(`      ) : (\n        /* ─── NEWS MODE ─── */\n        <>\n          <div className="mb-4 flex flex-wrap gap-3">`) + 106;
const newsFormStart = code.indexOf(`<form onSubmit={handleSubmit} className="space-y-6">`, newsStart) + 54;
const newsFormEnd = code.indexOf(`            </form>`, newsFormStart);
let newsForm = code.slice(newsFormStart, newsFormEnd).trim()
  .replace('{aiModelsPanel}', '')
  .replace('{runSettingsPanel}', '');
newsForm = newsForm.replace(/\{classifications\.length > 0 && \(\n\s*<div className="flex flex-wrap items-center gap-3">[\s\S]*?<\/div>\n\s*\)\}/, '');

const newsSidebarStart = code.indexOf(`<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">`, newsFormEnd) + 62;
const newsSidebarEnd = code.indexOf(`            </div>\n          </div>\n        </>\n      )}`, newsSidebarStart);
const newsSidebar = code.slice(newsSidebarStart, newsSidebarEnd).trim();

const newsSummary = newsSidebar.match(/<CommandPanel className="p-5 md:p-6">\n\s*<div className="mb-5">\n\s*<div className="section-kicker mb-2">Summary<\/div>[\s\S]*?<\/CommandPanel>/)[0];
const newsReadiness = newsSidebar.match(/<CommandPanel className="p-5 md:p-6">\n\s*<div className="mb-4">\n\s*<div className="section-kicker mb-2">Readiness<\/div>[\s\S]*?<\/CommandPanel>/)[0];

const newLayout = `
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px] items-start">
        {/* LEFT COLUMN: Mode-Specific Forms */}
        <div className="space-y-6 min-w-0">
          {generationMode === 'blitz' && (
            <div className="space-y-6">
              \${blitzContent}
            </div>
          )}

          {generationMode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              \${manualForm}
            </form>
          )}

          {generationMode === 'news' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              \${newsForm}
            </form>
          )}
          
          {generationMode !== 'blitz' && (
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-4">
                <div className="section-kicker mb-2">Instruction Overlay</div>
                <h2 className="text-xl font-semibold text-foreground">Prompt Guidance</h2>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: editorial focus, current event framing, excluded topics, or pacing instructions."
                rows={3} className="input-shell resize-y" />
            </CommandPanel>
          )}
        </div>

        {/* RIGHT COLUMN: Persistent Summary/CTA Rail */}
        <div className="space-y-6 sticky top-6">
          
          {generationMode === 'blitz' && (
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-5">
                <div className="section-kicker mb-2">Summary</div>
                <h2 className="text-xl font-semibold text-foreground">Blitz Plan</h2>
              </div>
              <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Budget</span>
                  <span className="data-value text-foreground">{blitzTotalScenarios} scenarios</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Jobs to Create</span>
                  <span className="data-value text-foreground">{blitzSummary?.jobsToCreate ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Scenarios to Gen</span>
                  <span className="data-value text-[var(--success)]">{blitzSummary?.scenariosToGenerate ?? 0}</span>
                </div>
              </div>
            </CommandPanel>
          )}

          {generationMode === 'manual' && (
            \${manualSummary}
          )}

          {generationMode === 'news' && (
            \${newsSummary}
          )}

          {aiModelsPanel}

          {generationMode !== 'blitz' && (
            <CommandPanel className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker mb-2">Output Behavior</div>
                  <h2 className="text-sm font-semibold text-foreground mb-1">Review Before Saving</h2>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    Hold scenarios in a staging queue for review.
                  </div>
                </div>
                <button type="button" onClick={() => setStageForReview((v) => !v)}
                  className={\`mt-1 shrink-0 rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] transition-colors \${
                    stageForReview ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                  }\`}>
                  {stageForReview ? 'On' : 'Off'}
                </button>
              </div>
            </CommandPanel>
          )}

          {generationMode === 'manual' && (
            \${manualReadiness}
          )}

          {generationMode === 'news' && (
            \${newsReadiness}
          )}

          <CommandPanel className="p-5 md:p-6 border-t-[3px] border-t-[var(--accent-primary)]">
            <div className="flex flex-col gap-3">
              {submitError && <div className="text-xs text-[var(--error)] p-3 rounded-[var(--radius-tight)] border border-[var(--error)] bg-[rgba(254,71,60,0.1)]">{submitError}</div>}
              
              {generationMode === 'blitz' && (
                <button type="button" onClick={handleBlitzExecute}
                  disabled={submitting || blitzPlannedJobs.length === 0}
                  className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : \`Execute Blitz\`}
                </button>
              )}

              {generationMode === 'manual' && (
                <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : stageForReview ? 'Staged Generation' : 'Launch Job'}
                </button>
              )}

              {generationMode === 'news' && (
                <button type="button" onClick={handleSubmit} disabled={submitting || classifications.length === 0} className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : \`Launch \${newsClassifiedBundles.size} Job\${newsClassifiedBundles.size === 1 ? '' : 's'}\`}
                </button>
              )}
            </div>
          </CommandPanel>

          {jobId && <JobMonitor jobId={jobId} />}
          
        </div>
      </div>
    </div>
  );
}
`;

// Wait, I need to do string interpolation myself instead of literal since backticks are inside the template string.
let finalCode = prefix + newLayout
  .replace('${blitzContent}', blitzContent)
  .replace('${manualForm}', manualForm)
  .replace('${newsForm}', newsForm)
  .replace('${manualSummary}', manualSummary)
  .replace('${newsSummary}', newsSummary)
  .replace('${manualReadiness}', manualReadiness)
  .replace('${newsReadiness}', newsReadiness);

fs.writeFileSync('web/src/app/generate/page.tsx', finalCode);
console.log('Layout replaced successfully.');
