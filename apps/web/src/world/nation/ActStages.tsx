import type { Campaign } from "@admin/engine";
import { place, standingToward } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Flag, Icon, Steps } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import "./act.css";

/** Who this is about and where the relationship stands, drawn as stepped readings, so every choice below is read against it. */
export function TargetPlate({ campaign, nation, name }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string }) {
  const standing = standingToward(campaign, nation);
  const src = nationFlagUrl(nation);
  return (
    <section className="act-plate" aria-label={`${name} now`}>
      <Door href={place.country(nation)} className="act-plate__seat" aria-label={`The file on ${name}`}>
        <Flag name={name} {...(src ? { src } : {})} height={28} decorative /><strong>{name}</strong><Icon name="dossier" size={18} />
      </Door>
      <div className="act-plate__readings">
        {standing?.theirs ? (
          <Steps label={standing.theirs.caption} lit={standing.theirs.trust.level} steps={4} word={standing.theirs.trust.word} tone={toneOf(standing.theirs.trust.stance)} />
        ) : (
          <p className="country-unread">
            <Icon name="hidden" size={16} /> Their view of you is unread.
          </p>
        )}
        {standing?.tension ? <Steps label="Tension between you" lit={standing.tension.level} steps={4} word={standing.tension.word} tone={toneOf(standing.tension.stance)} /> : null}
      </div>

    </section>
  );
}
