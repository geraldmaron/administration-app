import type { Campaign } from "@admin/engine";
import { briefMatters, place, selectPending, spanWords, stopWords } from "@admin/player-core";
import { Button, Column, Page, Row, Section, useMedia } from "@admin/ui";
import { useCampaignState, usePreferences } from "../../../src/device/hooks";
import { RunningClocks, WhileTimeRan } from "../../../src/brief/Clocks";
import { Dispatches } from "../../../src/brief/Dispatches";
import { MatterQueue, PriorityCard, QuietDay } from "../../../src/brief/Matters";
import { NationalCondition } from "../../../src/brief/NationalCondition";
import { InTerm } from "../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../src/review/PresidentialReview";
import { go } from "../../../src/shell/navigate";
import { PendingCard } from "../../../src/shell/Pending";
import { useSaid } from "../../../src/shell/said";

function BriefScreen({ campaign }: { readonly campaign: Campaign }) {
  const media = useMedia();
  const state = useCampaignState();
  const said = useSaid();
  const { preferences } = usePreferences();
  const matters = briefMatters(campaign, preferences.attentionByKind);
  const [lead, ...rest] = matters;
  const holding = matters.filter((matter) => matter.holds).length;
  const brief = state.status === "ready" && state.brief && !state.briefAcknowledged ? state.brief : undefined;
  const sentence = said || (brief ? `Time moved ${spanWords(brief)}. ${stopWords(brief)}` : "");
  const waiting = matters.length - holding;
  const lede = matters.length === 0 ? "Nothing needs you right now." : holding === 0 ? `${matters.length} ${matters.length === 1 ? "matter waits" : "matters wait"}; none holds time.` : `${holding} ${holding === 1 ? "matter holds" : "matters hold"} time${waiting > 0 ? `; ${waiting} ${waiting === 1 ? "waits" : "wait"}` : ""}.`;
  const othersWaiting = selectPending(campaign).some((item) => item.waitingOn !== undefined);
  const side = (
    <Column gap="lg" width={media.desktop ? 360 : "100%"}>
      <PendingCard campaign={campaign} title="Waiting on others" only={(item) => item.waitingOn !== undefined} limit={6} />
      <RunningClocks campaign={campaign} {...(othersWaiting ? {} : { quietNote: "Nothing you ordered is waiting on an answer." })} />
    </Column>
  );
  return (
    <Page eyebrow="Executive Office of the President" icon="brief" title="President's Brief" lede={lede} actions={<Button kind="secondary" size="compact" icon="notificationStack" onPress={() => go(place.digest())}>Briefing history</Button>}>
      <WhileTimeRan campaign={campaign} brief={brief} sentence={sentence} />
      <Row gap="xl" top wrap={!media.desktop}>
        <Column gap="lg" flex={1} minWidth={0}>
          <Section id="desk" icon="brief" title="On your desk" helper="The most pressing matter first, then the rest in the order they need you.">
            {lead ? <PriorityCard campaign={campaign} matter={lead} /> : <QuietDay campaign={campaign} />}
            <MatterQueue campaign={campaign} matters={rest} />
          </Section>
        </Column>
        {media.desktop ? side : null}
      </Row>
      <NationalCondition campaign={campaign} />
      <Dispatches campaign={campaign} />
      {media.desktop ? null : side}
    </Page>
  );
}

export default function Brief() {
  return (
    <ReviewBoundary>
      <InTerm>{(campaign) => <BriefScreen campaign={campaign} />}</InTerm>
    </ReviewBoundary>
  );
}
