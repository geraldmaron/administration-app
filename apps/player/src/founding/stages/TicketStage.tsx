import { FOUNDING_MANDATES, type FoundingMandate } from "@admin/engine";
import type { PersonId } from "@admin/world";
import { Column, Key, ReadingHead, Text, type KeyEntry } from "@admin/ui";
import { ChoiceList } from "@admin/ui/forms";
import { withMandate, withRunningMate, type FoundingDraft, type ResolvedFounding } from "../draft";
import { MandateMark } from "../glyphs";
import { CandidateList, Commits, StageGrid } from "../parts";
import { TicketBalance, TicketKey, homePlace } from "../TicketBalance";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const MANDATE_LABEL: Readonly<Record<FoundingMandate, string>> = {
  landslide: "A landslide",
  comfortable: "A comfortable win",
  narrow: "A narrow win",
  "popular-vote-loss": "Won the Electoral College but got fewer votes overall",
};

const COUNT = "count";

const MANDATE_KEY: readonly KeyEntry[] = [
  { id: "you", kind: "swatch", label: "Your share of the vote", ink: "gold" },
  { id: "them", kind: "swatch", label: "The other candidate's share", ink: "borderColorStrong" },
];

function RunningMates({ draft, resolved, update }: { readonly draft: FoundingDraft; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const top = { age: draft.leader.age, ideology: draft.leader.ideology, ...(draft.leader.homeState ? { homeState: draft.leader.homeState } : {}) };
  if (resolved.runningMates.length === 0) {
    return <Text variant="body" tone="secondary">No one available is a good fit as your running mate, so the vice presidency would start empty.</Text>;
  }
  return (
    <>
      <TicketKey />
      <CandidateList
        label="Running mate"
        withSeat
        chosen={resolved.seated.runningMate as string | undefined}
        onChoose={(id) => update((current) => withRunningMate(current, id as PersonId))}
        candidates={resolved.runningMates.map((candidate) => ({ person: candidate.person, fit: candidate.band, crossesTheAisle: candidate.crossesTheAisle, place: homePlace(candidate), extra: <TicketBalance top={top} candidate={candidate} /> }))}
      />
    </>
  );
}

/** Who runs beside the President, and the mandate the ticket won by. */
export function TicketStage({ draft, resolved, update }: { readonly draft: FoundingDraft; readonly resolved: ResolvedFounding; readonly update: Update }) {
  return (
    <StageGrid
      main={
        <>
          <Commits>Your running mate becomes Vice President, who casts the deciding vote when the Senate is tied. How big you win decides how many seats your party starts with in Congress.</Commits>
          <RunningMates draft={draft} resolved={resolved} update={update} />
        </>
      }
      side={
        <Column gap="sm">
        <ReadingHead title="The two bars show each side's share of the vote" unit="Share of the vote, drawn in proportion" help={{ meaning: "Each choice draws the two shares of the vote. The wider the gold part, the bigger your win. The widths show the order of the margins, not a forecast of any count." }} />
        <Key entries={MANDATE_KEY} label="Key: the two bars" />
        <ChoiceList
          label="How the country voted"
          minCardWidth={300}
          value={draft.mandate ?? COUNT}
          options={[{ value: COUNT, label: "Leave it to chance", detail: "The game picks how close the election was.", visual: <MandateMark mandate={undefined} /> }, ...FOUNDING_MANDATES.map((value) => ({ value: value as string, label: MANDATE_LABEL[value], visual: <MandateMark mandate={value} /> }))]}
          onChange={(value) => update((current) => withMandate(current, value === COUNT ? undefined : (value as FoundingMandate)))}
        />
        </Column>
      }
    />
  );
}
