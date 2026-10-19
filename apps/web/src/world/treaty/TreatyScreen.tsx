import { Tag as StatusTag } from "@admin/ui-web";
import { Card } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import {
  place,
  ratifyComparison,
  ratifyPacket,
  signComparison,
  signPacket,
  treatyChoices,
  withdrawComparison,
  withdrawPacket,
  type SenateReading,
  type TreatyScreenReading,
} from "@admin/player-core";
import { Document, EmptyState, Steps, Icon, Stages, type DocumentState } from "@admin/ui-web";
import { partiesLensId } from "../../map/lenses/set-lenses";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { Party } from "../set/Party";
import { ActsReceipt, SetAct, useNationCommit } from "../set/SetAct";
import "../set/set.css";

const LIKELIHOOD: Readonly<Record<SenateReading["likelihood"], number>> = { remote: 1, unlikely: 2, "roughly even": 3, likely: 4, "almost certain": 5 };
const SENATE_TONE: Readonly<Record<SenateReading["likelihood"], "good" | "watch" | "bad">> = { remote: "bad", unlikely: "bad", "roughly even": "watch", likely: "good", "almost certain": "good" };
const SIGNING_TONE = { likely: "good", close: "watch", unlikely: "bad" } as const;
const SIGNING_WORDS = { likely: "Likely to sign", close: "Could go either way", unlikely: "Unlikely to sign" } as const;

const DOCUMENT_STATE: Readonly<Record<TreatyScreenReading["statusKey"], DocumentState>> = {
  draft: "draft",
  compact: "in-effect",
  signed: "signed",
  ratified: "in-effect",
  "in-force-by-signature": "in-effect",
  rejected: "vetoed",
  withdrawn: "revoked",
};

function bindingWords(reading: TreatyScreenReading): string {
  if (reading.form === "compact") return "A standing compact, in force before this administration took office.";
  return reading.bindsOn === "signature"
    ? "This instrument takes effect on signature in the simulation. Actual executive agreements have different constitutional or statutory bases. Signature alone does not establish the scope or duration of legal authority."
    : "For an Article II treaty, Senate advice and consent requires two thirds of Senators present. Consent precedes presidential ratification. The current status and modeled commitments appear in this file.";
}

function Parties({ reading }: { readonly reading: TreatyScreenReading }) {
  return (
    <ul className="set-parties" data-wide="true" aria-label="Parties to the instrument">
      {reading.parties.map((party) => (
        <Party key={party.nation} nation={party.nation} name={party.name} us={party.us} tags={party.us ? <StatusTag tone="identity">You</StatusTag> : null} />
      ))}
    </ul>
  );
}

/** The instrument as paper: its parties, status and what it commits the parties to; the numbered sections are the operative text. */
function Instrument({ reading }: { readonly reading: TreatyScreenReading }) {
  const dated = reading.signedOn ? `Signed ${reading.signedOn}` : reading.form === "draft" ? "Draft, not yet signed" : "In force before this administration";
  return (
    <Document
      issuer={reading.form === "compact" ? "A standing compact" : "The White House"}
      kind={reading.name}
      title={reading.title}
      dated={dated}
      state={DOCUMENT_STATE[reading.statusKey]}
      stateLabel={reading.status}
      sections={[
        { heading: "Parties", body: <Parties reading={reading} /> },
        {
          heading: "Operative commitments",
          body: (
            <>
              <p>{reading.summary}</p>
              {reading.effect ? <p>{reading.effect}</p> : null}
            </>
          ),
        },
        { heading: "Effect and binding force", body: <p>{bindingWords(reading)}</p> },
      ]}
    />
  );
}

