import { CAMPAIGN_OPENING_DATE, COHORT_MOTIVATION, FIRST_HUNDRED_DAYS_MAX, PLATFORM_MAX_PLANKS, plankFitsFirstHundredDays, platformRejections, pledgeDueDate } from "@admin/engine";
import { platformPlanks, type Plank } from "@admin/world";
import { formatDate } from "@admin/player-core";
import { Gauge, Icon } from "@admin/ui-web";
import { togglePlank, togglePriority, type FoundingDraft } from "../draft";
import { PLANK_GLYPH } from "../glyphs";
import { Commits } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

/** Why this plank can't be added right now, or nothing when it can. */
function blockedBy(draft: FoundingDraft, plank: Plank): string | undefined {
  if (draft.platform.includes(plank.id)) return undefined;
  return platformRejections([...draft.platform, plank.id]).find((rejection) => rejection.subject === plank.id || rejection.subject === "platform")?.explanation;
}

function PlankRow({ draft, update, plank }: { readonly draft: FoundingDraft; readonly update: Update; readonly plank: Plank }) {
  const chosen = draft.platform.includes(plank.id);
  const priority = draft.priorities.includes(plank.id);
  const blocked = blockedBy(draft, plank);
  const canPrioritize = chosen && plankFitsFirstHundredDays(plank.id);
  const prioritiesFull = !priority && draft.priorities.length >= FIRST_HUNDRED_DAYS_MAX;
  const due = pledgeDueDate(CAMPAIGN_OPENING_DATE, priority);
  return (
    <li className="plank" data-chosen={chosen ? "true" : undefined}>
      <label className="plank__pick">
        <input type="checkbox" checked={chosen} disabled={blocked !== undefined} onChange={() => update((current) => togglePlank(current, plank.id))} />
        <span className="plank__title">
          {PLANK_GLYPH[plank.id as string] ? <Icon name={PLANK_GLYPH[plank.id as string]!} size={22} /> : null}
          {plank.title}
        </span>
      </label>
      <p className="plank__summary">{plank.summary}</p>
      <p className="plank__meta">
        Courts {plank.courts.map((cohort) => COHORT_MOTIVATION[cohort]?.name ?? cohort).join(", ")}
        {chosen ? ` · Due ${formatDate(due)}` : ""}
      </p>
      {blocked ? <p className="plank__blocked">{blocked}</p> : null}
      {canPrioritize ? (
        <label className="plank__priority">
          <input type="checkbox" checked={priority} disabled={prioritiesFull} onChange={() => update((current) => togglePriority(current, plank.id))} />
          Promise it for the first 100 days{prioritiesFull ? ` (${FIRST_HUNDRED_DAYS_MAX} already promised)` : ""}
        </label>
      ) : null}
    </li>
  );
}

/** Up to five planks, each a dated promise, and up to three of them promised for the first hundred days. */
export function PlatformStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Each plank is a promise with a due date. A first-100-days promise falls due sooner.</Commits>
        <ul className="planks" aria-label="Platform planks">
          {platformPlanks.map((plank) => (
            <PlankRow key={plank.id} draft={draft} update={update} plank={plank} />
          ))}
        </ul>
      </div>
      <div className="stage-grid__side" aria-live="polite">
        <Gauge shape="meter" label="Planks" value={draft.platform.length / PLATFORM_MAX_PLANKS} valueText={`${draft.platform.length} of ${PLATFORM_MAX_PLANKS}`} tone="identity" />
        <Gauge shape="meter" label="First 100 days" value={draft.priorities.length / FIRST_HUNDRED_DAYS_MAX} valueText={`${draft.priorities.length} of ${FIRST_HUNDRED_DAYS_MAX}`} tone="identity" />
      </div>
    </div>
  );
}
