import { RelationshipNavigator, type RelationshipSearch } from "./RelationshipNavigator";
import { useMemo, useState } from "react";
import { institutionForRole, selectHill, type Campaign } from "@admin/engine";
import { caucusParty, circleSummary, connectionKindLabel, connectionTone, formatDate, PARTY_WORDS, personFile, personRecord, place, subjectHref, type PersonFile } from "@admin/player-core";
import { Field, Collection, EmptyState, Card, Flag, Icon, PartyMark, Portrait, Tabs, Tag, type IconName, type TagTone } from "@admin/ui-web";
import { Dossier, DossierSection, IdPlate, Vitals, type Vital } from "../../shell/dossier/Dossier";
import { CareerBands } from "./PersonVisuals";
import { nationFlagUrl, stateFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { ActReceipt } from "../executive/ActReceipt";
import { useChairActs, type ChairActDone } from "../executive/acts";
import { PersonActs } from "./PersonActs";
import "./institution-dossier.css";
import { PersonReadings } from "./PersonReadings";
import { RecordInOffice } from "./RecordInOffice";

export const PERSON_VIEWS = ["overview", "network", "career"] as const;
export type PersonView = typeof PERSON_VIEWS[number];

const STANCE_WORDS = {
  for: "Backed it",
  wary: "Was wary",
  against: "Argued against it",
} as const;

type Standing = PersonFile["dossier"]["standing"];

/** The house that keeps a person's file: where they serve, or the government they answer to. */
function houseOf(standing: Standing): string {
  switch (standing.kind) {
    case "cabinet":
      return standing.institution?.name ?? "The White House";
    case "agency":
      return standing.institution.name;
    case "hill":
      return `United States ${standing.chamber}`;
    case "justice":
      return "Supreme Court of the United States";
    case "mayor":
      return `City of ${standing.cityName}`;
    case "governor":
      return `State of ${standing.stateName}`;
    case "foreign-leader":
    case "foreign":
      return standing.nationName;
    default:
      return "The White House";
  }
}

const STANDING_TAG: Partial<Record<Standing["kind"], readonly [string, TagTone, IconName]>> = {
  cabinet: ["Cabinet", "identity", "westWing"],
  agency: ["Agency head", "identity", "building"],
  hill: ["Congress", "neutral", "subjectCapitol"],
  justice: ["Justice", "identity", "court"],
  governor: ["Governor", "neutral", "mapPin"],
  "foreign-leader": ["Head of government", "action", "world"],
  foreign: ["Foreign official", "neutral", "world"],
  former: ["Former official", "neutral", "archive"],
  available: ["Available", "action", "appoint"],
  deceased: ["Deceased", "neutral", "neutral"],
};

const CIRCUIT_JUDGE_TAG: readonly [string, TagTone, IconName] = ["Circuit judge", "identity", "court"];

function PlateTags({ campaign, file }: { readonly campaign: Campaign; readonly file: PersonFile }) {
  const standing = file.dossier.standing.kind === "agency" && file.dossier.standing.circuit ? CIRCUIT_JUDGE_TAG : STANDING_TAG[file.dossier.standing.kind];
  const role = file.dossier.standing;
  const memberParty = campaign.congress.members?.find((member) => member.person === file.person.id)?.party;
  const hill = role.kind === "hill" ? selectHill(campaign).find((member) => member.person?.id === file.person.id) : undefined;
  const party = role.kind === "hill" ? memberParty ?? (hill ? caucusParty(campaign, hill.figure.caucus) : undefined) : role.kind === "governor" ? role.party : file.person.party as keyof typeof PARTY_WORDS | undefined;
  const trend = file.dossier.loyaltyTrend;
  return (
    <>
      {standing ? (
        <Tag tone={standing[1]} icon={standing[2]}>
          {standing[0]}
        </Tag>
      ) : null}
      {party && PARTY_WORDS[party] ? <Tag><PartyMark party={party} size={18} />{party === "democrat" ? "Democratic Party" : party === "republican" ? "Republican Party" : "Independent"}</Tag> : null}
      {role.kind === "governor" ? <Tag><Flag name={role.stateName} src={stateFlagUrl(role.state)} height={16} decorative />{role.stateName}</Tag> : role.kind === "foreign" || role.kind === "foreign-leader" ? <Tag><Flag name={role.nationName} src={nationFlagUrl(role.nation)} height={16} decorative />{role.nationName}</Tag> : null}
      {file.dossier.nomination ? (
        <Tag tone="caution" icon="pending">
          Nominee
        </Tag>
      ) : null}
      {trend && trend.movedPoints !== 0 ? (
        <Tag tone={trend.movedPoints > 0 ? "action" : "risk"} icon={trend.movedPoints > 0 ? "favorable" : "adverse"}>
          Loyalty {trend.movedPoints > 0 ? "+" : "−"}
          {Math.abs(trend.movedPoints)} since seated
        </Tag>
      ) : null}
    </>
  );
}

/** A field of study as a reader writes it: "international-relations" is "International relations". */
function fieldWords(field: string): string {
  const words = field.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function vitalsOf(file: PersonFile): readonly Vital[] {
  const education = file.dossier.education;
  const standing = file.dossier.standing;
  return [
    { icon: "subjectPerson" as const, label: "Age", value: String(file.age) },
    ...(file.person.birthplace
      ? [
          {
            icon: "mapPin" as const,
            label: "From",
            value: file.person.birthplace,
          },
        ]
      : []),
    ...(education
      ? [
          {
            icon: "dossier" as const,
            label: education.postgraduate ? "Postgraduate" : "Studied",
            value: `${fieldWords(education.field)}, ${education.school}`,
          },
        ]
      : []),
    ...(standing.kind === "hill"
      ? [
          {
            icon: "subjectChamber" as const,
            label: "Caucus",
            value: standing.caucus,
          },
        ]
      : []),
    ...(file.dossier.nomination
      ? [
          {
            icon: "appoint" as const,
            label: "Nominated for",
            value: `${file.dossier.nomination.officeTitle}: ${file.dossier.nomination.standing.toLowerCase()}`,
          },
        ]
      : []),
    ...(file.dossier.faction
      ? [
          {
            icon: "layerBlocs" as const,
            label: "Faction",
            value: file.dossier.faction.name,
          },
        ]
      : []),
  ];
}

/** Pending service matters stay separate from qualitative staff assessments. */
function Attention({ file }: { readonly file: PersonFile }) {
  const trend = file.dossier.loyaltyTrend;
  const reasons = [
    ...(file.dossier.nomination ? [`Their nomination for ${file.dossier.nomination.officeTitle} is ${file.dossier.nomination.standing.toLowerCase()}.`] : []),
    ...(trend && trend.movedPoints < 0 ? [`Their loyalty has fallen since they were seated.`] : []),
  ];
  if (reasons.length === 0) return null;
  return (
    <section className="exec-attention" aria-labelledby="person-attention">
      <h2 id="person-attention" className="exec__heading">
        <Icon name="caution" size={20} /> Why this needs your attention
      </h2>
      <ul>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}

function Plate({ campaign, file }: { readonly campaign: Campaign; readonly file: PersonFile }) {
  return (
    <>
      <IdPlate reference={{ id: file.person.id, dated: formatDate(campaign.calendar) }}
        mark={<Portrait name={file.person.name} size="lg" redacted decorative />}
        post={file.role}
        tags={<PlateTags campaign={campaign} file={file} />}
        line={file.dossier.nomination ? `Nominated for ${file.dossier.nomination.officeTitle}` : file.seat ? file.seat.title : undefined}
      />
    </>
  );
}

function Faction({ file, n }: { readonly file: PersonFile; readonly n: number }) {
  const faction = file.dossier.faction;
  if (!faction) return null;
  const office = institutionForRole(faction.role)?.offices[0];
  return (
    <DossierSection id="person-faction" n={n} icon="layerBlocs" title="Faction">
      <p>
        They carry the badge of <strong>{faction.name}</strong>, {faction.members.length} strong, {faction.seated} still in your government.{" "}
        {office ? <Door href={place.office(office.id)}>Reconcile it from the {office.title}'s office</Door> : null}
      </p>
    </DossierSection>
  );
}

const TONE_MARK: Readonly<Partial<Record<ReturnType<typeof connectionTone>, IconName>>> = { favorable: "favorable", adverse: "adverse" };

const TIE_TONE: Readonly<Record<ReturnType<typeof connectionTone>, TagTone>> = {
  favorable: "good",
  adverse: "risk",
  neutral: "neutral",
};

/** Each tie as a row: the face, the name as a door, what kind of tie in its warmth, and why, in a line. Every tie is reachable. */
function Circle({ campaign, file, n, search, onSearch }: { readonly campaign: Campaign; readonly file: PersonFile; readonly n: number; readonly search?: RelationshipSearch; readonly onSearch?: (search: RelationshipSearch) => void }) {
  const [localSearch, setLocalSearch] = useState<RelationshipSearch>({});
  const state = search ?? localSearch;
  const update = (next: RelationshipSearch) => { if (onSearch) onSearch(next); else setLocalSearch(next); };
  const query = state.contact ?? "";
  const kind = state.evidence ?? "all";
  const rows = file.circle.filter((row) => (kind === "all" || (kind === "recorded" ? !!row.observed : !row.observed)) && `${row.otherName} ${row.edge.reason}`.toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <DossierSection id="person-circle" n={n} icon="layerBlocs" title="Public network" note={`${circleSummary(file.circle).replace(/\.?$/, ".")} The map starts with up to eight connected people and can expand; the list holds every tie.`}>
      <Field label="Find a contact">{(control) => <input {...control} type="search" className="ui-input" value={query} onChange={(event) => update({ ...state, contact: event.target.value })} />}</Field>
      <Field label="Relationship evidence">{(control) => <select {...control} className="ui-input" value={kind} onChange={(event) => update({ ...state, evidence: event.target.value === "recorded" ? "recorded" : event.target.value === "inferred" ? "inferred" : "all" })}><option value="all">All public evidence</option><option value="recorded">Recorded issue dialogue</option><option value="inferred">Inferred biography contacts</option></select>}</Field>
      <RelationshipNavigator campaign={campaign} file={{ ...file, circle: rows }} {...(search ? { search } : {})} {...(onSearch ? { onSearch } : {})} />
      <p className="hill-note">Dashed lines are inferred biography contacts. Solid arrows show recorded direction of issue dialogue. Node size shows recorded outgoing issue contacts, up to eight. Neither establishes private trust or a vote commitment.</p>
      <Collection
        items={rows}
        initial={6}
        noun="ties"
        className="person-circle"
        empty="No tie is on record."
        render={(row) => {
          const tone = connectionTone(row.edge.kind);
          return (
            <li key={`${row.otherId}:${row.edge.kind}`} className="person-tie ui-row-target" data-tone={tone}>
              <Portrait name={row.otherName} size="sm" redacted decorative />
              <div className="person-tie__body">
                <Door href={subjectHref({ kind: "person", id: row.otherId })} className="person-tie__name ui-row-link">
                  {row.otherName}
                </Door>
                <Tag tone={TIE_TONE[tone]} {...(TONE_MARK[tone] ? { icon: TONE_MARK[tone] } : {})}>
                  {row.observed ? "Recorded dialogue" : connectionKindLabel(row.edge.kind, row.subjectEnd)}
                </Tag>
                <p className="person-tie__why">{row.observed ? `Observed ${formatDate(row.observed.date)}. ${row.observed.direction} issue dialogue; confidence high for the conversation, no vote commitment. ` : "Inferred biography contact; trust and cooperation are unconfirmed. "}{row.edge.reason}</p>
              </div>
            </li>
          );
        }}
      />
    </DossierSection>
  );
}

/** The working life as bands along the years, then what they have done under this administration, each a door to its Record entry. */
function Career({ file, n }: { readonly file: PersonFile; readonly n: number }) {
  const before = file.career.filter((entry) => entry.key.startsWith("career:"));
  const during = file.career.filter((entry) => !entry.key.startsWith("career:"));
  return (
    <DossierSection id="person-career" n={n} icon="archive" title="Career" note={`${file.person.career.length} posts before this administration${during.length > 0 ? `, ${during.length} entries since` : ""}.`}>
      <CareerBands posts={file.person.career} age={file.age} labels={before.map((entry) => entry.text)} />
      {during.length > 0 ? (
        <ol className="person-career">
          {during.map((entry) => (
            <li key={entry.key} className={entry.eventId ? "ui-row-target" : undefined}>
              <Icon name="record" size={14} /> <span className="exec__when">{entry.when}</span> {entry.eventId ? <Door href={`/record/event/${encodeURIComponent(entry.eventId)}`} className="ui-row-link">{entry.text}</Door> : entry.text}
            </li>
          ))}
        </ol>
      ) : null}
    </DossierSection>
  );
}

const STANCE_MARK = {
  for: "approve",
  wary: "caution",
  against: "reject",
} as const satisfies Readonly<Record<keyof typeof STANCE_WORDS, IconName>>;

function Counsel({ file, n }: { readonly file: PersonFile; readonly n: number }) {
  return (
    <DossierSection id="person-counsel" n={n} icon="microphone" title="Counsel given">
      <Collection
        items={file.dossier.counsel}
        initial={6}
        noun="calls advised on"
        className="exec-record"
        empty="They have not advised you on a contested call yet."
        render={(row) => (
          <li key={row.entry.causal?.eventId ?? row.entry.turn} data-stance={row.stance} className={row.entry.causal ? "ui-row-target" : undefined}>
            <Icon name={STANCE_MARK[row.stance]} size={16} className="exec-record__mark" />
            <strong>{STANCE_WORDS[row.stance]}</strong>
            {row.primary ? " (theirs was the call)" : ""}: {row.entry.causal ? <Door href={`/record/event/${encodeURIComponent(row.entry.causal.eventId)}`} className="ui-row-link">{row.entry.description}</Door> : row.entry.description}
          </li>
        )}
      />
    </DossierSection>
  );
}

function PersonDesk({ campaign, file, onDone, view, onView, network, onNetwork }: { readonly campaign: Campaign; readonly file: PersonFile; readonly onDone: (done: ChairActDone) => void; readonly view: PersonView; readonly onView: (view: PersonView) => void; readonly network?: RelationshipSearch; readonly onNetwork?: (search: RelationshipSearch) => void }) {
  const acts = useChairActs(campaign, file.camera, onDone);
  const record = useMemo(() => personRecord(campaign, file.person.id as string), [campaign, file.person.id]);
  const hasActions = Boolean(file.dossier.nomination) || file.seat?.kind === "cabinet" || file.seat?.kind === "officer" || file.dossier.standing.kind === "hill";
  return <Screen title={file.person.name} eyebrow="Official profile" screenClass="workspace" measure="data" camera="keep">
    <div className="exec exec--person institutional-file">
      <Dossier kind="Personnel record" house={houseOf(file.dossier.standing)} asOf={formatDate(campaign.calendar)}>
        <Plate campaign={campaign} file={file} />
        {acts.problem ? <p className="exec__problem" role="alert">{acts.problem}</p> : null}
        <Tabs label="Profile workspace" selected={view} onSelect={(next) => onView(PERSON_VIEWS.find((value) => value === next) ?? "overview")} tabs={[{ id: "overview", label: "Operating profile", icon: "subjectPerson" }, { id: "network", label: "Public network", icon: "layerBlocs", count: file.circle.length }, { id: "career", label: "Career and counsel", icon: "record" }]}>
          {view === "overview" ? <div className="institutional-file__columns"><div>
            <DossierSection id="person-ratings" n={1} icon="layerReading" title="Assessed readings" note="Ordinal staff assessments. Select any reading for its evidence, confidence and modeled consequences."><PersonReadings readings={file.readings} title="Assessed qualities" titleHidden />{file.watch ? <p className="exec__note">Staff watch: {file.watch.line}</p> : null}</DossierSection>
            {record ? <RecordInOffice record={record} name={file.person.name} n={2} /> : null}
          </div><aside aria-label="Current responsibilities and actions"><Attention file={file} /><Card className="institutional-file__action-panel">{hasActions ? <PersonActs campaign={campaign} file={file} acts={acts} /> : <p className="exec__note">No direct personnel action is available for this profile. Recorded service and public relationships remain available in this workspace.</p>}</Card>{file.dossier.faction ? <Faction file={file} n={3} /> : null}</aside></div> : view === "network" ? <Circle campaign={campaign} file={file} n={1} {...(network ? { search: network } : {})} {...(onNetwork ? { onSearch: onNetwork } : {})} /> : <><Vitals items={vitalsOf(file)} label="Facts for this record" /><Career file={file} n={1} /><Counsel file={file} n={2} /></>}
        </Tabs>
      </Dossier>
    </div>
  </Screen>;
}

/** A person's dossier: who they are, how they read, who they know, what they have done, and the lever over their chair. */
export function PersonScreen({ campaign, id, view = "overview", onView = () => undefined, network, onNetwork }: { readonly campaign: Campaign; readonly id: string; readonly view?: PersonView; readonly onView?: (view: PersonView) => void; readonly network?: RelationshipSearch; readonly onNetwork?: (search: RelationshipSearch) => void }) {
  const [done, setDone] = useState<ChairActDone | undefined>();
  const file = useMemo(() => personFile(campaign, id), [campaign, id]);
  if (done)
    return (
      <ActReceipt
        done={done}
        back={{
          label: "Back to the dossier",
          onBack: () => setDone(undefined),
        }}
      />
    );
  if (!file) {
    return (
      <Screen title="No such person" eyebrow="Dossier" screenClass="workspace" camera="keep">
        <EmptyState icon="emptyCabinet" title="Nobody by that id is in this administration's world">
          <Door href={place.washington()}>Back to Washington</Door>
        </EmptyState>
      </Screen>
    );
  }
  return <PersonDesk campaign={campaign} file={file} onDone={setDone} view={view} onView={onView} {...(network ? { network } : {})} {...(onNetwork ? { onNetwork } : {})} />;
}
