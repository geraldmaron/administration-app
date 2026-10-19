import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { underWayAgainst, type NationFile } from "@admin/player-core";
import { Collection, Icon, Steps, StepsTable } from "@admin/ui-web";
import { TEMPERAMENT_WORD } from "./country-glyphs";
import { UnderWay } from "./ActUnderWay";

/** What the services read of the government: what it is after, how it decides, what it runs at home, and how its press covers you. */
export function IntelligenceView({ file }: { readonly file: NationFile }) {
  const { posture, program } = file;
  return (
    <div className="country-view">
      <div className="country-group">
        <h3 className="country-group__heading">What it is after</h3>
        {posture.unread ? (
          <p className="brief-section__note">The services have no read on this government's aims.</p>
        ) : (
          <ul className="aim-list" aria-label="Aims">
            {posture.aims.map((aim) => (
              <li key={aim}>
                <span className="row-glyph"><Icon name="intel" size={16} /></span>
                <span>{aim}</span>
              </li>
            ))}
          </ul>
        )}
        {posture.temperament.length > 0 ? (
          <StepsTable label="Temperament against the world's">
            {posture.temperament.map((reading) => (
              <Steps layout="row" key={reading.axis} label={reading.axis.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase())} lit={reading.level} steps={5} word={TEMPERAMENT_WORD[reading.level]} caption={reading.text} />
            ))}
          </StepsTable>
        ) : null}
        {posture.temperamentSource ? <p className="brief-section__note">{posture.temperamentSource}</p> : null}
      </div>
      <div className="country-group">
        <h3 className="country-group__heading">What it runs at home</h3>
        <ul className="program-list" aria-label="Program">
          {program.rows.map((row) => (
            <li key={row.domain}>
              <span className="program__domain">{row.domainName}</span> <span className="program__stance">{row.stanceName}</span>
            </li>
          ))}
        </ul>
        <p className="brief-section__note">
          {program.lastChange ? `${program.lastChange.when}: ${program.lastChange.headline} ` : ""}
          It reviews its program {program.reviewInWeeks === 0 ? "this week" : `in ${program.reviewInWeeks} ${program.reviewInWeeks === 1 ? "week" : "weeks"}`}.
        </p>
      </div>
      {file.coverage ? (
        <div className="country-group">
          <h3 className="country-group__heading">How their press covers you</h3>
          <p className="country-line">{file.coverage.caption}</p>
          {file.coverage.piece ? (
            <p className="brief-section__note">
              {file.coverage.piece.outlet}: {file.coverage.piece.lede}
            </p>
          ) : null}
        </div>
      ) : null}
      {file.provenance ? <p className="brief-section__note">{file.provenance}</p> : null}
    </div>
  );
}

/** What you have moving against this government, then what it has done lately, newest first, with its reasons where the services can read them. */
export function ActivityView({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const underway = useMemo(() => underWayAgainst(campaign, file.nation), [campaign, file.nation]);
  return (
    <div className="country-view">
      <UnderWay nation={file.nation} rows={underway} />
      <div className="country-group">
        <h3 className="country-group__heading">Recent moves by {file.name}</h3>
        <Collection
          items={file.recent}
          initial={6}
          noun="moves"
          className="move-list"
          render={(move) => (
            <li key={`${move.turn}:${move.headline}`}>
              <p className="move-list__headline">{move.headline}</p>
              <p className="move-list__when">{move.when}</p>
              {move.reasons.map((reason) => (
                <p key={reason.key} className="move-list__why">
                  {reason.text}
                </p>
              ))}
            </li>
          )}
          empty="No move by this government has reached the wire lately."
        />
      </div>
    </div>
  );
}
