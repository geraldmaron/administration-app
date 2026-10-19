import { useMemo, useState } from "react";
import { constructionOrderSubjects, eligibleExternalThreats, energyLeasingOrderSubjects, entryClassOrderSubjects, executiveOrder, federalSiteOrderSubjects, grantOrderSubjects, leasePlanningArea, regulatoryReviewOrderSubjects, reliefOrderSubjects, type Campaign, type OrderSubject } from "@admin/engine";
import { FEDERAL_SITES } from "@admin/world";
import { Column, Select, Text } from "@admin/ui";

type Choice = { readonly key: string; readonly label: string; readonly subject: OrderSubject };
type Picker = { readonly label: string; readonly note?: string; readonly choices: readonly Choice[] };

const nationName = (campaign: Campaign, id: string): string => campaign.nations[id as keyof typeof campaign.nations]?.base.identity.name ?? id;

/** The foreign governments an asset order could reach: a threat that supports a finding, or an emergency already declared over one. */
export function foreignTargets(campaign: Campaign): readonly string[] {
  const threats = eligibleExternalThreats(campaign).map((pursuit) => pursuit.actor as string);
  const declared = Object.values(campaign.externalEmergencies ?? {}).filter((record) => record.endedTurn === undefined && campaign.turn < record.expiresTurn).map((record) => record.target as string);
  return [...new Set([...threats, ...declared])];
}

/** What a subject-bound order is about, as a list of choices the President picks from; undefined for an order with no subject. */
function pickerFor(campaign: Campaign, id: string): Picker | undefined {
  switch (id) {
    case "order-relief-program":
      return { label: "Governor's request", choices: reliefOrderSubjects(campaign).map((entry) => ({ key: `${entry.state}:${entry.cause}:${entry.declarationId}:${entry.billId}`, label: `${campaign.states[entry.state]?.base.name ?? entry.state}: ${entry.cause} · ${campaign.bills[entry.billId]?.title ?? entry.billId}`, subject: entry })) };
    case "order-grant-conditions":
      return { label: "Grant law that passed", choices: grantOrderSubjects(campaign).map((entry) => ({ key: entry.billId, label: campaign.bills[entry.billId]?.title ?? entry.billId, subject: entry })) };
    case "order-regulatory-review":
      return { label: "Agency rule in effect", note: "A review can suggest changes to the rule. Changing or ending the rule is a separate step.", choices: regulatoryReviewOrderSubjects(campaign).map((entry) => {
        const target = campaign.orders.find((record) => record.id === entry.ruleId);
        return { key: entry.ruleId, label: target ? (executiveOrder(target.order)?.name ?? target.order) : entry.ruleId, subject: entry };
      }) };
    case "order-energy-leasing":
      return { label: "Federal offshore area", note: "This starts planning and review. Signing it doesn't grant a lease or a drilling permit.", choices: energyLeasingOrderSubjects(campaign).map((entry) => ({ key: entry.areaId, label: leasePlanningArea(entry.areaId)?.name ?? entry.areaId, subject: entry })) };
    case "order-force-protection":
      return { label: "Federal building or grounds", note: "This covers only the federal property you pick. It doesn't cover nearby streets or state buildings.", choices: federalSiteOrderSubjects(campaign).map((entry) => ({ key: entry.institutionId, label: FEDERAL_SITES.find((site) => site.institution === entry.institutionId)?.site ?? entry.institutionId, subject: entry })) };
    case "order-entry-suspension":
      return { label: "People entering for the first time from", note: "The finding points to a recent, open campaign against US security. This proclamation applies when people arrive. It doesn't apply to people already let in.", choices: entryClassOrderSubjects(campaign).map((entry) => ({ key: entry.nation, label: nationName(campaign, entry.nation), subject: entry })) };
    case "order-emergency-construction":
      return { label: "Project money to move", choices: constructionOrderSubjects(campaign).map((entry) => ({ key: `${entry.sourceId}:${entry.declarationId}`, label: campaign.militaryConstructionProjects?.find((project) => project.id === entry.sourceId)?.name ?? entry.sourceId, subject: entry })) };
    case "order-asset-seizure":
      return { label: "Foreign government", choices: foreignTargets(campaign).map((nation) => ({ key: nation, label: nationName(campaign, nation), subject: { kind: "foreign", nation } as OrderSubject })) };
    default:
      return undefined;
  }
}

/**
 * The subject an order is signed against, chosen from what the engine offers,
 * and the control that chooses it. Border controls always reach every federal
 * port of entry.
 */
export function useOrderSubject(campaign: Campaign, id: string): { readonly subject: OrderSubject | undefined; readonly picker: Picker | undefined; readonly choose: (key: string) => void; readonly key: string | undefined } {
  const picker = useMemo(() => pickerFor(campaign, id), [campaign, id]);
  const [key, choose] = useState("");
  if (id === "order-border-controls") return { subject: { kind: "ports-of-entry", scope: "all-federal-ports" } as OrderSubject, picker: undefined, choose, key: undefined };
  const chosen = picker?.choices.find((choice) => choice.key === key) ?? picker?.choices[0];
  return { subject: chosen?.subject, picker, choose, key: chosen?.key };
}

export function SubjectPicker({ picker, value, onChange }: { readonly picker: Picker; readonly value: string | undefined; readonly onChange: (key: string) => void }) {
  if (picker.choices.length === 0) return null;
  return (
    <Column gap="xs">
      <Select label={picker.label} options={picker.choices.map((choice) => ({ value: choice.key, label: choice.label }))} value={value} onChange={onChange} />
      {picker.note ? (
        <Text variant="caption" tone="secondary">
          {picker.note}
        </Text>
      ) : null}
    </Column>
  );
}
