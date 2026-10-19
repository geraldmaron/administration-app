import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { formatRatio, type OverviewOffice, type OverviewSection } from "@admin/player-core";
import { Badge, CardGrid, CardLink, Column, Key, Row, Sticky, Text, View, useMedia } from "@admin/ui";
import { Select, TextInput, Toggle } from "@admin/ui/forms";
import { StaffingBadge } from "@admin/ui/dossier";
import { cabinetGroups, officeRead, selectedOffice, type CabinetGroup, type ExecutiveSearch, type GroupBy, type OrderBy, type StaffingFilter } from "./cabinet-view";
import { OfficeInspector } from "./OfficeInspector";
import { ChairReadBadge, ChairReadKey, InstitutionSeal } from "./parts";
import { QUALITY_INK, qualityOf } from "./present";

type Change = (patch: Partial<Record<keyof ExecutiveSearch, unknown>>) => void;

function Controls({ search, change }: { readonly search: ExecutiveSearch; readonly change: Change }) {
  const media = useMedia();
  const basis = media.phone ? "100%" : 200;
  return (
    <Row gap="md" wrap top role="group" aria-label="Find and organize offices">
      <Column flexBasis={media.phone ? "100%" : 280} flexGrow={2}>
        <TextInput kind="search" label="Find an office or person" placeholder="Find an office or person" value={search.q ?? ""} onChangeText={(q) => change({ q })} maxLength={120} icon="review" />
      </Column>
      <Column flexBasis={basis} flexGrow={1}>
        <Select<"all" | StaffingFilter> label="Staffing" value={search.staffing ?? "all"} onChange={(value) => change({ staffing: value === "all" ? undefined : value })} options={[{ value: "all", label: "All offices" }, { value: "confirmed", label: "Confirmed" }, { value: "acting", label: "Acting" }, { value: "vacant", label: "Empty" }]} />
      </Column>
      <Column flexBasis={basis} flexGrow={1}>
        <Select<"role" | GroupBy> label="Group offices by" value={search.group ?? "role"} onChange={(value) => change({ group: value === "role" ? undefined : value })} options={[{ value: "role", label: "Government role" }, { value: "staffing", label: "Who's in the job" }, { value: "assessment", label: "How the leader rates" }]} />
      </Column>
      <Column flexBasis={basis} flexGrow={1}>
        <Select<"attention" | OrderBy> label="Order offices by" value={search.order ?? "attention"} onChange={(value) => change({ order: value === "attention" ? undefined : value })} options={[{ value: "attention", label: "Needs you first" }, { value: "name", label: "Office name" }, { value: "delivery", label: "Most work done" }]} />
      </Column>
      <Toggle label="Only offices that need you" value={search.need === true} onChange={(on) => change({ need: on ? true : undefined })} />
    </Row>
  );
}

const SELECTED = { borderWidth: 2, borderColor: "accent", backgroundColor: "infoFill" } as const;

