import { POLICY_DOMAINS, POLICY_DOMAIN_SPECS, type PolicyDomain } from "@admin/engine";
import { domainShareWords, stateIndustryShares } from "../../policy/portfolio.js";
import { formatRatio } from "../../format/figures.js";
import type { StateId } from "@admin/world";
import { noData, solid, type MapLens } from "../contract.js";
import { rampStep, type MapPalette } from "../palette.js";

// The policy screen's lens: how much of each state's economy sits in the parts
// the selected domain's program lands on, so a program is seen where it would
// be felt before it is chosen.

const PREFIX = "share-";

/** The lens id for a domain's share. */
export function shareLensId(domain: PolicyDomain): string {
  return `${PREFIX}${domain}`;
}

/** Every share lens id, one per domain. */
export const SHARE_LENS_IDS: readonly string[] = POLICY_DOMAINS.map(shareLensId);

export function shareDomainOf(id: string): PolicyDomain | undefined {
  const domain = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : "";
  return (POLICY_DOMAINS as readonly string[]).includes(domain) ? (domain as PolicyDomain) : undefined;
}

export function shareLens(domain: PolicyDomain, palette: MapPalette): MapLens {
  const shares = stateIndustryShares(domain);
  const words = domainShareWords(domain);
  // The ramp runs to the state that lives most off these, so a domain whose
  // share is a few percent everywhere still shows where it is felt most.
  const top = Math.max(...shares.values(), Number.EPSILON);
  return {
    id: shareLensId(domain),
    name: `${POLICY_DOMAIN_SPECS[domain].name}: ${words} share`,
    level: "state",
    scale: "sequential",
    encoding: "color",
    legend: [
      { label: "None", color: palette.seq[0] ?? palette.neutral },
      { label: formatRatio(top / 2), color: palette.seq[3] ?? palette.neutral },
      { label: formatRatio(top), color: palette.seq[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      const share = shares.get(region.id as StateId);
      if (share === undefined) return noData(palette);
      return solid(`${formatRatio(share)} of its economy in ${words}`, share, rampStep(palette.seq, share / top));
    },
  };
}
