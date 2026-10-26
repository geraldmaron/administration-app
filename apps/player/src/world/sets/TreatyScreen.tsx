import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { place, ratifyComparison, ratifyPacket, signComparison, signPacket, treatyChoices, withdrawComparison, withdrawPacket, type SenateReading, type TreatyScreenReading } from "@admin/player-core";
import { Pane, Tag, Column, Empty, Icon, Page, Reading, Row, Stamp, Text, TreatyPaper, useMedia } from "@admin/ui";
import { Stages, type StageView } from "@admin/ui/review";
import { Beat, StateChip, Pips } from "@admin/ui/world";
import { ActsReceipt, SetAct, useWorldActs } from "../acts";
import { topicAuthorities } from "../law";
import { BackButton } from "../../shell/BackButton";
import { BandFrame, CiteById, FlagOf, MapPanelSlot, NationLink, RowTo, SealOf, splitColumn, TopicLaw } from "../parts";

const LIKELIHOOD: Readonly<Record<SenateReading["likelihood"], number>> = { remote: 1, unlikely: 2, "roughly even": 3, likely: 4, "almost certain": 5 };
const SENATE_VALENCE = { remote: "bad", unlikely: "bad", "roughly even": "watch", likely: "good", "almost certain": "good" } as const;
const SIGNING_VALENCE = { likely: "good", close: "watch", unlikely: "bad" } as const;
const SIGNING_WORDS = { likely: "Likely to sign", close: "Could go either way", unlikely: "Unlikely to sign" } as const;

function bindingWords(reading: TreatyScreenReading): string {
  if (reading.form === "compact") return "A long-standing agreement that was already in force when you took office.";
  return reading.bindsOn === "signature"
    ? "In this game, this agreement takes effect as soon as it's signed. In real life, agreements like this rest on different laws, and a signature alone doesn't settle how far they reach or how long they last."
    : "A treaty needs the Senate's approval. Two thirds of the senators present have to vote yes, and only then can you ratify it, which makes it official. Each side is bound by the terms once it takes effect.";
}

/** Country names that read with "the" in running text. */
const TAKES_THE = /^(United|Netherlands|Philippines|Czech|Bahamas|Gambia|Maldives|Marshall|Solomon|Comoros|Seychelles|Holy See|Dominican|Central African)/;

const formalName = (party: TreatyScreenReading["parties"][number]): string => (party.us ? "the Government of the United States of America" : `the Government of ${TAKES_THE.test(party.name) ? "the " : ""}${party.name}`);

function entryIntoForce(reading: TreatyScreenReading): string {
  if (reading.form === "compact") return "This Agreement remains in force as concluded between the Parties.";
  return reading.bindsOn === "signature" ? "This Agreement shall enter into force upon signature by both Parties." : "This Agreement is subject to ratification. It shall enter into force on the date the Parties exchange their instruments of ratification.";
}

/** The agreement as the parties sign it, with only its own words on the paper; who the parties are and what the game makes of it sit under it. */
function Instrument({ reading }: { readonly reading: TreatyScreenReading }) {
  const stamp = reading.form === "draft" ? <Stamp tone="draft">Draft</Stamp> : reading.form === "compact" ? <Stamp tone="law">In force</Stamp> : <Stamp tone="pending">{reading.status}</Stamp>;
  return (
    <Column gap="md">
      <TreatyPaper
        title={reading.title}
        parties={reading.parties.map((party) => ({ name: formalName(party) }))}
        marks={reading.parties.map((party) => <FlagOf key={party.nation} nation={party.nation} name={party.name} height={28} />)}
        articles={[
          { heading: "Undertakings", body: reading.summary },
          { heading: "Entry into force", body: entryIntoForce(reading) },
        ]}
        {...(reading.signedOn ? { done: `Done at Washington, ${reading.signedOn}` } : {})}
        stamp={stamp}
      />
      <Row gap="sm" wrap>
        <Text variant="label" tone="secondary">Parties:</Text>
        {reading.parties.map((party) => (
          <Row key={party.nation} gap="xs">
            <NationLink nation={party.nation} name={party.name} />
            {party.us ? <Tag tone="info">You</Tag> : null}
          </Row>
        ))}
      </Row>
      {reading.effect ? <Text variant="body">{reading.effect}</Text> : null}
      <Text variant="body" tone="secondary">{bindingWords(reading)}</Text>
      <CiteById id={reading.bindsOn === "ratification" ? "const-art2-s2-cl2" : "case-zablocki"} />
    </Column>
  );
}