/** Whether the other government would sign, then the Senate: what is on the record kept apart from what the staff assess. */
function Position({ reading }: { readonly reading: TreatyScreenReading }) {
  const nothing = !reading.signing && !reading.senate && !reading.vote && !reading.before;
  return (
    <Card role="region" className="set-section" aria-labelledby="treaty-odds">
      <h2 id="treaty-odds" className="set-section__title">
        <Icon name="approve" size={20} /> {reading.signing ? "Will they sign, and will the Senate consent" : "The Senate"}
      </h2>
      {reading.vote ? (
        <p className="set-lede">
          <StatusTag tone="identity">Recorded</StatusTag> {reading.vote}
        </p>
      ) : null}
      {reading.before ? (
        <p className="set-lede">
          <StatusTag tone="identity">Recorded</StatusTag> Before the Senate. {reading.before.dueIn} The vote is on {reading.before.date}.
        </p>
      ) : null}
      {reading.signing ? (
        <div className="set-meters">
          <Steps label="Assessed: the other government signing" lit={{ likely: 3, close: 2, unlikely: 1 }[reading.signing.forecast]} steps={3} word={SIGNING_WORDS[reading.signing.forecast]} tone={SIGNING_TONE[reading.signing.forecast]} caption="Qualitative assessment, not a probability." />
          {reading.signing.reasons.map((reason) => (
            <p key={reason} className="set-note">
              {reason}
            </p>
          ))}
        </div>
      ) : null}
      {reading.senate ? (
        <div className="set-meters">
          <Steps steps={5} tone={SENATE_TONE[reading.senate.likelihood]} label="Assessed: two thirds of the Senate consenting" lit={LIKELIHOOD[reading.senate.likelihood]} word={`${reading.senate.likelihood[0]!.toUpperCase()}${reading.senate.likelihood.slice(1)}`} caption={`${reading.senate.confidence} confidence. An assessment, not a count.`} />
          <p className="set-note">{reading.senate.reasoning}</p>
          <p className="set-note">{reading.senate.uncertainty}</p>
        </div>
      ) : null}
      {nothing ? <p className="set-note">{reading.bindsOn === "signature" ? "No Senate vote: it binds on signature." : "No vote is scheduled."}</p> : null}
    </Card>
  );
}

/** Where the instrument stands on its way to binding anyone: each stage as a step, the ones passed filled, the one it waits at marked. */
function Path({ reading }: { readonly reading: TreatyScreenReading }) {
  const byRatification = reading.bindsOn === "ratification";
  const stages = byRatification ? ["Drafted", "Signed", "Senate consent", "In force"] : ["Drafted", "Signed", "In force"];
  const ended = reading.statusKey === "rejected" || reading.statusKey === "withdrawn";
  const settled = reading.statusKey === "compact" || reading.statusKey === "ratified" || reading.statusKey === "in-force-by-signature";
  const reached = settled ? stages.length - 1 : reading.statusKey === "signed" ? (byRatification && reading.before ? 2 : 1) : 0;
  const done = (index: number): boolean => index < reached || (settled && index === reached);
  return (
    <Stages
      label={`Where it stands: ${reading.status}`}
      stages={stages.map((stage, index) => ({ id: stage, label: stage, state: ended && index === reached ? "ended" : done(index) ? "done" : index === reached ? "now" : "ahead" }))}
    />
  );
}

