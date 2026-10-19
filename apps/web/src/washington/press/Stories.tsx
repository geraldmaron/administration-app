import type { AbroadRow, RunningStory } from "@admin/player-core";
import { formatRatio } from "@admin/player-core";
import { Bar, Collection, EmptyState, Gauge, Tag, type TagTone } from "@admin/ui-web";
import type { CoverageBand } from "@admin/engine";
import { Door } from "../../shell/Door";
import { feedHref } from "./press-search";

const STAGE_TONE: Readonly<Record<RunningStory["stage"], TagTone>> = { breaking: "risk", developing: "caution", fading: "neutral", resolved: "neutral" };
const BAND_TONE: Readonly<Record<CoverageBand, TagTone>> = { hostile: "risk", cool: "caution", neutral: "neutral", warm: "good" };
const BAND_WORD: Readonly<Record<CoverageBand, string>> = { hostile: "Hostile", cool: "Skeptical", neutral: "Even-handed", warm: "Warm" };

function Story({ story, oldest }: { readonly story: RunningStory; readonly oldest: number }) {
  return (
    <li className="pr-running ui-row-target ui-valence-bar" data-valence={story.stage === "breaking" ? "bad" : story.stage === "developing" ? "watch" : "neutral"}>
      <div className="pr-running__title">
        <Door href={story.href} className="ui-row-link">
          {story.subject}
        </Door>
        <span className="pr-note">
          Kept alive by <Door href={feedHref({ outlet: story.keptAliveBy.id })}>{story.keptAliveBy.name}</Door>
        </span>
      </div>
      <Tag tone={STAGE_TONE[story.stage]}>{story.stageWord}</Tag>
      <div className="pr-running__age">
        {story.weeks === undefined ? null : <Bar label={`${story.age}, the longest-running story is ${oldest} weeks`} value={story.weeks / Math.max(1, oldest)} tone="reading" slim />}
        <span className="pr-note">{story.age}</span>
      </div>
      <Gauge shape="meter" stacked label="Heat" value={story.heat} valueText={formatRatio(story.heat)} tone="risk" />
    </li>
  );
}

/** The stories still running against the administration, hottest first, each a door to the page where it is answered. */
export function RunningStories({ stories }: { readonly stories: readonly RunningStory[] }) {
  const oldest = Math.max(1, ...stories.map((story) => story.weeks ?? 0));
  return (
    <section id="press-stories" aria-labelledby="press-stories-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-stories-title" className="pr-heading">
          Running stories
        </h2>
        <p className="pr-note">A story is answered on its own page, where the allegation, what is verified and your options sit together.</p>
      </div>
      <Collection items={stories} initial={6} noun="running stories" className="pr-running-list" empty="No story is running against the administration." render={(story) => <Story key={story.id} story={story} oldest={oldest} />} />
    </section>
  );
}

/** What the world's papers filed about the administration this week, the coolest first. */
export function Abroad({ rows }: { readonly rows: readonly AbroadRow[] }) {
  return (
    <section id="press-abroad" aria-labelledby="press-abroad-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-abroad-title" className="pr-heading">
          The press abroad
        </h2>
        <p className="pr-note">One piece a week from each foreign outlet, with the government whose capital it files from.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="emptyRecord" title="No foreign press has covered you">
          Coverage abroad appears here once a government's papers write about the administration.
        </EmptyState>
      ) : (
        <Collection
          items={rows}
          initial={6}
          noun="foreign outlets"
          className="pr-list"
          render={(row) => (
            <li key={row.outletId}>
              <Tag tone={BAND_TONE[row.band]}>{BAND_WORD[row.band]}</Tag>
              <div>
                <p className="pr-list__title">
                  {row.outlet} <Door href={row.nation.href} className="pr-chip">{row.nation.name}</Door>
                </p>
                <p className="pr-note">{row.lede}</p>
                <p className="pr-note">{row.caption}</p>
              </div>
            </li>
          )}
        />
      )}
    </section>
  );
}
