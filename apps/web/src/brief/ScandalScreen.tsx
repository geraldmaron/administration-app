import { useState } from "react";
import {
  SCANDAL_RESPONSE_LABELS,
  SCANDAL_RESPONSE_VERBS,
  projectScandalResponses,
  respondToScandal,
  scandalAnswer,
  scandalCounselRead,
  selectDateOfTurn,
  selectScandalBoard,
  sentenceCase,
  type Campaign,
  type Scandal,
  type ScandalFileRead,
  type ScandalPriceWord,
  type ScandalResponseVerb,
  type ScandalStage,
} from "@admin/engine";
import { formatDate, formatRatio, place, roleTitle } from "@admin/player-core";
import { Button, Card, CardHeader, CardContent, CompareAuthorize, Gauge, Portrait, Receipt, Stages, Tag, buttonClass, type CompareRow, type IconBadgeTone, type IconName } from "@admin/ui-web";
import { useAuthorize } from "../app/use-authorize";
import { actsChoice, useChoiceProjection } from "../modeling/ChoiceProjection";
import { faceOf } from "../media/faces";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";

const STAGES: readonly ScandalStage[] = ["breaking", "developing", "fading", "resolved"];
const STAGE_WORDS: Readonly<Record<ScandalStage, string>> = { breaking: "Breaking", developing: "Developing", fading: "Fading", resolved: "Over" };
const READS: readonly ScandalFileRead[] = ["thin", "named", "thick"];
const READ_WORDS: Readonly<Record<ScandalFileRead, string>> = {
  thin: "Your lawyer thinks the press has less than it is printing.",
  named: "Your lawyer thinks the story names a specific person, and the press will chase that name.",
  thick: "Your lawyer thinks the press can prove most of it.",
};
const LANDED: Readonly<Record<ScandalPriceWord, string>> = {
  fading: "It fit what the press had. The story is fading.",
  steady: "It kept the story where it was. The press is still asking.",
  heavy: "It did not fit what the press had. The story is growing again.",
};

function Heat({ scandal, weeks }: { readonly scandal: Scandal; readonly weeks?: number }) {
  const at = STAGES.indexOf(scandal.stage);
  return (
    <Card role="region" aria-label="Timeline: where the story stands"><CardContent className="grid gap-4 pt-5">
      <Gauge shape="meter" label="Heat" value={scandal.stage === "resolved" ? 0 : scandal.intensity} valueText={scandal.stage === "resolved" ? "Over" : formatRatio(scandal.intensity)} tone="risk" />
      <Stages label={`Stage: ${STAGE_WORDS[scandal.stage]}`} stages={STAGES.map((stage, index) => ({ id: stage, label: STAGE_WORDS[stage], state: index < at ? "done" : index === at ? "now" : "ahead" }))} />
      {weeks !== undefined ? <p className="m-0 text-xs text-muted-foreground">{weeks === 0 ? "Broke this week" : `${weeks} ${weeks === 1 ? "week" : "weeks"} running`}</p> : null}
    </CardContent></Card>
  );
}

