import type { NationFile, NationVital } from "@admin/player-core";
import { Icon, Steps, StepsTable } from "@admin/ui-web";
import { toneOf } from "../../shell/valence";
import { VITAL_GLYPH } from "./country-glyphs";
import { PowerStats } from "./CountryFigures";
import { TradeView } from "./TradeView";

function Vital({ vital }: { readonly vital: NationVital }) {
  if (vital.unread) {
    return (
      <p className="country-unread">
        <Icon name="hidden" size={16} /> {vital.caption}: unread. The services have no read on this government's elite.
      </p>
    );
  }
  return <Steps layout="row" icon={VITAL_GLYPH[vital.key]} label={vital.caption} lit={vital.level ?? 2} word={vital.word} tone={toneOf(vital.stance)} {...(vital.line ? { caption: vital.line } : {})} />;
}

type Props = { readonly file: NationFile; readonly sector: string | undefined; readonly onSector: (sector: string | undefined) => void };

/** How the country is doing, then its trade with the United States by goods and with the world by partner. */
export function EconomyView({ file, sector, onSector }: Props) {
  return (
    <div className="country-view">
      <PowerStats power={file.power} />
      <StepsTable label="How its economy is doing">
        {file.vitals.map((vital) => (
          <Vital key={vital.key} vital={vital} />
        ))}
      </StepsTable>
      <TradeView file={file} sector={sector} onSector={onSector} />
    </div>
  );
}