function History({ reading }: { readonly reading: TreatyScreenReading }) {
  if (reading.history.length === 0) return null;
  return (
    <Card role="region" className="set-section" aria-labelledby="treaty-history">
      <h2 id="treaty-history" className="set-section__title">
        <Icon name="record" size={20} /> History
      </h2>
      <ol className="set-beats">
        {reading.history.map((entry) => (
          <li key={`${entry.date}-${entry.text}`} className="set-beat">
            <span className="set-beat__date">{entry.date}</span>
            <p>{entry.text}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Acts({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  const acts = useNationCommit(campaign);
  const sign = useMemo(() => (reading.form === "draft" ? signComparison(campaign, reading) : undefined), [campaign, reading]);
  const ratify = useMemo(() => (reading.statusKey === "signed" && reading.bindsOn === "ratification" && !reading.before ? ratifyComparison(campaign, reading) : undefined), [campaign, reading]);
  const withdraw = useMemo(() => (reading.statusKey === "signed" || reading.statusKey === "in-force-by-signature" ? withdrawComparison(campaign, reading) : undefined), [campaign, reading]);
  return (
    <>
      <ActsReceipt acts={acts} again="Back to the instrument" />
      <Card role="region" className="set-section" aria-labelledby="treaty-acts">
        <h2 id="treaty-acts" className="set-section__title">
          <Icon name="sign" size={20} /> Next step
        </h2>
        {sign && reading.kind && reading.counterpart ? (
          <SetAct title={`Compare signing the ${reading.name} and leaving it unsigned`} comparison={sign} acts={acts} packet={() => signPacket(campaign, reading.kind!, reading.counterpart!)} receiptTitle={() => `Signed: ${reading.title}`} />
        ) : null}
        {ratify ? <SetAct title="Compare sending it to the Senate and leaving it on the table" comparison={ratify} acts={acts} packet={() => ratifyPacket(campaign, reading.id)} receiptTitle={() => `Sent to the Senate: ${reading.title}`} /> : null}
        {withdraw ? (
          <SetAct title="Compare withdrawing it and leaving it as it stands" comparison={withdraw} acts={acts} tone="danger" packet={() => withdrawPacket(campaign, reading.id)} receiptTitle={() => `Withdrawn: ${reading.title}`} />
        ) : null}
        {!sign && !ratify && !withdraw ? <p className="set-note">{reading.form === "compact" ? "A ratified instrument cannot be withdrawn by this President." : reading.before ? "It is before the Senate. Continue brings the vote." : "Nothing is open on this instrument."}</p> : null}
      </Card>
    </>
  );
}

function Others({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  const choices = useMemo(() => (reading.counterpart ? treatyChoices(campaign, reading.counterpart) : []), [campaign, reading.counterpart]);
  const others = choices.filter((choice) => choice.id !== reading.id);
  if (others.length === 0) return null;
  return (
    <Card role="region" className="set-section" aria-labelledby="treaty-others">
      <h2 id="treaty-others" className="set-section__title">
        <Icon name="summit" size={20} /> Other instruments with {reading.parties.find((party) => !party.us)?.name}
      </h2>
      <ul className="set-list">
        {others.map((choice) => (
          <li key={choice.id} className="ui-row-target">
            <Door href={place.treaty(choice.id)} className="ui-row-link">
              {choice.label}
            </Door>
            <span className="set-list__word ui-valence-ink" data-valence={SIGNING_TONE[choice.forecast]}>
              {choice.forecast === "likely" ? "✓" : choice.forecast === "unlikely" ? "▼" : "⚠"} {SIGNING_WORDS[choice.forecast]}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** A treaty, agreement or compact: its parties set apart on the map, its terms, and the votes and signatures it still needs. */
export function TreatyScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: TreatyScreenReading }) {
  return (
    <Screen
      title={reading.title}
      icon="law"
      eyebrow={`${reading.name} · ${reading.status}`}
      lede={<Door href={place.world()}>World</Door>}
      screenClass="workspace"
      camera="keep"
    >
      <div className="set-room treaty-room">
        <Path reading={reading} />
        <MapView title="The parties on the map" lens={partiesLensId(reading.id)} camera={`set:${reading.set}`} selection={reading.set} note="The governments bound by the instrument, set apart from the rest of the world." height={300} />
        <div className="treaty-layout">
          <Instrument reading={reading} />
          <div className="treaty-side">
            <Position reading={reading} />
            <History reading={reading} />
            <Others campaign={campaign} reading={reading} />
          </div>
        </div>
        <Acts campaign={campaign} reading={reading} />
      </div>
    </Screen>
  );
}

export function NoSuchTreaty() {
  return (
    <Screen title="No such instrument" eyebrow="World" screenClass="workspace" camera="world">
      <EmptyState icon="emptyRecord" title="That instrument is not on your record">
        <Door href={place.world()}>Back to the world</Door>
      </EmptyState>
    </Screen>
  );
}
