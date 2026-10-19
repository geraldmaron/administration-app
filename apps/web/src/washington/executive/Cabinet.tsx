import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { formatRatio, nodeNeedsAttention, type OverviewOffice, type OverviewSection } from "@admin/player-core";
import { Bar, Icon } from "@admin/ui-web";
import { CabinetControls } from "./CabinetControls";
import { cabinetGroups, type ExecutiveSearch } from "./cabinet-view";
import { OfficeInspector } from "./OfficeInspector";
import { InstitutionMark } from "./StaffingBadge";

const STAFF = { confirmed: "Confirmed", acting: "Acting", vacant: "Vacant" } as const;
export function Cabinet({ campaign, sections, search, onSearch }: { readonly campaign: Campaign; readonly sections: readonly OverviewSection[]; readonly search: ExecutiveSearch; readonly onSearch: (next: ExecutiveSearch) => void }) {
  const groups = useMemo(() => cabinetGroups(campaign, sections, search), [campaign, sections, search]);
  const offices = groups.flatMap((g) => g.offices);
  const selected = offices.find((o) => o.node.office === search.office) ?? offices.find((o) => nodeNeedsAttention(o.node)) ?? offices.find((o) => o.delivery) ?? offices[0];
  const toggleNeed = () => { const { need: _old, ...rest } = search; onSearch(search.need ? rest : { ...search, need: true }); };
  return <section className="office-workspace" aria-label="Office operating board">
    <div className="office-workspace__bar"><div><h2>Office operating board</h2><span>{offices.length} offices in view</span></div><button type="button" className="exec-chip" aria-pressed={search.need === true} onClick={toggleNeed}><Icon name="caution" size={14} />Only chairs that need you</button></div>
    <CabinetControls search={search} onChange={onSearch} />
    {selected ? <div className="office-workspace__layout"><div className="office-board"><div className="office-board__columns" aria-hidden="true"><span>Office / holder</span><span>Delivery</span><span>Staffing</span></div>
      {groups.map((group) => <section key={group.key} className="office-board__group" aria-label={group.title}><h3>{group.title}<span>{group.offices.length}</span></h3><ul>{group.offices.map((office) => <li key={office.node.office} className="office-row" data-staffing={office.node.staffing} data-alert={office.node.alerts.length > 0 || undefined} data-selected={selected.node.office === office.node.office || undefined}>
        <OfficeRow office={office} selected={selected.node.office === office.node.office} onSelect={() => onSearch({ ...search, office: office.node.office })} />
        {selected.node.office === office.node.office ? <div className="office-workspace__inline"><OfficeInspector campaign={campaign} office={selected} /></div> : null}
      </li>)}</ul></section>)}
    </div><aside className="office-workspace__inspector"><OfficeInspector campaign={campaign} office={selected} /></aside></div> : <p className="office-workspace__empty">No offices match these controls. Clear the search or change the staffing filter.</p>}
  </section>;
}

function OfficeRow({ office, selected, onSelect }: { readonly office: OverviewOffice; readonly selected: boolean; readonly onSelect: () => void }) {
  const { node, delivery } = office;
  return <><button type="button" className="office-row__pick" aria-pressed={selected} onClick={onSelect}><InstitutionMark institution={node.institution} emblem={node.emblem} size={28} /><span><strong>{node.name}</strong><small>{node.holderName ?? "No officer seated"}</small></span></button>
    <div className="office-row__measure">{delivery ? <><strong>{formatRatio(delivery.quality)}</strong><Bar value={delivery.quality} tone={delivery.quality >= .6 ? "good" : delivery.quality >= .4 ? "watch" : "bad"} slim /></> : <span title={office.section === "independent" ? "Outside executive direction" : "No recorded delivery measure"}>—</span>}</div>
    <span className="office-row__staffing" data-staffing={node.staffing}><i aria-hidden="true" />{STAFF[node.staffing]}</span>
  </>;
}