/** Whether the other government would sign, then the Senate: what is on the record kept apart from what the staff assess. */
function Position({ reading }: { readonly reading: TreatyScreenReading }) {
  const nothing = !reading.signing && !reading.senate && !reading.vote && !reading.before;
  return (
    <Pane id="treaty-odds" title={reading.signing ? "Will they sign, and will the Senate approve it?" : "The Senate"} icon="approve" emblem={<SealOf id="SEAL-SENATE" size={32} />}>
      {reading.vote ? <Row gap="sm" wrap><Tag tone="info">Recorded</Tag><Text variant="body" flex={1}>{reading.vote}</Text></Row> : null}
      {reading.before ? <Row gap="sm" wrap><Tag tone="info">Recorded</Tag><Text variant="body" flex={1}>The Senate has it now. {reading.before.dueIn} The vote is on {reading.before.date}.</Text></Row> : null}
      {reading.signing || reading.senate ? (
        <BandFrame title="Staff estimates" unit="Steps lit on a ladder, the phrase beside each bar says which" meaning="Each bar is your staff's best guess, not exact odds. Whether the other country signs has three steps: Unlikely, Could go either way and Likely. Whether two thirds of the Senate approve has five: Remote, Unlikely, Roughly even, Likely and Almost certain. The phrase is the reading, never a vote count.">
        {reading.signing ? (
          <Column gap="xs">
            <Reading name="Will the other country sign?" value={SIGNING_WORDS[reading.signing.forecast]} basis="forecast" size="title" />
            <Pips lit={{ likely: 3, close: 2, unlikely: 1 }[reading.signing.forecast]} steps={3} valence={SIGNING_VALENCE[reading.signing.forecast]} />
            {reading.signing.reasons.map((reason) => (
              <Text key={reason} variant="caption" tone="secondary">
                {reason}
              </Text>
            ))}
          </Column>
        ) : null}
        {reading.senate ? (
          <Column gap="xs">
            <Reading name="Will two thirds of the Senate approve?" value={`${reading.senate.likelihood[0]!.toUpperCase()}${reading.senate.likelihood.slice(1)}`} basis="forecast" size="title" />
            <Pips lit={LIKELIHOOD[reading.senate.likelihood]} steps={5} valence={SENATE_VALENCE[reading.senate.likelihood]} />
            <Text variant="caption" tone="secondary">{`${reading.senate.confidence} confidence. A best guess, not a vote count.`}</Text>
            <Text variant="caption" tone="secondary">{reading.senate.reasoning}</Text>
            <Text variant="caption" tone="tertiary">{reading.senate.uncertainty}</Text>
          </Column>
        ) : null}
        </BandFrame>
      ) : null}
      {nothing ? <Text variant="body" tone="secondary">{reading.bindsOn === "signature" ? "The Senate doesn't vote on this one. It takes effect when it's signed." : "No vote is scheduled."}</Text> : null}
    </Pane>
  );
}

/** Where the instrument stands on its way to binding anyone: each stage reached only when it actually happened. */
function pathStages(reading: TreatyScreenReading): readonly StageView[] {
  const byRatification = reading.bindsOn === "ratification";
  const stages = byRatification ? ["Drafted", "Signed", "Senate approval", "In force"] : ["Drafted", "Signed", "In force"];
  const ended = reading.statusKey === "rejected" || reading.statusKey === "withdrawn";
  const settled = reading.statusKey === "compact" || reading.statusKey === "ratified" || reading.statusKey === "in-force-by-signature";
  const reached = settled ? stages.length - 1 : reading.statusKey === "signed" ? (byRatification && reading.before ? 2 : 1) : 0;
  const done = (index: number): boolean => index < reached || (settled && index === reached);
  return stages.map((stage, index) => ({ id: stage, label: stage, state: ended && index === reached ? "ended" : done(index) ? "done" : index === reached ? "now" : "ahead" }));
}

