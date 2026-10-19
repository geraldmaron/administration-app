import { useId, useState } from "react";
import { chairRead, roleTitle } from "@admin/player-core";
import { ReadBadge } from "../../shell/dossier/ChairRead";
import { Icon, type IconName } from "@admin/ui-web";
import { withSeat, type FoundingDraft, type ResolvedFounding } from "../draft";
import { CandidateCard, Commits, PersonFace } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

/** Each chair's department glyph. */
const DEPARTMENT_GLYPH: Readonly<Record<string, IconName>> = {
  "role-foreign-minister": "departmentState",
  "role-treasury-minister": "departmentTreasury",
  "role-defense-minister": "departmentDefense",
  "role-attorney-general": "departmentJustice",
  "role-interior-minister": "departmentInterior",
  "role-agriculture-secretary": "sectorAgriculture",
  "role-commerce-secretary": "departmentCommerce",
  "role-labor-secretary": "departmentLabor",
  "role-health-secretary": "departmentHealthHumanServices",
  "role-housing-secretary": "departmentHousingUrban",
  "role-transportation-secretary": "departmentTransportation",
  "role-energy-secretary": "departmentEnergy",
  "role-education-secretary": "departmentEducation",
  "role-veterans-secretary": "departmentVeteransAffairs",
  "role-homeland-secretary": "departmentHomelandSecurity",
  "role-intelligence-director": "departmentNationalSecurity",
};

function glyphFor(role: string): IconName {
  return DEPARTMENT_GLYPH[role] ?? "building";
}

function Seats({ resolved, selected, onSelect }: { readonly resolved: ResolvedFounding; readonly selected: string; readonly onSelect: (role: string) => void }) {
  const titles = resolved.seats.charter.roleTitles;
  return (
    <ul className="seats" aria-label="The cabinet's chairs">
      {resolved.seats.departments.map((role) => {
        const id = resolved.seated.cabinet[role as string];
        const person = resolved.cabinetSlates[role as string]?.find((row) => row.person.id === id)?.person;
        const title = roleTitle(role as string, titles);
        return (
          <li key={role}>
            <button type="button" className="seat" aria-pressed={selected === role} onClick={() => onSelect(role as string)}>
              <Icon name={glyphFor(role as string)} size={20} className="seat__glyph" />
              <span className="seat__text">
                <span className="seat__title">{title}</span>
                <span className="seat__name">{person?.name ?? "Vacant"}</span>
                {person ? <ReadBadge read={chairRead(person)} /> : null}
              </span>
              {person ? <PersonFace person={person} size="sm" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Shortlist({ role, resolved, update }: { readonly role: string; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const name = useId();
  const slate = resolved.cabinetSlates[role] ?? [];
  return (
    <fieldset className="candidates">
      <legend className="candidates__post">
        <Icon name={glyphFor(role)} size={22} />
        <span className="candidates__title">Shortlist for {roleTitle(role, resolved.seats.charter.roleTitles)}</span>
      </legend>
      {slate.map((candidate) => {
        const read = chairRead(candidate.person);
        return (
          <CandidateCard
            key={candidate.person.id}
            name={name}
            person={candidate.person}
            checked={resolved.seated.cabinet[role] === candidate.person.id}
            onChoose={() => update((current) => withSeat(current, role, candidate.person.id))}
            fit={candidate.band}
            crossesTheAisle={candidate.crossesTheAisle}
            extra={
              // The card is itself the radio, so the reason is said on it rather than behind a button.
              <span className="candidate__read">
                <ReadBadge read={read} />
                {read.tone === "good" ? null : <span className="candidate__read-why">{read.reason}</span>}
              </span>
            }
          />
        );
      })}
    </fieldset>
  );
}

/** Every chair, and the chosen chair's shortlist beside it. */
export function CabinetStage({ resolved, update }: { readonly resolved: ResolvedFounding; readonly update: Update }) {
  const [selected, setSelected] = useState<string>(() => resolved.seats.departments[0] as string);
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Each secretary needs the Senate's vote to take the chair. Whoever you seat runs the department until you replace them.</Commits>
        <Seats resolved={resolved} selected={selected} onSelect={setSelected} />
      </div>
      <div className="stage-grid__side">
        <Shortlist role={selected} resolved={resolved} update={update} />
      </div>
    </div>
  );
}
