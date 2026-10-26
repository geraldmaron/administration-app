import { useMemo, useState } from "react";
import { appointActing, appointmentPool, dismissMinister, institutionDef, projectDismissal, selectNominationForOffice, selectPerson, type Campaign } from "@admin/engine";
import { actingShortlist, appointmentDesk, costLines, deskPlan, type OfficeFile, type ShortlistOption } from "@admin/player-core";
import type { PersonId, RoleId } from "@admin/world";
import { Tag, Button, Column, LegalCitation, Row, Surface, Text } from "@admin/ui";
import { ChoiceList } from "@admin/ui/forms";
import { ResultRow, ResultsList, Waiting } from "@admin/ui/review";
import { BandSteps } from "@admin/ui/dossier";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { ActCompare } from "./ActCompare";
import type { ChairActs } from "./acts";
import { chairActsFor, type FillAct } from "./office-view";
import { actCitation, cellWords, stanceTone } from "./present";
import { CardLabel } from "./parts";

const WHOLE_BENCH = Number.MAX_SAFE_INTEGER;

function Dismiss({ campaign, role, file, acts }: { readonly campaign: Campaign; readonly role: RoleId; readonly file: OfficeFile; readonly acts: ChairActs }) {
  const projection = projectDismissal(campaign, role);
  const name = file.holderName ?? "The holder";
  const options = [
    { id: "dismiss", label: `Dismiss ${name}`, ...(projection.ok ? { price: { cost: projection.cost, risks: projection.risks } } : { unavailable: projection.reason }) },
  ];
  return (
    <ActCompare
      campaign={campaign}
      title={`Dismiss ${name}`}
      options={options}
      verbs={{ dismiss: `Dismiss ${name}` }}
      onAuthorize={() => acts.run(`${name} dismissed`, () => dismissMinister(campaign, role), { tier: "full", title: `Dismiss ${name}`, verb: "Confirm the dismissal", danger: true, law: "dismiss" }, [{ label: "Chair", value: file.office.title }])}
      busy={acts.busy}
      danger
      law="dismiss"
    />
  );
}

function FillPrompt({ text, verb, onPress, law }: { readonly text: string; readonly verb: string; readonly onPress: () => void; readonly law: "nominate" | "acting" }) {
  const openLaw = useOpenAuthority();
  const citation = actCitation(law);
  return (
    <Surface level="raised" pad="md" accentEdge="accent">
      <Column gap="sm">
        <Text variant="body">{text}</Text>
        <LegalCitation citation={citation} onPress={() => openLaw(citation.cite)} />
        <Row>
          <Button kind="primary" icon="appoint" onPress={onPress}>
            {verb}
          </Button>
        </Row>
      </Column>
    </Surface>
  );
}

/** What the President can do about the chair itself: fill it from a shortlist, name somebody to act in it, or empty it, each compared before it is done. */
export function ChairActsPanel({ campaign, file, acts, onFill }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: ChairActs; readonly onFill: (act: FillAct) => void }) {
  const available = chairActsFor(file);
  const role = file.institution.cabinetRole;
  if (available.length === 0) return null;
  const bench = available.includes("appoint") ? appointmentPool(campaign, file.office.id).length : 0;
  const pending = available.includes("appoint") ? selectNominationForOffice(campaign, file.office.id) : undefined;
  const nominee = pending ? (selectPerson(campaign, pending.nominee)?.base.name ?? "A nominee") : undefined;
  return (
    <Column gap="md" role="region" aria-label="Chair actions">
      {available.includes("dismiss") && role ? <Dismiss campaign={campaign} role={role} file={file} acts={acts} /> : null}
      {nominee ? <Text variant="body">{`The Senate is considering ${nominee} for ${file.office.title}.`}</Text> : null}
      {available.includes("appoint") && !nominee ? <FillPrompt text={bench > 0 ? `${bench} ${bench === 1 ? "person meets" : "people meet"} the rules for this job and could be sent to the Senate for approval.` : "Nobody meets the rules for this job right now, so there's no one to send to the Senate."} verb="Compare the candidates" onPress={() => onFill("appoint")} law="nominate" /> : null}
      {available.includes("acting") && !available.includes("appoint") ? <FillPrompt text="While this job is empty, the law lets someone fill in as the acting head." verb="Compare who could fill in" onPress={() => onFill("acting")} law="acting" /> : null}
    </Column>
  );
}

