import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { WAR_POWERS_ANCHOR, countryWarPowers } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { ActsReceipt, useNationCommit } from "../set/SetAct";
import { WarPowersSection } from "../war/WarPowers";
import "../set/set.css";

/**
 * The War Powers paper on force against this government. Where the force is
 * part of a war the decisions live on the war, and this points there; where it
 * is not (a strike with no war behind it, or a war that has ended while the
 * statute still counts), they are made here.
 */
export function CountryWarPowers({ campaign, id, name }: { readonly campaign: Campaign; readonly id: NationId; readonly name: string }) {
  const acts = useNationCommit(campaign);
  const reading = useMemo(() => countryWarPowers(campaign, id), [campaign, id]);
  if (reading.papers.length === 0 && !acts.committed) return null;
  if (reading.war) {
    return (
      <section className="set-section" aria-labelledby={WAR_POWERS_ANCHOR}>
        <h2 id={WAR_POWERS_ANCHOR} className="set-section__title">
          <Icon name="gavel" size={20} /> Authority: War Powers
        </h2>
        <p className="set-note">
          The force committed against {name} is part of a war, and its report, its sixty days and Congress&apos;s vote are decided there.{" "}
          <Door href={reading.war}>Open the War Powers paper on the war</Door>
        </p>
      </section>
    );
  }
  return (
    <>
      <ActsReceipt acts={acts} again={`Back to ${name}`} />
      <WarPowersSection campaign={campaign} papers={reading.papers} acts={acts} />
    </>
  );
}
