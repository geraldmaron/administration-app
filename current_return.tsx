            { value: 'manual', label: 'Manual' },
            { value: 'news', label: 'From News' },
            { value: 'blitz', label: 'Blitz' },
          ]}
        />
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
          {generationMode === 'manual'
            ? 'Choose bundles and settings — the AI creates scenarios from scratch.'
            : generationMode === 'news'
            ? 'Pull live headlines, select articles, and let the AI generate scenarios grounded in real events.'
            : 'Set a total scenario count, then let blitz analyse inventory gaps and distribute that budget across the weakest coverage.'}
        </p>
      </div>

      {generationMode === 'blitz' ? (
        /* ─── BLITZ MODE ─── */
        <div className="space-y-6">

          {/* Settings row */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-5">
                <div className="section-kicker mb-2">Configuration</div>
                <h2 className="text-xl font-semibold text-foreground">Blitz Settings</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="section-kicker mb-1.5">Scenario budget</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number" min={1} max={200} value={blitzCountRaw} placeholder="24"
                      onChange={(e) => setBlitzCountRaw(e.target.value)}
                      className="input-shell w-24 text-center"
                    />
                    {blitzCountValid ? (
                      <span className="text-xs text-[var(--foreground-muted)]">
                        ~{Math.round(blitzTotalScenarios * 0.4)} global · {Math.round(blitzTotalScenarios * 0.25)} regional · {Math.round(blitzTotalScenarios * 0.25)} cluster · {Math.round(blitzTotalScenarios * 0.1)} country
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--error)]">1–200</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="section-kicker mb-1.5">
                    Guidance <span className="normal-case font-normal tracking-normal text-[var(--foreground-subtle)]">optional</span>
                  </div>
                  <textarea
                    value={blitzGuidance} onChange={(e) => setBlitzGuidance(e.target.value)}
                    placeholder="e.g. Focus on economic instability. Avoid military conflict. Emphasise diplomatic options."
                    rows={3} className="input-shell resize-y"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => fetchBlitzPreview(blitzTotalScenarios)}
                    disabled={blitzLoading || !blitzCountValid}
                    className="btn btn-tactical">
                    {blitzLoading ? 'Analysing…' : blitzAllocation ? 'Refresh Plan' : 'Analyse Gaps'}
                  </button>
                  {blitzAllocation && !blitzLoading && (
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {blitzDeficits.length} gap{blitzDeficits.length !== 1 ? 's' : ''} found
                    </span>
                  )}
                </div>
              </div>
            </CommandPanel>
            {aiModelsPanel}
          </div>

          {/* Coverage breakdown */}
          {blitzAllocation && (
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-4">
                <div className="section-kicker mb-2">Inventory</div>
                <h2 className="text-xl font-semibold text-foreground">Coverage by Scope</h2>
              </div>
              <div className="space-y-2.5">
                {([
                  { tier: 'universal' as const, label: 'Global', desc: 'Applies to all countries' },
                  { tier: 'regional' as const, label: 'Regional', desc: 'Scoped to world regions' },
                  { tier: 'cluster' as const, label: 'Cluster', desc: 'Scoped to country clusters' },
                  { tier: 'exclusive' as const, label: 'Country', desc: 'Country-exclusive scenarios' },
                ]).map(({ tier, label, desc }) => {
                  const tierDeficits = blitzDeficits.filter((d) => d.scopeTier === tier);
                  const totalGap = tierDeficits.reduce((s, d) => s + d.deficit, 0);
                  const allocated = blitzAllocation[tier];
                  const ratio = Math.round(SCOPE_TIER_RATIOS[tier] * 100);
                  const fillPct = totalGap > 0 ? Math.min(100, Math.round((allocated / totalGap) * 100)) : 100;
                  const isCovered = totalGap === 0;
                  const jobCount = blitzPlannedJobs.filter((j) => j.scopeTier === tier).length;
                  return (
                    <div key={tier} className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{ratio}%</span>
                          <span className="hidden sm:inline text-xs text-[var(--foreground-muted)]">{desc}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {isCovered ? (
                            <span className="text-[var(--success)]">Covered</span>
                          ) : (
                            <span className="text-[var(--warning)]">{totalGap} needed</span>
                          )}
                          <span className="text-[var(--foreground-muted)]">{allocated} allocated</span>
                          {jobCount > 0 && (
                            <span className="text-[var(--foreground-subtle)]">{jobCount} job{jobCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--background-muted)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{
                          width: `${fillPct}%`,
                          background: isCovered ? 'var(--success)' : fillPct >= 50 ? 'var(--warning)' : 'var(--error)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CommandPanel>
          )}

          {/* Execution plan */}
          {blitzAllocation && blitzPlannedJobs.length > 0 && (
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker mb-2">Execution Plan</div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {blitzPlannedJobs.length} Job{blitzPlannedJobs.length !== 1 ? 's' : ''} &mdash; {blitzSummary?.scenariosToGenerate ?? 0} Scenarios
                  </h2>
                </div>
              </div>
              <div className="space-y-5">
                {(['universal', 'regional', 'cluster', 'exclusive'] as const)
                  .map((tier) => {
                    const jobs = blitzPlannedJobs.filter((j) => j.scopeTier === tier);
                    if (jobs.length === 0) return null;
                    const tierScenarios = jobs.reduce((s, j) => s + j.bundles.length * j.count, 0);
                    const pct = Math.round(SCOPE_TIER_RATIOS[tier] * 100);
                    const tierLabels: Record<string, string> = { universal: 'Global', regional: 'Regional', cluster: 'Cluster', exclusive: 'Country' };
                    return (
                      <div key={tier}>
                        <div className="mb-2 flex items-center gap-2 border-b border-[var(--border)] pb-1.5">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-foreground">{tierLabels[tier]}</span>
                          <span className="text-[10px] text-[var(--foreground-subtle)]">{pct}% ratio</span>
                          <span className="ml-auto text-[10px] text-[var(--foreground-muted)]">
                            {tierScenarios} scenario{tierScenarios !== 1 ? 's' : ''} · {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {jobs.map((job, i) => {
                            const output = job.bundles.length * job.count;
                            return (
                              <div key={i} className="flex items-center gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                                {tier !== 'universal' && (
                                  <span className="w-24 shrink-0 text-xs font-medium text-foreground truncate">{formatScopeLabel(job.scopeKey)}</span>
                                )}
                                <div className="flex flex-1 flex-wrap gap-1.5">
                                  {job.bundles.map((b) => <BundleBadge key={b} bundle={b} />)}
                                </div>
                                <span className="shrink-0 text-[11px] font-mono text-[var(--foreground-subtle)]">&times;{job.count}</span>
                                <span className="shrink-0 min-w-[44px] text-right text-[11px] font-mono text-[var(--foreground-muted)]">{output} out</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-4">
                <button type="button" onClick={handleBlitzExecute}
                  disabled={submitting || blitzPlannedJobs.length === 0}
                  className="btn btn-command">
                  {submitting ? 'Submitting…' : `Execute Blitz — ${blitzSummary?.scenariosToGenerate ?? 0} scenarios`}
                </button>
                {blitzJobIds.length > 0 && (
                  <Link href={`/jobs/${blitzJobIds[0]}`} className="btn btn-tactical">
                    View Job{blitzJobIds.length > 1 ? 's' : ''}
                  </Link>
                )}
                {submitError && <span className="text-xs text-[var(--error)]">{submitError}</span>}
              </div>
            </CommandPanel>
          )}

          {blitzAllocation && blitzPlannedJobs.length === 0 && blitzDeficits.length === 0 && (
            <CommandPanel className="p-5 md:p-6">
              <div className="text-sm text-[var(--success)]">Inventory is well-stocked — no significant gaps found for this budget.</div>
            </CommandPanel>
          )}

          {blitzJobIds.length > 0 && (
            <div className="space-y-4">
              <div className="section-kicker">Active Blitz Jobs</div>
              {blitzJobIds.map((id) => <JobMonitor key={id} jobId={id} />)}
            </div>
          )}
        </div>
      ) : generationMode === 'manual' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <DataStat size="compact" label="Bundles" value={selectedBundles.size} accent="blue" />
            <DataStat size="compact" label="Scenarios" value={expectedManualCount || 0} accent="gold" />
            <DataStat size="compact" label="Scope" value={targetSummary} />
            <DataStat size="compact" label="Format" value={STORY_MODE_LABELS[storyMode]} />
            <DataStat size="compact" label="Provider" value="Cloud" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
            <form onSubmit={handleSubmit} className="space-y-6">

              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Bundles</div>
                    <h2 className="text-xl font-semibold text-foreground">Content Lanes</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => {
                        if (selectedBundles.size === ALL_BUNDLES.length) {
                          setSelectedBundles(new Set());
                        } else {
                          setSelectedBundles(new Set(ALL_BUNDLES.map(b => b.id)));
                        }
                      }}
                      className="text-[10px] font-mono uppercase tracking-[0.14em] rounded px-2.5 py-1.5 border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground transition-colors">
                      {selectedBundles.size === ALL_BUNDLES.length ? 'Clear All' : 'Select All'}
                    </button>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'Pick one or more'}
                    </span>
                  </div>
                </div>
                {/* Sortable bundle table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="w-5 pb-2.5 pl-1" />
                        <th className="pb-2.5 pr-4 text-left">
                          <button type="button" onClick={() => handleSortColumn('name')}
                            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-2 text-right">
                          <button type="button" onClick={() => handleSortColumn('active')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Active <span>{sortColumn === 'active' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">News</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBundles.map((bundle) => {
                        const isActive = selectedBundles.has(bundle.id);
                        const counts = bundleCounts[bundle.id];
                        const nCount = newsCountByBundle[bundle.id] ?? 0;
                        return (
                          <tr key={bundle.id}
                            onClick={() => toggleBundle(bundle.id)}
                            style={{ boxShadow: isActive ? `inset 3px 0 0 ${BUNDLE_ACCENT_COLORS[bundle.id]}` : undefined }}
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[rgba(25,105,220,0.06)]' : ''}`}>
                            <td className="w-5 py-3.5 pl-1">
                              <span className={`block h-2 w-2 rounded-full ${isActive ? 'bg-[var(--accent-secondary)]' : 'border border-[var(--border-strong)]'}`} />
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="font-semibold text-foreground leading-5">{bundle.label}</div>
                              <div className="mt-0.5 text-[11px] leading-4 text-[var(--foreground-muted)]">{bundle.description}</div>
                            </td>
                            <td className="py-3.5 pr-6 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.total : '—'}
                            </td>
                            <td className="py-3.5 pr-2 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.active : '—'}
                            </td>
                            {Object.keys(newsCountByBundle).length > 0 && (
                              <td className="py-3.5 pr-1 text-right">
                                {nCount > 0
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[rgba(25,105,220,0.18)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
                                  : <span className="text-[11px] text-[var(--foreground-subtle)]">—</span>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CommandPanel>

              <div className="grid gap-6 lg:grid-cols-2">
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Volume</div>
                    <h2 className="text-xl font-semibold text-foreground">Output Size</h2>
                  </div>
                  <label className="section-kicker mb-1 block">Scenarios Per Bundle</label>
                  <input type="number" min={1} max={50} value={count}
                    onChange={(e) => setCount(Number(e.target.value))} className="input-shell" />
                  {selectedBundles.size > 1 && (
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                      {selectedBundles.size} bundles × {count} = {expectedManualCount} total
                    </p>
                  )}
                </CommandPanel>

                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Targeting</div>
                    <h2 className="text-xl font-semibold text-foreground">Geographic Scope</h2>
                  </div>
                  <div className="mb-4">
                    <SegmentedControl value={targetMode} onChange={setTargetMode}
                      options={[{ value: 'all', label: 'Global' }, { value: 'regions', label: 'Regions' }, { value: 'country', label: 'Country' }]} />
                  </div>
                  {targetMode === 'all' && <p className="text-xs text-[var(--foreground-muted)]">Scenarios draw from the global country pool, weighted by region diversity.</p>}
                  {targetMode === 'regions' && (
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_REGIONS.map((region) => {
                        const active = selectedRegions.has(region.id);
                        return (
                          <button key={region.id} type="button" onClick={() => toggleRegion(region.id)}
                            className={`rounded-[var(--radius-tight)] border px-4 py-3 text-left text-sm transition-colors ${
                              active ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.1)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                            }`}>
                            {region.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {targetMode === 'country' && (
                    <div className="space-y-4">
                      <div>
                        <label className="section-kicker mb-2 block">Country</label>
                        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="input-shell">
                          <option value="">Select a country</option>
                          {countries.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.region}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="section-kicker mb-2 block">Exclusivity Reason</label>
                        <select value={exclusivityReason} onChange={(e) => setExclusivityReason(e.target.value as ScenarioExclusivityReason)} className="input-shell">
                          {EXCLUSIVITY_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                          {EXCLUSIVITY_REASON_OPTIONS.find((option) => option.value === exclusivityReason)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </CommandPanel>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Story Format</div>
                    <h2 className="text-xl font-semibold text-foreground">Scenario Structure</h2>
                  </div>
                  <div className="space-y-3">
                    {(['standalone', 'two-part', 'three-part'] as StoryMode[]).map((mode) => (
                      <button key={mode} type="button" onClick={() => setStoryMode(mode)}
                        className={`w-full rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                          storyMode === mode ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                        }`}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground">{STORY_MODE_LABELS[mode]}</span>
                          {mode === 'standalone' && <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Default</span>}
                        </div>
                        <p className="text-xs leading-5 text-[var(--foreground-muted)]">{STORY_MODE_DESCRIPTIONS[mode]}</p>
                      </button>
                    ))}
                  </div>
                </CommandPanel>

                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Queue Priority</div>
                    <h2 className="text-xl font-semibold text-foreground">Processing Order</h2>
                  </div>
                  <SegmentedControl value={priority} onChange={setPriority}
                    options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} />
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">{PRIORITY_DESCRIPTIONS[priority]}</p>
                </CommandPanel>
              </div>

              {aiModelsPanel}
              {runSettingsPanel}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-command" disabled={submitting}>
                  {submitting ? 'Submitting…' : stageForReview ? 'Launch with Review Queue' : 'Launch Generation Job'}
                </button>
                <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
              </div>
            </form>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Summary</div>
                  <h2 className="text-xl font-semibold text-foreground">Current Configuration</h2>
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedBundleData.length > 0
                    ? selectedBundleData.map((b) => <BundleBadge key={b.id} bundle={b.id} />)
                    : <span className="text-sm text-[var(--foreground-muted)]">No bundles selected.</span>}
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Scenarios', `${expectedManualCount} total`],
                    ['Scope', targetSummary],
                    ['Format', STORY_MODE_LABELS[storyMode]],
                    ['Priority', priority],
                    ['Provider', 'Cloud'],
                    ['Review gate', stageForReview ? 'Staged' : 'Auto-save'],
                  ].map(([label, val], i, arr) => (
                    <div key={label} className={`flex items-center justify-between gap-3 ${i < arr.length - 1 ? 'border-b border-[var(--border)] pb-3' : ''}`}>
                      <span>{label}</span>
                      <span className="data-value text-foreground capitalize">{val}</span>
                    </div>
                  ))}
                </div>
                {description && (
                  <div className="mt-5 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-xs leading-6 text-[var(--foreground-muted)]">
                    {description}
                  </div>
                )}
              </CommandPanel>

              {jobId && <JobMonitor jobId={jobId} />}

              <CommandPanel className="p-5 md:p-6">
                <div className="mb-4">
                  <div className="section-kicker mb-2">Readiness</div>
                  <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Bundles', selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'none', selectedBundles.size > 0],
                    ['Scope', scopeReady ? 'ready' : 'incomplete', scopeReady],
                    ['Provider', 'cloud', true],
                    ['Models', 'cloud defaults', true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
            </div>
          </div>
        </>
      ) : (
        /* ─── NEWS MODE ─── */
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <DataStat size="compact" label="Articles Available" value={newsArticles.length || '—'} accent="blue" />
            <DataStat size="compact" label="Selected" value={selectedArticleIds.size || '—'} accent="gold" />
            <DataStat size="compact" label="Bundles Identified" value={newsClassifiedBundles.size || '—'} />
            <DataStat size="compact" label="Scenarios to Generate" value={newsScenariosExpected || '—'} />
            <DataStat size="compact" label="Provider" value="Cloud" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Bundle filter — selecting bundles filters article list post-classification */}
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Bundles</div>
                    <h2 className="text-xl font-semibold text-foreground">Filter by Content Lane</h2>
                  </div>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'All bundles'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="w-5 pb-2.5 pl-1" />
                        <th className="pb-2.5 pr-4 text-left">
                          <button type="button" onClick={() => handleSortColumn('name')}
                            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Articles</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBundles.map((bundle) => {
                        const isActive = selectedBundles.has(bundle.id);
                        const counts = bundleCounts[bundle.id];
                        const nCount = newsCountByBundle[bundle.id] ?? 0;
                        return (
                          <tr key={bundle.id}
                            onClick={() => toggleBundle(bundle.id)}
                            style={{ boxShadow: isActive ? `inset 3px 0 0 ${BUNDLE_ACCENT_COLORS[bundle.id]}` : undefined }}
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[rgba(25,105,220,0.06)]' : ''}`}>
                            <td className="w-5 py-3 pl-1">
                              <span className={`block h-2 w-2 rounded-full ${isActive ? 'bg-[var(--accent-secondary)]' : 'border border-[var(--border-strong)]'}`} />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-foreground leading-5">{bundle.label}</div>
                            </td>
                            <td className="py-3 pr-6 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.total : '—'}
                            </td>
                            {Object.keys(newsCountByBundle).length > 0 && (
                              <td className="py-3 pr-1 text-right">
                                {nCount > 0
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[rgba(25,105,220,0.18)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
                                  : <span className="text-[11px] text-[var(--foreground-subtle)]">—</span>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {classifications.length > 0 && selectedBundles.size > 0 && (
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                    Showing articles classified to {selectedBundles.size} selected bundle{selectedBundles.size === 1 ? '' : 's'}. Deselect all to see all articles.
                  </p>
                )}
              </CommandPanel>

              {/* Step 1 — Fetch Headlines */}
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Step 1 — Source</div>
                  <h2 className="text-xl font-semibold text-foreground">Fetch Headlines</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="section-kicker mb-1 block">Number of headlines</label>
                    <select value={newsLoadCount} onChange={(e) => setNewsLoadCount(Number(e.target.value))} className="input-shell w-auto">
                      {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} headlines</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={fetchNews} disabled={newsLoading}
                    className="btn btn-tactical self-end">
                    {newsLoading ? 'Fetching…' : newsArticles.length > 0 ? 'Refresh Headlines' : 'Load Headlines'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                  Pulls from BBC World, Al Jazeera, NPR World, Deutsche Welle, and Reuters — sorted by recency.
                </p>
                {newsError && <div className="mt-3 text-xs text-[var(--error)]">{newsError}</div>}
              </CommandPanel>

              {/* Step 2 — Select Articles */}
              {newsArticles.length > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="section-kicker mb-2">Step 2 — Selection</div>
                      <h2 className="text-xl font-semibold text-foreground">Choose Articles</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--foreground-muted)]">{selectedArticleIds.size} selected</span>
                      <button type="button" className="btn btn-ghost"
                        onClick={() => setSelectedArticleIds(selectedArticleIds.size === newsArticles.length ? new Set() : new Set(newsArticles.map((_, i) => i)))}>
                        {selectedArticleIds.size === newsArticles.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {newsArticles.map((article, idx) => {
                      if (visibleArticleIndices !== null && !visibleArticleIndices.has(idx)) return null;
                      const selected = selectedArticleIds.has(idx);
                      const classification = classifications.find((c) => c.articleIndex === idx);
                      const bundle = effectiveBundle(idx);
                      return (
                        <button key={idx} type="button" onClick={() => toggleArticle(idx)}
                          className={`w-full rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                            selected ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.08)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                          }`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border)]'} flex items-center justify-center`}>
                              {selected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{article.source}</span>
                                {article.pubDate && <span className="text-[10px] text-[var(--foreground-subtle)]">{formatPubDate(article.pubDate)}</span>}
                                {classification && bundle && (
                                  <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em]"
                                    style={{ background: `${BUNDLE_ACCENT_COLORS[bundle]}22`, color: BUNDLE_ACCENT_COLORS[bundle] }}>
                                    {bundle}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-medium text-foreground leading-5">{article.title}</div>
                              {article.snippet && (
                                <div className="mt-1 text-xs leading-5 text-[var(--foreground-muted)] line-clamp-2">{article.snippet}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CommandPanel>
              )}

              {/* Step 3 — Classify */}
              {selectedArticleIds.size > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Step 3 — AI Analysis</div>
                    <h2 className="text-xl font-semibold text-foreground">Recommend Bundles</h2>
                  </div>
                  <p className="mb-4 text-sm text-[var(--foreground-muted)]">
                    The AI reads each selected article and recommends the most fitting game bundle and geographic scope. You can override any recommendation before submitting.
                  </p>
                  <button type="button" onClick={classifySelected} disabled={classifying}
                    className="btn btn-tactical">
                    {classifying ? 'Analysing…' : classifications.length > 0 ? 'Re-analyse Selection' : `Analyse ${selectedArticleIds.size} Article${selectedArticleIds.size === 1 ? '' : 's'}`}
                  </button>
                  {classifyError && <div className="mt-3 text-xs text-[var(--error)]">{classifyError}</div>}
                </CommandPanel>
              )}

              {/* Step 4 — Review Recommendations */}
              {classifications.length > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Step 4 — Review</div>
                    <h2 className="text-xl font-semibold text-foreground">Bundle Recommendations</h2>
                  </div>
                  <div className="space-y-3">
                    {classifications
                      .filter((c) => selectedArticleIds.has(c.articleIndex))
                      .map((c) => {
                        const article = newsArticles[c.articleIndex];
                        const bundle = effectiveBundle(c.articleIndex);
                        return (
                          <div key={c.articleIndex} className="rounded-[var(--radius-tight)] border border-[var(--border)] p-4">
                            <div className="mb-2 text-sm font-medium text-foreground leading-5 line-clamp-2">{article?.title}</div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="section-kicker">Bundle</label>
                                <select
                                  value={bundle}
                                  onChange={(e) => setBundleOverrides((prev) => ({ ...prev, [c.articleIndex]: e.target.value }))}
                                  className="input-shell py-1 text-xs"
                                  style={{ borderColor: BUNDLE_ACCENT_COLORS[bundle] ?? undefined }}>
                                  {ALL_BUNDLES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                                <span className="font-mono">{c.scope}</span>
                                {c.region && <span>· {c.region}</span>}
                                <span className="ml-2 tabular-nums" title="Relevance score">
                                  <span className={c.relevance_score >= 8 ? 'text-[var(--success)]' : c.relevance_score >= 6 ? 'text-[var(--warning)]' : 'text-[var(--foreground-subtle)]'}>
                                    {c.relevance_score}/10
                                  </span>
                                </span>
                              </div>
                            </div>
                            {c.rationale && (
                              <p className="mt-2 text-xs leading-5 text-[var(--foreground-subtle)] italic">{c.rationale}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {newsClassifiedBundles.size > 0 && (
                    <div className="mt-4 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <div className="section-kicker mb-2">Job Plan</div>
                      <div className="space-y-1 text-xs text-[var(--foreground-muted)]">
                        {Array.from(newsClassifiedBundles.entries()).map(([bundle, count]) => (
                          <div key={bundle} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: BUNDLE_ACCENT_COLORS[bundle] }} />
                              {bundle}
                            </span>
                            <span>{count} article{count === 1 ? '' : 's'} → {newsCount} scenario{newsCount === 1 ? '' : 's'}</span>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-[var(--border)] font-medium text-foreground">
                          {newsClassifiedBundles.size} job{newsClassifiedBundles.size === 1 ? '' : 's'} · {newsScenariosExpected} scenario{newsScenariosExpected === 1 ? '' : 's'} total
                        </div>
                      </div>
                    </div>
                  )}
                </CommandPanel>
              )}

              {/* Step 5 — Volume + Format + Priority */}
              {classifications.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Volume</div>
                      <h2 className="text-lg font-semibold text-foreground">Per Bundle</h2>
                    </div>
                    <label className="section-kicker mb-1 block">Scenarios per bundle</label>
                    <input type="number" min={1} max={10} value={newsCount}
                      onChange={(e) => setNewsCount(Number(e.target.value))} className="input-shell" />
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">1–10 per bundle. Each job is seeded by that bundle's articles.</p>
                  </CommandPanel>

                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Story Format</div>
                      <h2 className="text-lg font-semibold text-foreground">Structure</h2>
                    </div>
                    <div className="space-y-2">
                      {(['standalone', 'two-part', 'three-part'] as StoryMode[]).map((mode) => (
                        <button key={mode} type="button" onClick={() => setStoryMode(mode)}
                          className={`w-full rounded-[var(--radius-tight)] border px-3 py-2 text-left text-xs transition-colors ${
                            storyMode === mode ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-foreground'
                          }`}>
                          <span className="font-medium">{STORY_MODE_LABELS[mode]}</span>
                        </button>
                      ))}
                    </div>
                  </CommandPanel>

                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Priority</div>
                      <h2 className="text-lg font-semibold text-foreground">Queue</h2>
                    </div>
                    <SegmentedControl value={priority} onChange={setPriority}
                      options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Norm' }, { value: 'high', label: 'High' }]} />
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">{PRIORITY_DESCRIPTIONS[priority]}</p>
                  </CommandPanel>
                </div>
              )}

              {/* Step 6 — AI Models */}
              {classifications.length > 0 && aiModelsPanel}

              {/* Step 7 — Run settings */}
              {classifications.length > 0 && runSettingsPanel}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}

              {classifications.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" className="btn btn-command" disabled={submitting}>
                    {submitting
                      ? 'Submitting…'
                      : stageForReview
                        ? `Launch ${newsClassifiedBundles.size} Job${newsClassifiedBundles.size === 1 ? '' : 's'} with Review Queue`
                        : `Launch ${newsClassifiedBundles.size} Job${newsClassifiedBundles.size === 1 ? '' : 's'}`}
                  </button>
                  <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
                </div>
              )}
            </form>

            {/* Sidebar */}
            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Summary</div>
                  <h2 className="text-xl font-semibold text-foreground">News Generation Plan</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Articles loaded</span>
                    <span className="data-value text-foreground">{newsArticles.length || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Selected</span>
                    <span className="data-value text-foreground">{selectedArticleIds.size || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Bundles</span>
                    <span className="data-value text-foreground">
                      {newsClassifiedBundles.size > 0
                        ? Array.from(newsClassifiedBundles.keys()).join(', ')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Format</span>
                    <span className="data-value text-foreground">{STORY_MODE_LABELS[storyMode]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Provider</span>
                    <span className="data-value text-foreground">Cloud</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Total scenarios</span>
                    <span className="data-value text-foreground">{newsScenariosExpected || '—'}</span>
                  </div>
                </div>
              </CommandPanel>

              {jobId && <JobMonitor jobId={jobId} />}

              <CommandPanel className="p-5 md:p-6">
                <div className="mb-4">
                  <div className="section-kicker mb-2">Readiness</div>
                  <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Headlines', newsArticles.length > 0 ? `${newsArticles.length} loaded` : 'not loaded', newsArticles.length > 0],
                    ['Selection', selectedArticleIds.size > 0 ? `${selectedArticleIds.size} articles` : 'none', selectedArticleIds.size > 0],
                    ['Analysis', classifications.length > 0 ? `${classifications.length} classified` : 'not run', classifications.length > 0],
                    ['Provider', 'cloud', true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