function Named({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  const implicated = scandal.implicated;
  if (!implicated) return <p className="m-0 text-sm text-muted-foreground">The story names no officer. It is about the White House.</p>;
  const face = faceOf(campaign, implicated.person);
  return (
    <Button asChild kind="secondary" className="h-auto justify-start py-3 text-left"><Door href={place.person(implicated.person)}>
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="md" decorative />
      <span><strong className="block">{face.name}</strong><span className="block text-xs font-normal text-muted-foreground">{implicated.role ? roleTitle(implicated.role) : "Formerly of this administration"}</span></span>
    </Door></Button>
  );
}

function compareRows(campaign: Campaign, scandal: Scandal): readonly CompareRow[] {
  const projections = projectScandalResponses(campaign, scandal);
  const byVerb = new Map(projections.map((row) => [row.verb, row]));
  const cells = (pick: (verb: ScandalResponseVerb) => string) => Object.fromEntries(SCANDAL_RESPONSE_VERBS.map((verb) => [verb, pick(verb)]));
  return [
    { label: "What you do", kind: "lead" as const, cells: cells((verb) => byVerb.get(verb)?.ask ?? "") },
    { label: "The risk", icon: "caution" as const, cells: cells((verb) => byVerb.get(verb)?.risk ?? "") },
  ];
}

/** Committing an answer against the campaign it was read on, recording the change for the delta lens. */
function useScandalAnswer(campaign: Campaign, scandal: Scandal) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [answered, setAnswered] = useState<{ readonly eventId?: string; readonly saveError?: string }>({});
  async function answer(selected: string) {
    const verb = SCANDAL_RESPONSE_VERBS.find((entry) => entry === selected);
    if (!verb) return;
    const authorized = await authorize(() => {
      const result = respondToScandal(campaign, scandal, verb);
      if (!result.ok) throw new Error(result.reason);
      return { packet: result.packet };
    }, { tier: "full", title: `Answered: ${SCANDAL_RESPONSE_LABELS[verb]}`, lines: [{ label: "Scandal", value: scandal.subject }], danger: verb !== "come-clean" }, { camera: "dc" });
    if (!authorized) return;
    setAnswered({ ...(authorized.eventId ? { eventId: authorized.eventId } : {}), ...(authorized.saveError ? { saveError: authorized.saveError } : {}) });
  }
  return { busy, problem, ...answered, answer };
}

/** Coming clean is the principled answer, fighting it is force, handing over a name is a sacrifice made in the open. */
const VERB_LOOK: Readonly<Record<ScandalResponseVerb, { readonly icon: IconName; readonly accent: IconBadgeTone }>> = {
  "come-clean": { icon: "law", accent: "gold" },
  "fight-it": { icon: "escalate", accent: "red" },
  "give-them-someone": { icon: "subjectPerson", accent: "blue" },
};

const READ_STEP: Readonly<Record<ScandalFileRead, string>> = { thin: "Less than printed", named: "A name in it", thick: "Can prove most" };

function Answers({ campaign, scandal, acts }: { readonly campaign: Campaign; readonly scandal: Scandal; readonly acts: ReturnType<typeof useScandalAnswer> }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const unavailable = new Map(projectScandalResponses(campaign, scandal).map((row) => [row.verb, row.unavailable]));
  const options = SCANDAL_RESPONSE_VERBS.map((verb) => ({ id: verb, label: SCANDAL_RESPONSE_LABELS[verb], ...VERB_LOOK[verb], ...(unavailable.get(verb) ? { unavailable: unavailable.get(verb)! } : {}) }));
  const read = scandalCounselRead(campaign.seed, scandal.id, scandal.charge);
  const projection = useChoiceProjection(
    campaign,
    actsChoice(scandal.subject, "letting the story run", "If you don't answer, the story keeps running.", SCANDAL_RESPONSE_VERBS.map((verb) => {
      const locked = unavailable.get(verb);
      return { id: verb, label: SCANDAL_RESPONSE_LABELS[verb], ...(locked ? { refused: locked } : { act: { act: "scandal" as const, scandal: scandal.id, verb } }) };
    })),
    selected,
  );
  return (
    <>
      <Card role="region" aria-labelledby="scandal-read"><CardHeader>
        <h2 id="scandal-read" className="situation__label">
          <Tag tone="action" icon="review">Assessment</Tag> What the papers hold, by your lawyer's read
        </h2>
        </CardHeader><CardContent className="grid gap-3"><ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Counsel assessment">
          {READS.map((step) => (
            <li key={step}><Tag tone={step === read ? "action" : "neutral"} icon={step === read ? "review" : "neutral"}>{READ_STEP[step]}</Tag>
            </li>
          ))}
        </ul>
        <p className="m-0 text-sm">{READ_WORDS[read]} This is counsel’s assessment, not a confirmed finding.</p>
      </CardContent></Card>
      <CompareAuthorize
        title="Compare the answers"
        options={options}
        rows={compareRows(campaign, scandal)}
        selected={selected}
        onSelect={setSelected}
        verb="Give this answer"
        onAuthorize={() => selected && void acts.answer(selected)}
        review="Each answer is final: a story can be answered once."
        baselineReview="While the story runs unanswered, it keeps charging your integrity every week."
        busy={acts.busy}
        docked
        {...(projection ? { projection } : {})}
      />
      {acts.problem ? <p role="alert">{acts.problem}</p> : null}
    </>
  );
}

