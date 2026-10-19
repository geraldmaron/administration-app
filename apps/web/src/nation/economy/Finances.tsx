import type { Campaign } from "@admin/engine";
import { deficitDriverReading } from "@admin/player-core";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";
import { Position } from "../budget/Books";
import { DriverTable } from "./Drivers";

/** The public finances as the economy reads them: the federal position, and what put this year's balance where it is. */
export function Finances({ campaign }: { readonly campaign: Campaign }) {
  const deficit = deficitDriverReading(campaign);
  const built = useBuilt();
  const budget = "/nation/budget";
  return (
    <>
      <Position campaign={campaign} />
      {deficit ? (
        <section className="eco-panel" aria-labelledby="economy-deficit">
          <h2 id="economy-deficit" className="eco-panel__title">
            What put the balance where it is
          </h2>
          <DriverTable title="This year's balance" summary={deficit.balance} rows={deficit.rows} unit="A year" goodWhen="up" />
        </section>
      ) : null}
      <p className="nation-note">
        The appropriation, the proposal and the full ledger are on the {built(budget) ? <Door href={budget}>budget screen</Door> : "budget screen"}.
      </p>
    </>
  );
}
