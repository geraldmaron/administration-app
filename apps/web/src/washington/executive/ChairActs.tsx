import { useMemo } from "react";
import {
  appointActing,
  appointmentPool,
  dismissMinister,
  institutionDef,
  projectDismissal,
  seatKindOf,
  selectNominationForOffice,
  selectPerson,
  type Campaign,
} from "@admin/engine";
import { actingShortlist, type ModelingAct, type OfficeFile, type Shortlist } from "@admin/player-core";
import type { PersonId, RoleId } from "@admin/world";
import { Button, Choice } from "@admin/ui-web";
import { Screen } from "../../shell/Screen";
import { ActCompare } from "./ActCompare";
import { CandidateRoster } from "./CandidateRoster";
import { AppointmentDesk } from "../appointments/AppointmentDesk";
import type { useChairActs } from "./acts";

type Acts = ReturnType<typeof useChairActs>;
type ChairAct = "appoint" | "acting" | "dismiss";

const ACT_WORDS: Readonly<Record<ChairAct, string>> = {
  appoint: "Nominate a successor",
  acting: "Name an acting officer",
  dismiss: "Dismiss the holder",
};

/** Whether this is a seat the Senate confirms, at the top of its body: the seats the appointments desk fills. */
function nominable(file: OfficeFile): boolean {
  return seatKindOf(file.office.id) !== undefined && file.institution.offices[0]?.id === file.office.id;
}

/** Which acts the chair carries today, from the office's own lever, whether the Senate confirms it, and who is in it. */
function actsFor(file: OfficeFile): readonly ChairAct[] {
  if (file.staffing === "confirmed") return file.lever === "cabinet" ? ["dismiss"] : [];
  const acting = file.lever !== "none" && file.office.actingAuthority !== "none" && file.office.actingAuthority !== "board-quorum";
  return [...(nominable(file) ? (["appoint"] as const) : []), ...(acting ? (["acting"] as const) : [])];
}

const WHOLE_BENCH = Number.MAX_SAFE_INTEGER;

function ActingCompare({ campaign, shortlist, onAuthorize, busy, projectAs }: { readonly campaign: Campaign; readonly shortlist: Shortlist; readonly onAuthorize: (person: PersonId, name: string) => void; readonly busy: boolean; readonly projectAs: (person: PersonId) => ModelingAct }) {
  return (
    <CandidateRoster
      campaign={campaign}
      shortlist={shortlist}
      title="Compare who could act"
      noun="candidate"
      verb="Name them acting"
      review={(option) => `${option.label} signs for the office from today, without its mandate.`}
      onAuthorize={(option) => option.person && onAuthorize(option.person, option.label)}
      busy={busy}
      projectAs={projectAs}
    />
  );
}

/**
 * The seat as the appointments desk draws it: the same row, the same review, one seat.
 * The desk stays mounted once its name is sent, so the receipt it holds outlives the seat leaving its list.
 */
function Appoint({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  const pending = selectNominationForOffice(campaign, file.office.id);
  const nominee = pending ? (selectPerson(campaign, pending.nominee)?.base.name ?? "A nominee") : undefined;
  return (
    <AppointmentDesk
      campaign={campaign}
      scope={{ office: file.office.id }}
      headingId="fill-appointments"
      empty={nominee ? `${nominee}’s nomination for ${file.office.title} is before the Senate.` : `Nobody can be sent up for ${file.office.title} today.`}
    />
  );
}

function Acting({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: Acts }) {
  const role = file.institution.cabinetRole;
  const parent = file.institution.parent ? institutionDef(file.institution.parent)?.cabinetRole : undefined;
  const seat = role ?? file.office.id;
  const shortlist = useMemo(() => actingShortlist(campaign, seat, role ?? parent, file.office.actingLimitDays, WHOLE_BENCH), [campaign, seat, role, parent, file.office.actingLimitDays]);
  if (shortlist.options.length === 0) return <p className="exec__note">Nobody free on the bench could act in this chair today.</p>;
  const authorize = (person: PersonId, name: string) =>
    void acts.run(`${name} named acting ${file.office.title}`, () => appointActing(campaign, seat, person), { tier: "confirm", title: `Name ${name} acting ${file.office.title}` }, [{ label: "Chair", value: file.office.title }]);
  return <ActingCompare campaign={campaign} shortlist={shortlist} onAuthorize={authorize} busy={acts.busy} projectAs={(person) => ({ act: "acting", seat, person })} />;
}

function Dismiss({ campaign, role, file, acts }: { readonly campaign: Campaign; readonly role: RoleId; readonly file: OfficeFile; readonly acts: Acts }) {
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
      onAuthorize={() => void acts.run(`${name} dismissed`, () => dismissMinister(campaign, role), { tier: "full", title: `Dismiss ${name}`, verb: "Confirm the dismissal", danger: true }, [{ label: "Chair", value: file.office.title }])}
      busy={acts.busy}
      tone="danger"
      acts={{ dismiss: { act: "dismiss", role } }}
    />
  );
}

