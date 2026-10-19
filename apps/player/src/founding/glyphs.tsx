import type { AdministrationParty, FoundingMandate, GoverningStyle } from "@admin/engine";
import { Icon, Row, View, type IconName } from "@admin/ui";

// The picture each founding choice leads with, so a card is recognized before
// it is read. One table, so the questions, the short setup and the oath show
// the same style or career with the same mark.

export const CAREER_GLYPH: Readonly<Record<string, IconName>> = {
  "path-senator": "subjectChamber",
  "path-house": "subjectCapitol",
  "path-governor": "subjectSeal",
  "path-vice-president": "westWing",
  "path-general": "shield",
  "path-business": "sectorFinance",
  "path-cabinet": "appoint",
  "path-mayor": "mapPin",
};

export const ROUTE_GLYPH: Readonly<Record<string, IconName>> = {
  "route-primaries": "ballot",
  "route-convention": "gavel",
  "route-insurgent": "escalate",
};

export const STYLE_GLYPH: Readonly<Record<GoverningStyle, IconName>> = {
  pragmatic: "summit",
  principled: "gavel",
  cautious: "review",
  hawkish: "instrumentMilitary",
  dovish: "instrumentDiplomatic",
};

export const PLANK_GLYPH: Readonly<Record<string, IconName>> = {
  "plank-balanced-budget": "budget",
  "plank-rebuild-infrastructure": "sectorPublicInfrastructure",
  "plank-fair-share": "departmentTreasury",
  "plank-energy-dominance": "sectorEnergyOil",
  "plank-clean-energy": "sectorEnergyRenewables",
  "plank-fair-trade": "subjectTrade",
  "plank-secure-border": "departmentHomelandSecurity",
  "plank-rebuild-military": "departmentDefense",
  "plank-reform-policing": "departmentJustice",
  "plank-open-government": "open",
};

export const PARTY_INK = { democrat: "partyDem", republican: "partyRep", independent: "partyInd" } as const;

/** A glyph sized for a choice card, or nothing for an id the table has not met. */
export function CardGlyph({ name }: { readonly name: IconName | undefined }) {
  return name ? <Icon name={name} size={28} tone="gold" /> : null;
}

/** A party as its color. */
export function PartyMark({ party, size = 22 }: { readonly party: AdministrationParty; readonly size?: number }) {
  return <View width={size} height={size} borderRadius="pill" backgroundColor={PARTY_INK[party]} borderWidth={2} borderColor="surface" aria-hidden />;
}

/**
 * How decisively the country voted, drawn as the two shares of the vote. The
 * widths show the order of the margins, not a forecast of any count.
 */
const MANDATE_SHARE: Readonly<Record<FoundingMandate, number>> = {
  landslide: 62,
  comfortable: 55,
  narrow: 51,
  "popular-vote-loss": 48,
};

export function MandateMark({ mandate }: { readonly mandate: FoundingMandate | undefined }) {
  const ours = mandate === undefined ? 50 : MANDATE_SHARE[mandate];
  return (
    <Row width={64} height={12} marginTop="xs" borderRadius="pill" overflow="hidden" aria-hidden opacity={mandate === undefined ? 0.45 : 1}>
      <View height="100%" width={`${ours}%`} backgroundColor="gold" />
      <View height="100%" width={`${100 - ours}%`} backgroundColor="borderColorStrong" />
    </Row>
  );
}
