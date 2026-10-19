import { actHref, type ActWorkspace } from "@admin/player-core";
import { Icon, type IconName } from "@admin/ui-web";
import type { NationId } from "@admin/world";
import { Door } from "../../shell/Door";

const ICON: Readonly<Record<ActWorkspace["underway"][number]["kind"], IconName>> = { operation: "pending", authorization: "law", measure: "subjectTrade" };
const END_VERB: Readonly<Record<ActWorkspace["underway"][number]["kind"], string>> = { operation: "Call it off", authorization: "", measure: "Lift it" };

/** What the President already has moving against this government, said above the choices so a second order is never given without the first in view. */
export function UnderWay({ nation, rows }: { readonly nation: NationId; readonly rows: ActWorkspace["underway"] }) {
  if (rows.length === 0) return null;
  return (
    <section className="act-underway" aria-labelledby="act-underway-title">
      <h2 id="act-underway-title" className="brief-section__title">
        <Icon name="pending" size={20} /> Already under way
      </h2>
      <ul className="act-underway__rows" aria-label="Already under way">
        {rows.map((row) => (
          <li key={row.id} id={`operation-${row.id}`}>
            <Icon name={ICON[row.kind]} size={16} />
            <span className="act-underway__body">
              <strong>{row.title}</strong>
              <span>{row.detail}</span>
            </span>
            {row.endable ? (
              <Door href={actHref(nation, { manage: row.id })} className="act-underway__end">
                {END_VERB[row.kind]}
              </Door>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