export type FillAct = Exclude<ChairAct, "dismiss">;

/** The shortlist, which needs the room a matrix of people takes: the screen becomes a workspace while it is open. */
export function FillChair({ campaign, file, acts, act, onAct, onClose }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: Acts; readonly act: FillAct; readonly onAct: (act: FillAct) => void; readonly onClose: () => void }) {
  const available = actsFor(file).filter((entry): entry is FillAct => entry !== "dismiss");
  return (
    <Screen icon="appoint" title={`Fill the chair: ${file.office.title}`} eyebrow={file.name} lede={file.holderName ? `${file.holderName} is acting in it today.` : "Nobody is in it today."} screenClass="workspace" camera="keep">
      <div className="exec exec--fill">
        {available.length > 1 ? <Choice legend="How to fill it" options={available.map((value) => ({ value, label: ACT_WORDS[value] }))} value={act} onChange={onAct} /> : null}
        {acts.problem ? (
          <p className="exec__problem" role="alert">
            {acts.problem}
          </p>
        ) : null}
        {act === "appoint" ? <Appoint campaign={campaign} file={file} /> : null}
        {act === "acting" ? <Acting campaign={campaign} file={file} acts={acts} /> : null}
        <p>
          <Button kind="secondary" size="sm" onClick={onClose}>
            Back to the office
          </Button>
        </p>
      </div>
    </Screen>
  );
}

/** What the President can do about the chair itself: fill it from a shortlist, name somebody to act in it, or empty it, each compared before it is done. */
export function ChairActs({ campaign, file, acts, onFill }: { readonly campaign: Campaign; readonly file: OfficeFile; readonly acts: Acts; readonly onFill: (act: FillAct) => void }) {
  const available = actsFor(file);
  const role = file.institution.cabinetRole;
  if (available.length === 0) return null;
  const bench = available.includes("appoint") ? appointmentPool(campaign, file.office.id).length : 0;
  const pending = available.includes("appoint") ? selectNominationForOffice(campaign, file.office.id) : undefined;
  const nominee = pending ? (selectPerson(campaign, pending.nominee)?.base.name ?? "A nominee") : undefined;
  return (
    <section className="exec-acts" aria-label="Chair actions">
      {available.includes("dismiss") && role ? <Dismiss campaign={campaign} role={role} file={file} acts={acts} /> : null}
      {nominee ? <p className="exec__note">{nominee}&rsquo;s nomination for {file.office.title} is before the Senate.</p> : null}
      {available.includes("appoint") && !nominee ? (
        <div className="exec-fill">
          <p className="exec__note">{bench > 0 ? `${bench} ${bench === 1 ? "person" : "people"} the seat's rules allow could be sent to the Senate for it.` : "Nobody the seat's rules allow can be sent up for it today."}</p>
          <Button kind="primary" onClick={() => onFill("appoint")}>
            Compare the candidates
          </Button>
        </div>
      ) : null}
      {available.includes("acting") && !available.includes("appoint") ? (
        <div className="exec-fill">
          <p className="exec__note">The law lets somebody act in this chair while it is empty.</p>
          <Button kind="primary" onClick={() => onFill("acting")}>
            Compare who could act
          </Button>
        </div>
      ) : null}
    </section>
  );
}