function Acts({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  const acts = useWorldActs(campaign, `set:${reading.set}`);
  const sign = useMemo(() => (reading.form === "draft" ? signComparison(campaign, reading) : undefined), [campaign, reading]);
  const ratify = useMemo(() => (reading.statusKey === "signed" && reading.bindsOn === "ratification" && !reading.before ? ratifyComparison(campaign, reading) : undefined), [campaign, reading]);
  const withdraw = useMemo(() => (reading.statusKey === "signed" || reading.statusKey === "in-force-by-signature" ? withdrawComparison(campaign, reading) : undefined), [campaign, reading]);
  const law = topicAuthorities("treaties");
  const { kind, counterpart } = reading;
  return (
    <Column gap="lg">
      <ActsReceipt acts={acts} again="Back to the agreement" />
      <Pane title="Next step" icon="sign" actions={<TopicLaw topic="treaties" />}>
        {sign && kind && counterpart ? <SetAct title={`Sign the ${reading.name}, or leave it unsigned`} comparison={sign} acts={acts} packet={() => signPacket(campaign, kind, counterpart)} receiptTitle={() => `Signed: ${reading.title}`} law={law} /> : null}
        {ratify ? <SetAct title="Send it to the Senate for a vote, or hold it for now" comparison={ratify} acts={acts} packet={() => ratifyPacket(campaign, reading.id)} receiptTitle={() => `Sent to the Senate: ${reading.title}`} law={law.slice(0, 1)} /> : null}
        {withdraw ? <SetAct title="Pull out of it, or leave it as it is" comparison={withdraw} acts={acts} tone="danger" packet={() => withdrawPacket(campaign, reading.id)} receiptTitle={() => `Withdrawn: ${reading.title}`} law={law} /> : null}
        {!sign && !ratify && !withdraw ? <Text variant="body" tone="secondary">{reading.form === "compact" ? "This agreement was ratified before you took office, and in this game, you can't withdraw from it." : reading.before ? "The Senate has it now, with a vote pending." : "There's nothing for you to do on this agreement right now."}</Text> : null}
      </Pane>
    </Column>
  );
}

function Others({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  const choices = useMemo(() => (reading.counterpart ? treatyChoices(campaign, reading.counterpart) : []), [campaign, reading.counterpart]);
  const others = choices.filter((choice) => choice.id !== reading.id);
  if (others.length === 0) return null;
  return (
    <Pane title={`Other agreements with ${reading.parties.find((party) => !party.us)?.name ?? "them"}`} icon="summit">
      <Column role="group" aria-label="Other agreements">
        {others.map((choice, index) => (
          <RowTo key={choice.id} first={index === 0} href={place.treaty(choice.id)} label={`Open ${choice.label}`} flexDirection="row" flexWrap="wrap" alignItems="center" gap="sm" paddingVertical="sm" paddingHorizontal="xs">
            <Icon name="sign" size={18} tone="colorSecondary" />
            <Text variant="label" flexGrow={1} flexShrink={1} flexBasis={160}>
              {choice.label}
            </Text>
            <StateChip valence={SIGNING_VALENCE[choice.forecast]}>{SIGNING_WORDS[choice.forecast]}</StateChip>
          </RowTo>
        ))}
      </Column>
    </Pane>
  );
}

/** A treaty, agreement or compact: its parties set apart on the map, its terms as paper, and the votes and signatures it still needs. */
export function TreatyScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  const media = useMedia();
  return (
    <Page title={reading.title} eyebrow={`${reading.name} · ${reading.status}`} icon="law" emblem={<SealOf id="INST-STATE" size={56} />} actions={<><BackButton parent={place.world()} parentLabel="World" /><TopicLaw topic="treaties" /></>} wide>
      <MapPanelSlot title="The parties on the map" lens={`parties:${reading.id}`} camera={`set:${reading.set}`} selection={reading.set} note="The countries in this agreement are highlighted.">
        <Row gap="sm" wrap>
          {reading.parties.map((party) => (
            <NationLink key={party.nation} nation={party.nation} name={party.name} height={16} />
          ))}
        </Row>
      </MapPanelSlot>
      <Stages label={`Where it stands: ${reading.status}`} stages={pathStages(reading)} />
      <Row gap="xl" top wrap={!media.desktop}>
        <Column {...splitColumn(media.desktop, 3)}>
          <Instrument reading={reading} />
        </Column>
        <Column {...splitColumn(media.desktop, 2)} gap="lg">
          <Position reading={reading} />
          {reading.history.length > 0 ? (
            <Pane title="History" icon="record">
              {reading.history.map((entry) => (
                <Beat key={`${entry.date}-${entry.text}`} date={entry.date}>
                  {entry.text}
                </Beat>
              ))}
            </Pane>
          ) : null}
          <Others campaign={campaign} reading={reading} />
        </Column>
      </Row>
      <Acts campaign={campaign} reading={reading} />
    </Page>
  );
}

export function NoSuchTreaty() {
  return (
    <Page title="Agreement not found" eyebrow="World · agreements" icon="law" actions={<BackButton parent={place.world()} parentLabel="World" />}>
      <Empty title="We couldn't find that agreement on your Record" />
    </Page>
  );
}
