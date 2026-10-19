import type { NationFile } from "@admin/player-core";
import { Collection, Icon, Steps, StepsTable } from "@admin/ui-web";
import { FORCE_STEPS } from "./country-glyphs";
import { HoldingsTable } from "../forces/HoldingsTable";

/** Its forces as bands, never headcounts; the counts print only where the services read the government and the dataset holds an order of battle. */
export function SecurityView({ file }: { readonly file: NationFile }) {
  const { forces, presence } = file;
  return (
    <div className="country-view">
      {forces.warfighting ? (
        <p className="country-line">
          A force of the {forces.warfighting.label.toLowerCase()} class. {forces.warfighting.sustains}
        </p>
      ) : null}
      <StepsTable label="Forces by domain">
        {forces.strip.map((domain) => (
          <Steps layout="row" key={domain.domain} label={domain.label} lit={FORCE_STEPS[domain.band]} steps={5} word={domain.band} />
        ))}
      </StepsTable>
      {forces.nuclear ? (
        <p className="country-line">
          <Icon name="escalate" size={16} /> {forces.nuclear.band}
          {forces.nuclear.warheads !== undefined ? `, with ${forces.nuclear.warheads.toLocaleString("en-US")} warheads declared` : ""}.
        </p>
      ) : null}
      {forces.counted.length > 0 ? (
        <div className="country-group">
          <h3 className="country-group__heading">What {file.name} fields, by asset</h3>
          <HoldingsTable holdings={forces.counted} caption={`What ${file.name} fields, by asset`} />
        </div>
      ) : null}
      {forces.inferred.length > 0 ? (
        <p className="brief-section__note">
          {forces.read ? "No order of battle is on file for " : "The services have no read on "}
          {forces.inferred.map((domain) => domain.label.toLowerCase()).join(", ")}; the bands above are inferred.
        </p>
      ) : null}
      <div className="country-group">
        <h3 className="country-group__heading">US forces in {file.name}</h3>
        <Collection
          items={presence}
          initial={8}
          noun="placements"
          className="presence-list"
          render={(row) => (
            <li key={row.id} className="presence">
              <span className="row-glyph"><Icon name={row.precision === "installation" ? "mapPin" : "layerBlocs"} size={20} /></span>
              <span className="presence__label">{row.label}</span>
              <span className="presence__where">{row.where}</span>
              {row.band ? <span className="presence__band">{row.band}</span> : null}
            </li>
          )}
          empty="No US forces are stationed or deployed here."
        />
        <p className="brief-section__note">Only sourced installations are shown as exact places. Everything else is a zone-level marker, never a site.</p>
      </div>
    </div>
  );
}