function ActingTerms({ shortlist, picked }: { readonly shortlist: ReturnType<typeof actingShortlist>; readonly picked: ShortlistOption }) {
  const index = shortlist.options.indexOf(picked);
  return (
    <Column gap="xs" maxWidth={720}>
      {shortlist.rows.map((row) => {
        const cell = row.cells[index];
        if (cell?.kind === "band") return <BandSteps key={row.id} label={row.label} lit={cell.judgment.band + 1} word={cell.judgment.word} tone={stanceTone(cell.judgment.stance)} />;
        const words = cellWords(cell);
        return (
          <Row key={row.id} gap="md" between wrap>
            <Text variant="caption" tone="secondary">
              {row.label}
            </Text>
            <Text variant="label">{words.text}</Text>
          </Row>
        );
      })}
    </Column>
  );
}

function Acting({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: ChairActs }) {
  const role = file.institution.cabinetRole;
  const parent = file.institution.parent ? institutionDef(file.institution.parent)?.cabinetRole : undefined;
  const seat = role ?? file.office.id;
  const shortlist = useMemo(() => actingShortlist(campaign, seat, role ?? parent, file.office.actingLimitDays, WHOLE_BENCH), [campaign, seat, role, parent, file.office.actingLimitDays]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  if (shortlist.options.length === 0) return <Text variant="body">Nobody available could fill in for this job today.</Text>;
  const picked = shortlist.options.find((option) => option.id === selected);
  const authorize = (person: PersonId, name: string) => acts.run(`${name} named acting ${file.office.title}`, () => appointActing(campaign, seat, person), { tier: "confirm", title: `Name ${name} acting ${file.office.title}`, law: "acting" }, [{ label: "Chair", value: file.office.title }]);
  const closed = !picked || picked.unavailable !== undefined || !picked.person;
  return (
    <Column gap="md">
      <Text variant="title" role="heading" aria-level={3}>{`Who could fill in: ${shortlist.options.length} ${shortlist.options.length === 1 ? "person" : "people"}, best fit first`}</Text>
      <Waiting text={shortlist.waiting} />
      <ResultsList label="Who could fill in">
        {shortlist.options.map((option) => (
          <ResultRow
            key={option.id}
            label={option.label}
            icon="subjectPerson"
            selected={option.id === selected}
            onPress={() => setSelected(option.id)}
            pressLabel={option.label}
            {...(option.unavailable ? { locked: { word: "Locked" }, below: <Text variant="caption" tone="warning">{`Not available right now. ${option.unavailable}`}</Text> } : option.id === selected ? { below: <ActingTerms shortlist={shortlist} picked={option} /> } : {})}
          />
        ))}
      </ResultsList>
      <Surface level="raised" pad="md" role="status" aria-live="polite">
        <Column gap="sm">
          <Text variant="caption" tone="secondary">{!picked ? "No one is named yet." : picked.unavailable ? `Not available right now. ${picked.unavailable}` : `${picked.label} starts filling in today. An acting head can sign for the office but doesn't have the full authority of a confirmed one.`}</Text>
          <Row>
            <Button kind="primary" icon="review" disabled={closed || acts.busy} onPress={() => picked?.person && authorize(picked.person, picked.label)}>
              Name them acting head
            </Button>
          </Row>
        </Column>
      </Surface>
    </Column>
  );
}

function Candidate({ candidate }: { readonly candidate: ReturnType<typeof appointmentDesk>["seats"][number]["candidates"][number] }) {
  return (
    <Column gap="xs">
      <Row gap="xs" wrap>
        <Tag tone="outline">{`Fit: ${candidate.fit}`}</Tag>
        <Tag tone={candidate.vote.yeas > candidate.vote.nays ? "success" : "warning"}>{`Likely Senate vote ${candidate.vote.yeas}–${candidate.vote.nays}`}</Tag>
        {candidate.crossesAisle ? <Tag tone="info">From the other party</Tag> : null}
      </Row>
      {candidate.readings.map((reading) => (
        <BandSteps key={reading.attribute} label={reading.label} lit={reading.band + 1} word={reading.word} tone={stanceTone(reading.stance)} />
      ))}
      <Text variant="caption" tone="secondary">
        {candidate.why}
      </Text>
      {candidate.objections.length ? <Text variant="caption" tone="warning">{`Objections: ${candidate.objections.join("; ")}`}</Text> : null}
      {candidate.vetting.length ? <Text variant="caption" tone="tertiary">{`The background check will turn up: ${candidate.vetting.join("; ")}`}</Text> : null}
    </Column>
  );
}

/** The one seat as the appointments desk draws it: the people its rules allow, ranked by fit, and one name sent to the Senate. */
function Nominate({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: ChairActs }) {
  const seat = useMemo(() => appointmentDesk(campaign, (entry) => entry.office === file.office.id).seats[0], [campaign, file.office.id]);
  const [person, setPerson] = useState<string | undefined>(seat?.recommended);
  if (!seat || seat.candidates.length === 0) return <Text variant="body">{`There's no one you can nominate for ${file.office.title} today.`}</Text>;
  const picked = seat.candidates.find((candidate) => candidate.personId === person);
  const plan = picked ? deskPlan(campaign, [{ office: seat.office, person: picked.personId }]) : undefined;
  const send = () => {
    if (!plan || !picked) return;
    acts.run(`${picked.name} nominated`, () => (plan.packets.length > 0 ? { ok: true, packet: plan.packets } : { ok: false, reason: plan.refused[0]?.reason ?? "The nomination couldn't be sent." }), { tier: "full", title: `Nominate ${picked.name}`, verb: "Confirm and nominate", law: "nominate" }, [{ label: seat.title, value: picked.name }, { label: "What happens next", value: "A background check, then a Senate committee, then a vote of the full Senate" }, { label: "Charged", value: costLines(plan.cost).join(", ") || "Nothing" }]);
  };
  return (
    <Column gap="md">
      <Text variant="title" role="heading" aria-level={3}>{`${seat.eligible} ${seat.eligible === 1 ? "person qualifies" : "people qualify"} for ${seat.title}. Here are the best ${seat.candidates.length}.`}</Text>
      <ChoiceList label="Who to nominate" legendHidden value={person} onChange={setPerson} minCardWidth={260} options={seat.candidates.map((candidate) => ({ value: candidate.personId, label: candidate.name, detail: candidate.unavailable ? `Not available right now. ${candidate.unavailable}` : candidate.why, disabled: candidate.unavailable !== undefined }))} />
      {picked ? (
        <Surface level="raised" pad="md" role="status" aria-live="polite">
          <Column gap="sm">
            <CardLabel icon="subjectPerson">{`Details for ${picked.name}`}</CardLabel>
            <Candidate candidate={picked} />
            <Text variant="caption" tone="secondary">Your pick starts a background check today. Nobody takes the job until the Senate votes.</Text>
            <Row>
              <Button kind="primary" icon="appoint" disabled={acts.busy || !plan || plan.packets.length === 0} onPress={send}>
                Send the nomination
              </Button>
            </Row>
          </Column>
        </Surface>
      ) : null}
    </Column>
  );
}

const ACT_WORDS: Readonly<Record<FillAct, string>> = { appoint: "Nominate a replacement", acting: "Name someone to fill in" };

/** Filling the chair: the way to fill it, the law that allows it, and the people compared before one is chosen. */
export function FillChair({ campaign, file, acts, act, onAct }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: ChairActs; readonly act: FillAct; readonly onAct: (act: FillAct) => void }) {
  const openLaw = useOpenAuthority();
  const available = chairActsFor(file).filter((entry): entry is FillAct => entry !== "dismiss");
  const law = actCitation(act === "appoint" ? "nominate" : "acting");
  return (
    <Column gap="lg">
      {available.length > 1 ? <ChoiceList label="How to fill the job" value={act} onChange={onAct} options={available.map((value) => ({ value, label: ACT_WORDS[value], icon: value === "appoint" ? "appoint" : "pending" }))} /> : null}
      <LegalCitation citation={law} onPress={() => openLaw(law.cite)} />
      {act === "appoint" ? <Nominate campaign={campaign} file={file} acts={acts} /> : <Acting campaign={campaign} file={file} acts={acts} />}
    </Column>
  );
}
