import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { PLACES, SEAL_HOUSE, SEAL_SUPREME_COURT, SEAL_WHITE_HOUSE, executiveOverview, executiveTree, place, sealFor, type ExecutiveOverview } from "@admin/player-core";
import { CardGrid, Column, Icon, Page, Row, Seal, Text, View } from "@admin/ui";
import { ViewTabs, type ViewTab } from "@admin/ui/nation";
import { usePreferences } from "../device/hooks";
import type { ExecutiveSearch, ExecutiveView } from "./cabinet-view";
import { DeliveryPanel } from "./DeliveryPanel";
import { ExecutivePulse } from "./ExecutivePulse";
import { OfficeBoard } from "./OfficeBoard";
import { CardTo } from "./parts";
import { RosterPanel } from "./RosterPanel";
import { ServicesPanel, type SealOf } from "./ServicesPanel";
import { rosterScopes } from "./roster";

const BRANCHES = [
  { key: "congress", href: place.congress(), seal: SEAL_HOUSE, title: PLACES.congress.title, line: "House and Senate · bills · support" },
  { key: "courts", href: place.courts(), seal: SEAL_SUPREME_COURT, title: PLACES.courts.title, line: "Judges · cases · appointments" },
  { key: "oversight", href: place.oversight(), seal: undefined, title: PLACES.oversight.title, line: "Investigations · orders · inspectors general" },
] as const;

function Branches() {
  return (
    <Column gap="sm" role="navigation" aria-label="The other branches of government">
      <Text variant="title" role="heading" aria-level={2}>
        The other branches of government
      </Text>
      <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }}>
        {BRANCHES.map((door) => (
          <CardTo key={door.key} href={door.href} label={`Open ${door.title}: ${door.line.split(" · ").join(", ")}`} pad="md" flexGrow={1}>
            <Row gap="md" top>
              {door.seal ? <Seal spec={sealFor(door.seal)} size={44} /> : <View width={44} height={44} alignItems="center" justifyContent="center"><Icon name="review" size={36} tone="gold" /></View>}
              <Column flex={1}>
                <Text variant="label">{door.title}</Text>
                <Text variant="caption" tone="secondary">
                  {door.line}
                </Text>
              </Column>
              <Icon name="chevron" size={18} tone="colorTertiary" />
            </Row>
          </CardTo>
        ))}
      </CardGrid>
    </Column>
  );
}

/** Every office address on the board, to the institution whose seal it carries. */
function sealIndex(overview: ExecutiveOverview): SealOf {
  const nodes = overview.sections.flatMap((section) => section.offices.flatMap((office) => [office.node, ...office.node.children]));
  const index = new Map(nodes.map((node) => [node.href, { id: node.institution as string, name: node.name }] as const));
  return (href) => index.get(href);
}

const VIEWS: readonly ViewTab<ExecutiveView>[] = [
  { id: "offices", label: "Offices", icon: "westWing" },
  { id: "delivery", label: "Work done", icon: "graph" },
  { id: "services", label: "Services", icon: "building" },
  { id: "roster", label: "Everyone", icon: "subjectPerson" },
];

/**
 * The executive branch: the operating picture, then the government as an
 * organization of seals and officers, delivery office by office, the public
 * services and the full roster, and the doors to the other branches.
 */
export function ExecutiveScreen({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: ExecutiveSearch; readonly onSearch: (next: ExecutiveSearch) => void }) {
  const { preferences } = usePreferences();
  const overview = useMemo(() => executiveOverview(campaign, preferences.attentionByKind), [campaign, preferences.attentionByKind]);
  const scopes = useMemo(() => rosterScopes(campaign, executiveTree(campaign)), [campaign]);
  const sealOf = useMemo(() => sealIndex(overview), [overview]);
  const view: ExecutiveView = search.view ?? "offices";
  const pick = (next: ExecutiveView) => {
    const { view: _old, ...rest } = search;
    onSearch(next === "offices" ? rest : { ...rest, view: next });
  };
  const lede = `${overview.chairs.total} top jobs. ${overview.chairs.needYou} need you${overview.nominations.length ? `, and ${overview.nominations.length} ${overview.nominations.length === 1 ? "nominee is" : "nominees are"} waiting on the Senate` : ""}.`;
  return (
    <Page title="Executive" icon="westWing" eyebrow="The executive branch" lede={lede} emblem={<Seal spec={sealFor(SEAL_WHITE_HOUSE)} size={72} label="The White House" />} wide>
      <ExecutivePulse overview={overview} />
      <ViewTabs label="Executive views" tabs={VIEWS} selected={view} onSelect={pick} />
      {view === "delivery" ? <DeliveryPanel reading={overview.delivery} bodiesCounted={overview.bodiesCounted} /> : null}
      {view === "services" ? <ServicesPanel reading={overview.services} sealOf={sealOf} /> : null}
      {view === "roster" ? <RosterPanel campaign={campaign} scopes={scopes} scope={search.scope} need={search.need === true} onScope={(scope) => onSearch({ ...search, scope })} /> : null}
      {view === "offices" ? <OfficeBoard campaign={campaign} sections={overview.sections} branch={overview.delivery.quality} search={search} onSearch={onSearch} /> : null}
      <Branches />
    </Page>
  );
}
