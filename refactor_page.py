import re

with open('web/src/app/generate/page.tsx', 'r') as f:
    content = f.read()

# 1. Define the start of the return block
return_start = content.find('  return (\n    <div className="mx-auto max-w-[1600px]">')
if return_start == -1:
    print("Cannot find return statement")
    exit(1)

# Keep everything before return
prefix = content[:return_start]

# 2. Extract sections using regex or string splitting
# Blitz UI
blitz_match = re.search(r'\{\s*generationMode === \'blitz\' \? \(\n\s*/\* ─── BLITZ MODE ─── \*/\n\s*<div className="space-y-6">(.*?)</div>\n\s*\) : generationMode === \'manual\' \? \(', content, re.DOTALL)
if not blitz_match:
    print("Cannot find blitz block")
    exit(1)
blitz_ui = blitz_match.group(1)

# Manual UI
manual_match = re.search(r'\) : generationMode === \'manual\' \? \(\n\s*<>\n(.*?)<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">(.*?)</div>\n\s*</div>\n\s*</>\n\s*\) : \(', content, re.DOTALL)
if not manual_match:
    print("Cannot find manual block")
    exit(1)
manual_main = manual_match.group(1)
manual_sidebar = manual_match.group(2)

# News UI
news_match = re.search(r'\) : \(\n\s*/\* ─── NEWS MODE ─── \*/\n\s*<>\n(.*?)<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">(.*?)</div>\n\s*</div>\n\s*</>\n\s*\)\}\n\s*</div>\n\s*\);\n\}', content, re.DOTALL)
if not news_match:
    print("Cannot find news block")
    exit(1)
news_main = news_match.group(1)
news_sidebar = news_match.group(2)

# Clean up manual_main: remove <form ...> wrapping, as we will use a single form or div for the left col.
# We also remove the manual stats block which we can move to the right rail.
manual_stats_match = re.search(r'<div className="mb-4 flex flex-wrap gap-3">(.*?)</div>\n\s*<div className="grid gap-6 xl:grid-cols-\[minmax\(0,1\.55fr\)_420px\]">\n\s*<form onSubmit=\{handleSubmit\} className="space-y-6">', manual_main, re.DOTALL)
if manual_stats_match:
    manual_stats = manual_stats_match.group(1)
    manual_form_content = manual_main[manual_stats_match.end():]
    manual_form_content = manual_form_content.rsplit('</form>', 1)[0]
else:
    manual_stats = ''
    manual_form_content = manual_main

news_stats_match = re.search(r'<div className="mb-4 flex flex-wrap gap-3">(.*?)</div>\n\s*<div className="grid gap-6 xl:grid-cols-\[minmax\(0,1\.55fr\)_420px\]">\n\s*<form onSubmit=\{handleSubmit\} className="space-y-6">', news_main, re.DOTALL)
if news_stats_match:
    news_stats = news_stats_match.group(1)
    news_form_content = news_main[news_stats_match.end():]
    news_form_content = news_form_content.rsplit('</form>', 1)[0]
else:
    news_stats = ''
    news_form_content = news_main

# Re-assemble a unified layout
# Note: we need to adapt `aiModelsPanel` and `runSettingsPanel` since they are injected throughout.
# We will put them in the right rail consistently, EXCEPT we want them completely removed from the left col content.
blitz_ui_clean = re.sub(r'\{aiModelsPanel\}', '', blitz_ui)
blitz_ui_clean = re.sub(r'<div className="grid gap-6 lg:grid-cols-\[minmax\(0,1fr\)_380px\]">', '<div className="space-y-6">', blitz_ui_clean)
manual_form_clean = re.sub(r'\{aiModelsPanel\}', '', manual_form_content)
manual_form_clean = re.sub(r'\{runSettingsPanel\}', '', manual_form_clean)
news_form_clean = re.sub(r'\{aiModelsPanel\}', '', news_form_content)
news_form_clean = re.sub(r'\{runSettingsPanel\}', '', news_form_clean)

