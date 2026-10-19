import type { ActGroup, WireGroup } from "@admin/player-core";
import { Collection, Icon, IconBadge, Tag, type IconName } from "@admin/ui-web";
import { EntryRow, moveScales } from "../../record/EntryRow";
import { recordHref } from "../../record/search";
import { Door } from "../../shell/Door";

const DOMAIN_ICONS: Readonly<Record<string, IconName>> = {
  congress: "subjectCapitol",
  orders: "order",
  personnel: "appoint",
  economy: "economyGrowth",
  world: "instrumentDiplomatic",
  security: "shield",
  public: "press",
  other: "info",
};

const WIRE_ICONS: Readonly<Record<string, IconName>> = {
  press: "press",
  conflict: "conflict",
  condition: "eventEmergency",
  governance: "building",
};

/** Entries grouped by what they touched: the domain's mark and count, how many helped and how many cost, then the entries as the Record draws them. */
export function ActGroups({ groups, empty }: { readonly groups: readonly ActGroup[]; readonly empty: string }) {
  if (groups.length === 0) return <p className="dg-none">{empty}</p>;
  const scales = moveScales(groups.flatMap((group) => group.rows));
  return (
    <div className="dg-groups">
      {groups.map((group) => (
        <section key={group.domain} className="dg-group" aria-label={group.label}>
          <h3 className="dg-group__head">
            <IconBadge name={DOMAIN_ICONS[group.domain] ?? "info"} tone="blue" size={28} />
            <span className="dg-group__name">{group.label}</span>
            <span className="dg-group__count">{group.rows.length}</span>
            {group.helped > 0 ? <span className="ui-valence-ink dg-group__cue" data-valence="good">▲ {group.helped} helped</span> : null}
            {group.hurt > 0 ? <span className="ui-valence-ink dg-group__cue" data-valence="bad">▼ {group.hurt} cost</span> : null}
          </h3>
          <Collection
            items={group.rows}
            initial={6}
            noun="entries"
            as="ol"
            className="rec-rows"
            render={(row) => <EntryRow key={row.id} row={row} href={recordHref({ entry: row.id })} scales={scales} />}
          />
        </section>
      ))}
    </div>
  );
}

/** What the wire filed, by kind, newest first; an intelligence item is marked so it is never read as public, and an item that names a subject opens it. */
export function WireGroups({ groups, empty }: { readonly groups: readonly WireGroup[]; readonly empty: string }) {
  if (groups.length === 0) return <p className="dg-none">{empty}</p>;
  return (
    <div className="dg-groups dg-groups--wire">
      {groups.map((group) => (
        <section key={group.kind} className="dg-group" aria-label={group.label}>
          <h3 className="dg-group__head">
            <IconBadge name={WIRE_ICONS[group.kind] ?? "world"} tone="blue" size={28} />
            <span className="dg-group__name">{group.label}</span>
            <span className="dg-group__count">{group.lines.length}</span>
          </h3>
          <Collection
            items={group.lines}
            initial={8}
            noun="stories"
            as="ol"
            className="dg-wire"
            render={(line) => (
              <li key={line.index} data-visibility={line.intelligence ? "intelligence" : "public"} {...(line.href && line.subject ? { className: "ui-row-target" } : {})}>
                <span className="dg-wire__text">
                  {line.intelligence ? <Tag tone="identity">Intelligence</Tag> : null} {line.headline}
                </span>
                {line.href && line.subject ? (
                  <Door href={line.href} className="dg-wire__door ui-row-link" aria-label={`Open ${line.subject}`}>
                    {line.subject} <Icon name="chevron" size={14} />
                  </Door>
                ) : null}
              </li>
            )}
          />
        </section>
      ))}
    </div>
  );
}
