import type { Campaign } from "@admin/engine";
import { chairRead, type OfficeFile } from "@admin/player-core";
import { Portrait } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { ReadBadge } from "../../shell/dossier/ChairRead";
import { InstitutionMark, NomineeBadge, StaffingBadge } from "./StaffingBadge";
import { rosterRowsOf, type RosterRow } from "./roster";
import "./office-visual.css";

function Head({ file }: { readonly file: OfficeFile }) {
  return (
    <div className="org-head" data-staffing={file.staffing}>
      <InstitutionMark institution={file.institution.id} emblem={file.emblem} size={28} />
      <div>
        <p className="org-head__name">{file.name}</p>
        <p className="org-head__who">{file.holderName ?? "Nobody in the chair"}</p>
      </div>
      {file.holder ? <Portrait name={file.holderName ?? "Officer"} size="sm" redacted decorative /> : null}
      <StaffingBadge staffing={file.staffing} />
    </div>
  );
}

function Unit({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const { node } = row;
  const person = node.holder ? campaign.people[node.holder]?.base : undefined;
  return (
    <li className="org-unit ui-card-door" data-staffing={node.staffing} data-alert={node.alerts.length > 0 ? "true" : undefined}>
      <div className="org-unit__top">
        <InstitutionMark institution={node.institution} emblem={node.emblem} size={28} />
        <Door href={node.href} className="org-unit__name ui-card-door__link">
          {node.name}
        </Door>
      </div>
      <div className="org-unit__holder">
        {node.holder ? <Portrait name={node.holderName ?? "Officer"} size="sm" redacted decorative /> : null}
        <div>
          <p className="org-unit__who">{node.holderName ?? "No one in the chair"}</p>
          <p className="org-unit__title">{node.title}</p>
        </div>
      </div>
      <div className="org-unit__foot">
        {node.staffing === "confirmed" ? null : <StaffingBadge staffing={node.staffing} />}
        {row.nominee ? <NomineeBadge nominee={row.nominee} /> : null}
        {person ? <ReadBadge read={chairRead(person)} /> : null}
      </div>
      {node.alerts.length > 0 ? (
        <p className="org-unit__alert" role="note">
          {node.alerts[0]!.text}
        </p>
      ) : null}
    </li>
  );
}

/** The agencies under an office drawn as the chart they are: the chair on top, a card per agency under it with its head's face, how the chair is held and the read of its holder. */
export function OfficeChart({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  const rows = rosterRowsOf(campaign, file.agencies);
  if (rows.length === 0) return <section className="org" aria-label="Organizational scope"><h2 className="exec__heading">Organizational scope</h2><p className="exec__note">No subordinate agency offices are attached to this chair in the current dataset.</p></section>;
  return (
    <section aria-labelledby="exec-agencies" className="org">
      <h2 id="exec-agencies" className="exec__heading">
        Agencies under it
      </h2>
      <Head file={file} />
      <ul className="org-units" aria-label={`${rows.length} agencies under ${file.name}`}>
        {rows.map((row) => (
          <Unit key={row.node.office} campaign={campaign} row={row} />
        ))}
      </ul>
    </section>
  );
}