# The right rail:
# We have `manual_sidebar` and `news_sidebar`. We'll extract their summaries and readiness panels.
# Let's write the new unified return string.
new_return = """  return (
    <div className="mx-auto max-w-[1600px]">
      <ScreenHeader
        section="Content Operations"
        title="Scenario Generation"
        subtitle="Generate scenarios manually or from live news headlines."
        eyebrow="Create"
        nav={<OperationsNav />{
        actions={
          <>
            <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
            <Link href="/scenarios" className="btn btn-tactical">Library</Link>
          </>
        {
      />

      {/* Mode toggle */{
      <div className="mb-6">
        <SegmentedControl
          value={generationMode{
          onChange={(v) => { setGenerationMode(v); setSubmitError(null); setJobId(null); {{
          options={[
            { value: 'manual', label: 'Manual' {,
            { value: 'news', label: 'From News' {,
            { value: 'blitz', label: 'Blitz' {,
          ]{
        />
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
          {generationMode === 'manual'
            ? 'Choose bundles and settings — the AI creates scenarios from scratch.'
            : generationMode === 'news'
            ? 'Pull live headlines, select articles, and let the AI generate scenarios grounded in real events.'
            : 'Set a total scenario count, then let blitz analyse inventory gaps and distribute that budget across the weakest coverage.'{
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px] items-start">
        {/* LEFT COLUMN: Main Configuration */{
        <form onSubmit={handleSubmit{ className="space-y-6 min-w-0">
          {generationMode === 'blitz' && (
            <div className="space-y-6">
              {blitz_ui_clean}
            </div>
          ){

          {generationMode === 'manual' && (
            <div className="space-y-6">
              {manual_form_clean}
            </div>
          ){

          {generationMode === 'news' && (
            <div className="space-y-6">
              {news_form_clean}
            </div>
          ){
          
          {/* The form needs to handle runSettingsPanel content without rendering it on the left if we moved it, but let's keep runSettingsPanel here if it contains description input! Wait, we moved it to the right rail? No, let's keep Prompt Guidance in the left col for manual/news */{
          {generationMode !== 'blitz' && classifications.length >= 0 && (
             <CommandPanel className="p-5 md:p-6">
               <div className="mb-4">
                 <div className="section-kicker mb-2">Instruction Overlay</div>
                 <h2 className="text-xl font-semibold text-foreground">Prompt Guidance</h2>
               </div>
               <textarea value={description{ onChange={(e) => setDescription(e.target.value){
                 placeholder="Optional: editorial focus, current event framing, excluded topics, or pacing instructions."
                 rows={3{ className="input-shell resize-y" />
             </CommandPanel>
          ){
        </form>

        {/* RIGHT COLUMN: Persistent Rail */{
        <div className="space-y-6 sticky top-6">
          
          {/* Unified Summary Panel */{
          <CommandPanel className="p-5 md:p-6">
            <div className="mb-5">
              <div className="section-kicker mb-2">Summary</div>
              <h2 className="text-xl font-semibold text-foreground">
                {generationMode === 'blitz' ? 'Blitz Plan' : generationMode === 'manual' ? 'Configuration' : 'News Plan'{
              </h2>
            </div>
            
            {generationMode === 'blitz' && (
              <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Budget</span>
                  <span className="data-value text-foreground">{blitzTotalScenarios{ scenarios</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Jobs to Create</span>
                  <span className="data-value text-foreground">{blitzSummary?.jobsToCreate ?? 0{</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Scenarios to Gen</span>
                  <span className="data-value text-[var(--success)]">{blitzSummary?.scenariosToGenerate ?? 0{</span>
                </div>
              </div>
            ){

            {generationMode === 'manual' && (
              <>
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedBundleData.length > 0
                    ? selectedBundleData.map((b) => <BundleBadge key={b.id{ bundle={b.id{ />)
                    : <span className="text-sm text-[var(--foreground-muted)]">No bundles selected.</span>{
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Scenarios', `${expectedManualCount{ total`],
                    ['Scope', targetSummary],
                    ['Format', STORY_MODE_LABELS[storyMode]],
                    ['Priority', priority],
                  ].map(([label, val], i, arr) => (
                    <div key={label as string{ className={`flex items-center justify-between gap-3 ${i < arr.length - 1 ? 'border-b border-[var(--border)] pb-3' : ''{`{>
                      <span>{label{</span>
                      <span className="data-value text-foreground capitalize">{val{</span>
                    </div>
                  )){
                </div>
              </>
            ){

            {generationMode === 'news' && (
              <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Articles loaded</span>
                  <span className="data-value text-foreground">{newsArticles.length || '—'{</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Selected</span>
                  <span className="data-value text-foreground">{selectedArticleIds.size || '—'{</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Bundles</span>
                  <span className="data-value text-foreground">
                    {newsClassifiedBundles.size > 0 ? Array.from(newsClassifiedBundles.keys()).join(', ') : '—'{
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <span>Format</span>
                  <span className="data-value text-foreground">{STORY_MODE_LABELS[storyMode]{</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Total scenarios</span>
                  <span className="data-value text-[var(--success)]">{newsScenariosExpected || '—'{</span>
                </div>
              </div>
            ){
          </CommandPanel>

          {aiModelsPanel{

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
                <button type="button" onClick={() => setStageForReview((v) => !v){
                  className={`mt-1 shrink-0 rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] transition-colors ${
                    stageForReview ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                  {`{>
                  {stageForReview ? 'On' : 'Off'{
                </button>
              </div>
            </CommandPanel>
          ){

          <CommandPanel className="p-5 md:p-6 border-t-[3px] border-t-[var(--accent-primary)]">
            <div className="flex flex-col gap-3">
              {submitError && <div className="text-xs text-[var(--error)] p-2 rounded bg-[rgba(254,71,60,0.1)]">{submitError{</div>{
              
              {generationMode === 'blitz' && (
                <button type="button" onClick={handleBlitzExecute{
                  disabled={submitting || blitzPlannedJobs.length === 0{
                  className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : `Execute Blitz`{
                </button>
              ){

              {generationMode === 'manual' && (
                <button type="button" onClick={handleSubmit{ disabled={submitting{ className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : stageForReview ? 'Staged Generation' : 'Launch Generation Job'{
                </button>
              ){

              {generationMode === 'news' && (
                <button type="button" onClick={handleSubmit{ disabled={submitting || classifications.length === 0{ className="btn btn-command w-full justify-center py-3 text-sm">
                  {submitting ? 'Submitting…' : `Launch ${newsClassifiedBundles.size{ Job${newsClassifiedBundles.size === 1 ? '' : 's'{`{
                </button>
              ){
            </div>
          </CommandPanel>

          {jobId && <JobMonitor jobId={jobId{ />{
          
        </div>
      </div>
    </div>
  );
}
"""

with open('web/src/app/generate/page.tsx.new', 'w') as f:
    f.write(prefix + new_return)

print("Done generating web/src/app/generate/page.tsx.new")

new_return = new_return.replace('{blitz_ui_clean}', blitz_ui_clean)
new_return = new_return.replace('{manual_form_clean}', manual_form_clean)
new_return = new_return.replace('{news_form_clean}', news_form_clean)
with open('web/src/app/generate/page.tsx.new', 'w') as f:
    f.write(prefix + new_return)
print("Done")
