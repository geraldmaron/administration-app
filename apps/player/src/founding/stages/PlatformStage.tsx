import { CAMPAIGN_OPENING_DATE, COHORT_MOTIVATION, FIRST_HUNDRED_DAYS_MAX, PLATFORM_MAX_PLANKS, plankFitsFirstHundredDays, platformRejections, pledgeDueDate } from "@admin/engine";
import { formatDate } from "@admin/player-core";
import { platformPlanks, type Plank } from "@admin/world";
import { Column, Meter, ReadingFrame, Row, Text } from "@admin/ui";
import { CheckCard, Toggle } from "@admin/ui/forms";
import { termDoor } from "../../handbook/term-door";
import { togglePlank, togglePriority, type FoundingDraft } from "../draft";
import { PLANK_GLYPH } from "../glyphs";
import { Commits, Reading, StageGrid } from "../parts";

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
    <Column gap="xs" role="listitem">
      <CheckCard label={plank.title} detail={plank.summary} icon={PLANK_GLYPH[plank.id as string]} checked={chosen} disabled={blocked !== undefined} onChange={() => update((current) => togglePlank(current, plank.id))}>
        <Text variant="caption" tone="tertiary">
          Courts {plank.courts.map((cohort) => COHORT_MOTIVATION[cohort]?.name ?? cohort).join(", ")}
          {chosen ? ` · Due ${formatDate(due)}` : ""}
        </Text>
        {blocked ? (
          <Text variant="caption" tone="warning">
            {blocked}
          </Text>
        ) : null}
      </CheckCard>
      {canPrioritize ? (
        <Column paddingLeft="xl">
          <Toggle
            label="Promise it for the first 100 days"
            hint={prioritiesFull ? `You've already promised ${FIRST_HUNDRED_DAYS_MAX}, the most you can.` : undefined}
            value={priority}
            disabled={prioritiesFull}
            onChange={() => update((current) => togglePriority(current, plank.id))}
          />
        </Column>
      ) : null}
    </Column>
  );
}

/** Up to five planks, each a dated promise, and up to three of them promised for the first hundred days. */
export function PlatformStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  return (
    <StageGrid
      main={
        <>
          <Commits>Your platform is the list of promises you make to voters. Each one has a date it's due. If you promise it for your first 100 days, it's due sooner.</Commits>
          <Column gap="sm" role="list" aria-label="Promises you can make">
            {platformPlanks.map((plank) => (
              <PlankRow key={plank.id} draft={draft} update={update} plank={plank} />
            ))}
          </Column>
        </>
      }
      side={
        <Reading icon="domesticLedger" title="Your promises">
          <Column gap="md" aria-live="polite">
            <ReadingFrame
              title="How many promises you've made"
              unit="Promises chosen out of the most you can make"
              legend={[{ id: "promises", kind: "swatch", label: "Promises", ink: "accent", figure: `${draft.platform.length} of ${PLATFORM_MAX_PLANKS}` }, { id: "hundred", kind: "swatch", label: "Promised for the first 100 days", ink: "warningInk", figure: `${draft.priorities.length} of ${FIRST_HUNDRED_DAYS_MAX}` }]}
              help={{ meaning: "Each bar fills as you choose more. The blue bar counts all your promises. The gold bar counts the ones you promise for your first 100 days, which are due sooner.", term: termDoor("first-hundred-days", "First hundred days") }}
            >
              <Meter label="Promises" value={draft.platform.length / PLATFORM_MAX_PLANKS} figure={`${draft.platform.length} of ${PLATFORM_MAX_PLANKS}`} />
              <Meter label="First 100 days" value={draft.priorities.length / FIRST_HUNDRED_DAYS_MAX} figure={`${draft.priorities.length} of ${FIRST_HUNDRED_DAYS_MAX}`} tone="warningInk" />
            </ReadingFrame>
          </Column>
          <Row>
            <Text variant="caption" tone="secondary">
              You don't have to make any promises. Each one you make is checked on the day it's due.
            </Text>
          </Row>
        </Reading>
      }
    />
  );
}