function OfficeCard({ campaign, office, selected, onSelect }: { readonly campaign: Campaign; readonly office: OverviewOffice; readonly selected: boolean; readonly onSelect: () => void }) {
  const { node, delivery } = office;
  const read = officeRead(campaign, office);
  const waiting = node.alerts.length + office.agenciesNeedingYou;
  return (
    <CardLink onPress={onSelect} role="button" selected={selected} label={`Show details for ${node.name}, ${node.holderName ?? "nobody in charge"}, ${node.staffing}${delivery ? `, getting ${formatRatio(delivery.quality)} of its work done` : ""}`} pad="md" gap="sm" flexGrow={1} {...(selected ? SELECTED : {})}>
      <Row gap="sm" top>
        <InstitutionSeal id={node.institution} name={node.name} size={48} />
        <Column flex={1} gap="2xs">
          <Text variant="label" numberOfLines={2}>
            {node.name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {node.holderName ?? "Nobody in charge"}
          </Text>
        </Column>
      </Row>
      <View flexGrow={1} />
      <Row gap="xs" wrap>
        <StaffingBadge staffing={node.staffing} />
        {waiting > 0 ? <Badge status="danger" icon="caution">{`${waiting} need you`}</Badge> : null}
        {read ? <ChairReadBadge read={read} /> : null}
      </Row>
      {delivery ? (
        <Row gap="sm">
          <Column flex={1} height={6} borderRadius="pill" backgroundColor="borderColor" overflow="hidden">
            <Column height={6} width={`${Math.round(delivery.quality * 100)}%`} backgroundColor={QUALITY_INK[qualityOf(delivery.quality)]} />
          </Column>
          <Text variant="caption" weight="strong" tabular>
            {formatRatio(delivery.quality)}
          </Text>
        </Row>
      ) : (
        <Text variant="caption" tone="tertiary">
          {office.section === "independent" ? "Independent of the President" : "Work done isn't measured"}
        </Text>
      )}
    </CardLink>
  );
}

const GRID = { phone: 1, tablet: 2, desktop: 2, wide: 3 } as const;

type GroupProps = { readonly campaign: Campaign; readonly group: CabinetGroup; readonly selected: OverviewOffice; readonly branch: number; readonly inline: boolean; readonly onSelect: (office: string) => void };

/**
 * One part of the government as a grid of office cards. Without room beside
 * the board, the picked office's details open full width under the row its
 * card is in, so the cards beside it keep their own height.
 */
function Group({ campaign, group, selected, branch, inline, onSelect }: GroupProps) {
  const media = useMedia();
  const cards = (offices: readonly OverviewOffice[]) => (
    <CardGrid columns={GRID}>
      {offices.map((office) => (
        <OfficeCard key={office.node.office} campaign={campaign} office={office} selected={selected.node.office === office.node.office} onSelect={() => onSelect(office.node.office)} />
      ))}
    </CardGrid>
  );
  const at = inline ? group.offices.findIndex((office) => office.node.office === selected.node.office) : -1;
  const across = media.phone ? GRID.phone : GRID.tablet;
  const cut = at < 0 ? group.offices.length : (Math.floor(at / across) + 1) * across;
  return (
    <Column gap="sm" role="region" aria-label={group.title}>
      <Row gap="sm">
        <Text variant="title" role="heading" aria-level={3}>
          {group.title}
        </Text>
        <Badge status="outline">{String(group.offices.length)}</Badge>
      </Row>
      {cards(group.offices.slice(0, cut))}
      {at < 0 ? null : <OfficeInspector campaign={campaign} office={selected} branch={branch} />}
      {cut < group.offices.length ? cards(group.offices.slice(cut)) : null}
    </Column>
  );
}

export type OfficeBoardProps = { readonly campaign: Campaign; readonly sections: readonly OverviewSection[]; readonly branch: number; readonly search: ExecutiveSearch; readonly onSearch: (next: ExecutiveSearch) => void };

/**
 * The executive as the organization it is: each part of the government with
 * every office under its seal, who holds it and how, how it delivers, and how
 * its officer reads. Picking an office opens its assessment beside the board
 * on a desktop and under the card's row on a tablet or phone.
 */
export function OfficeBoard({ campaign, sections, branch, search, onSearch }: OfficeBoardProps) {
  const media = useMedia();
  const groups = useMemo(() => cabinetGroups(campaign, sections, search), [campaign, sections, search]);
  const selected = selectedOffice(groups, search.office);
  const change: Change = (patch) => onSearch(Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined && value !== "")) as ExecutiveSearch);
  const side = Boolean(media.desktop);
  const count = groups.reduce((sum, group) => sum + group.offices.length, 0);
  return (
    <Column gap="lg" role="region" aria-label="Offices">
      <Controls search={search} change={change} />
      <Text variant="caption" tone="secondary" role="status">
        {count} offices shown
      </Text>
      <Column gap="xs">
        <Key title="the bar on each office card" entries={[{ id: "good", kind: "swatch", label: "Delivers 60% or more of its work", ink: "successInk" }, { id: "watch", kind: "swatch", label: "Between 40% and 60%", ink: "warningInk" }, { id: "bad", kind: "swatch", label: "Under 40%", ink: "danger" }]} />
        <ChairReadKey />
      </Column>
      {selected ? (
        <Row gap="xl" top>
          <Column flex={1} gap="xl" minWidth={0}>
            {groups.map((group) => (
              <Group key={group.key} campaign={campaign} group={group} selected={selected} branch={branch} inline={!side} onSelect={(office) => change({ office })} />
            ))}
          </Column>
          {side ? (
            <Sticky width={media.wide ? 420 : 360}>
              <OfficeInspector campaign={campaign} office={selected} branch={branch} />
            </Sticky>
          ) : null}
        </Row>
      ) : (
        <Text variant="body" tone="secondary">
          No offices match. Try clearing the search or changing the staffing filter.
        </Text>
      )}
    </Column>
  );
}