function Answered({ answered, eventId, saveError }: { readonly answered: NonNullable<ReturnType<typeof scandalAnswer>>; readonly eventId?: string; readonly saveError?: string }) {
  const record = saveError ? `It stands, but this device did not save it: ${saveError}` : "Each story can be answered once, and the answer is on your Record.";
  return (
    <Receipt title={`Answered: ${SCANDAL_RESPONSE_LABELS[answered.verb]}`} date="" lines={[{ label: "How it landed", value: LANDED[answered.price] }]} record={record}>
      {eventId ? (
        <Door href={`/record/event/${encodeURIComponent(eventId)}`} className={buttonClass("primary", "sm")}>
          Open the Record entry
        </Door>
      ) : null}
      <Door href="/brief" className={buttonClass("ghost", "sm")}>
        Back to the Brief
      </Door>
    </Receipt>
  );
}

function Allegations({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  return (
    <Card role="region" aria-labelledby="scandal-alleged"><CardHeader>
      <h2 id="scandal-alleged" className="brief-section__title">
        <Tag tone="caution" icon="caution">Alleged</Tag> What the papers print
      </h2>
      </CardHeader><CardContent className="grid gap-3"><p className="m-0 text-sm leading-relaxed">{scandal.context ?? "The papers have the charge and not yet the whole account."}</p>
      <Named campaign={campaign} scandal={scandal} />
      <p className="brief-section__note">These are claims in print. Nothing here is established until it is confirmed.</p>
    </CardContent></Card>
  );
}

function Established({ campaign, scandal, reading }: { readonly campaign: Campaign; readonly scandal: Scandal; readonly reading: ReturnType<typeof selectScandalBoard>[number] | undefined }) {
  const broke = scandal.brokeTurn >= 0 ? formatDate(selectDateOfTurn(campaign, scandal.brokeTurn)) : "Not dated";
  const weeks = reading?.weeksRunning;
  return (
    <Card role="region" aria-labelledby="scandal-known"><CardHeader>
      <h2 id="scandal-known" className="brief-section__title">
        <Tag tone="identity" icon="approve">Known</Tag> What is established
      </h2>
      </CardHeader><CardContent><dl className="m-0 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Broke</dt>
          <dd className="m-0 text-sm font-medium">{broke}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Running</dt>
          <dd className="m-0 text-sm font-medium">{weeks === undefined ? "Not tracked" : weeks === 0 ? "This week" : `${weeks} ${weeks === 1 ? "week" : "weeks"}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Stage</dt>
          <dd className="m-0 text-sm font-medium">{STAGE_WORDS[scandal.stage]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Kept alive by</dt>
          <dd className="m-0 text-sm font-medium">{reading ? `${reading.keptAliveBy.name} (hostility ${formatRatio(reading.keptAliveBy.hostility)})` : "No desk is driving it"}</dd>
        </div>
      </dl>
    </CardContent></Card>
  );
}

/**
 * A running story about the administration: what is alleged apart from what
 * is established, its timeline, counsel's read of the file as an assessment,
 * and the three answers against staying silent.
 */
export function ScandalScreen({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  const acts = useScandalAnswer(campaign, scandal);
  const reading = selectScandalBoard(campaign).find((row) => row.scandal.id === scandal.id);
  const answered = scandalAnswer(campaign, scandal.id, scandal.charge);
  return (
    <Screen icon="press" iconTone="red" title={sentenceCase(scandal.subject)} eyebrow="A running story" screenClass="workspace" camera="us">
      <div className="scandal">
        <Heat scandal={scandal} {...(reading?.weeksRunning === undefined ? {} : { weeks: reading.weeksRunning })} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Allegations campaign={campaign} scandal={scandal} />
          <Established campaign={campaign} scandal={scandal} reading={reading} />
        </div>
        {answered ? <Answered answered={answered} {...(acts.eventId ? { eventId: acts.eventId } : {})} {...(acts.saveError ? { saveError: acts.saveError } : {})} /> : scandal.stage === "resolved" ? null : <Answers campaign={campaign} scandal={scandal} acts={acts} />}
      </div>
    </Screen>
  );
}
