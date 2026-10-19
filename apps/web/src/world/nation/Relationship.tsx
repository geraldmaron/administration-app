import { place, type CommitmentRow, type NationFile, type Standing } from "@admin/player-core";
import { Collection, Icon, Steps, StepsTable, type IconName } from "@admin/ui-web";
import { actHref } from "@admin/player-core";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { Place } from "./Place";
import { TieFlags } from "./CountryFigures";

const COMMITMENT_WORDS: Readonly<Record<CommitmentRow["kind"], string>> = {
  aid: "Aid",
  arms: "Arms",
  deployment: "Deployment",
  basing: "Basing",
  sustainment: "Sustainment",
  program: "Program",
};

const COMMITMENT_GLYPH: Readonly<Record<CommitmentRow["kind"], IconName>> = {
  aid: "instrumentAssistance",
  arms: "unitMissile",
  deployment: "unitGroundFormation",
  basing: "mapPin",
  sustainment: "unitTransportAircraft",
  program: "folder",
};

const MEASURE_GLYPH: Readonly<Record<string, IconName>> = {
  tariff: "subjectTrade",
  sanctions: "instrumentEconomic",
  "asset-restriction": "locked",
  "export-control": "statusBlocked",
  embargo: "statusBlocked",
};

function Band({ icon, label, band }: { readonly icon: IconName; readonly label: string; readonly band: NonNullable<Standing["tension"]> }) {
  return <Steps layout="row" icon={icon} label={label} lit={band.level} word={band.word} tone={toneOf(band.stance)} />;
}

/** What the head above the views does not already say: the common aims and the threat read. */
function StandingReadings({ file }: { readonly file: NationFile }) {
  const { standing } = file;
  if (!standing.aims && !standing.threat) return null;
  return (
    <StepsTable label="What else the services read of the relationship">
      {standing.aims ? <Band icon="summit" label="Common aims" band={standing.aims} /> : null}
      {standing.threat ? <Band icon="escalate" label="The threat you read in them" band={standing.threat} /> : null}
    </StepsTable>
  );
}

function Measures({ file }: { readonly file: NationFile }) {
  const { measures } = file.trade;
  return (
    <div className="country-group">
      <h3 className="country-group__heading">Measures in force</h3>
      {measures.length === 0 ? (
        <p className="brief-section__note">No tariff, sanction or embargo is in force between you.</p>
      ) : (
        <ul className="measure-list" aria-label="Measures in force">
          {measures.map((measure) => (
            <li key={measure.id} className="measure" data-origin={measure.ours ? "ours" : "theirs"}>
              <span className="row-glyph"><Icon name={MEASURE_GLYPH[measure.kind] ?? "subjectTrade"} size={20} /></span>
              <span className="measure__what">
                {measure.kindWord}
                {measure.rateText ? ` of ${measure.rateText}` : ""} on {measure.sectorName.toLowerCase()}
              </span>
              <span className="measure__since">{measure.ours ? "Yours" : "Their answer"}, since {measure.since}</span>
              {measure.ours ? (
                <Door href={actHref(file.nation, { manage: measure.id })} className="measure__lift">
                  Lift it
                </Door>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Commitments({ file }: { readonly file: NationFile }) {
  if (file.commitments.length === 0) return null;
  return (
    <div className="country-group">
      <h3 className="country-group__heading">What you have committed to them</h3>
      <ul className="commitment-list" aria-label="Commitments toward this government">
        {file.commitments.map((commitment) => (
          <li key={commitment.id} className="commitment" data-status={commitment.status}>
            <span className="row-glyph"><Icon name={COMMITMENT_GLYPH[commitment.kind]} size={20} /></span>
            <span className="commitment__kind">{COMMITMENT_WORDS[commitment.kind]}</span>
            <span className="commitment__why">{commitment.rationale}</span>
            <span className="commitment__status">{commitment.status === "wound-down" ? "Wound down" : commitment.status.charAt(0).toUpperCase() + commitment.status.slice(1)}</span>
          </li>
        ))}
      </ul>
      <Door href={place.security()} className="country-act-link">
        Manage commitments in national security
      </Door>
    </div>
  );
}

function Ties({ file }: { readonly file: NationFile }) {
  return (
    <div className="country-group">
      <h3 className="country-group__heading">Its ties to others</h3>
      {file.ties.length > 0 ? <TieFlags ties={file.ties} limit={999} /> : <p className="brief-section__note">No close partner or rival stands out.</p>}
      <p className="country-unread"><Icon name="hidden" size={16} /> Some relationships between other governments may be unknown.</p>
    </div>
  );
}

function Organizations({ file }: { readonly file: NationFile }) {
  return (
    <div className="country-group">
      <h3 className="country-group__heading">Organizations</h3>
      <Collection
        items={file.organizations}
        initial={8}
        noun="organizations"
        className="org-list org-chips"
        render={(org) => (
          <li key={org.id}>
            <Place href={org.href}>
              <Icon name="building" size={16} /> {org.name}
            </Place>
          </li>
        )}
        empty="It sits in no organization the game tracks."
      />
    </div>
  );
}

/** Standing both ways, rapport and the envoy, the measures in force, what has been promised, and who it keeps company with. */
export function DiplomacyView({ file }: { readonly file: NationFile }) {
  return (
    <div className="country-view">
      <StandingReadings file={file} />
      {file.rapport ? <p className="country-line">{file.rapport}</p> : null}
      <p className="country-line">{file.envoy.line}</p>
      <Measures file={file} />
      <Commitments file={file} />
      <Ties file={file} />
      <Organizations file={file} />
    </div>
  );
}
