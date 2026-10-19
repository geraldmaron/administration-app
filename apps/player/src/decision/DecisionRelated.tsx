import type { Campaign } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { place } from "@admin/player-core";
import { RelatedRail, Seal, type RelatedItem } from "@admin/ui";
import type { Letterhead } from "./letterhead";
import { go } from "./parts";

/** Every door the matter names: the office raising it, who prepared it, the government and the place it is about, and its trail on the Record. */
export function relatedItems(campaign: Campaign, cast: CastScenario, head: Letterhead, selection: string | undefined): readonly RelatedItem[] {
  const nation = cast.counterpart !== campaign.founding.nation ? campaign.nations[cast.counterpart] : undefined;
  const by = head.preparedBy;
  const items: readonly (RelatedItem | undefined)[] = [
    head.office ? { id: "office", label: head.issuer, detail: "The office bringing it to you", emblem: <Seal spec={head.seal} size={28} />, href: head.office!, onPress: () => go(head.office!) } : undefined,
    by?.person ? { id: "preparer", label: by.name, detail: by.role, icon: "subjectPerson", href: place.person(by.person!), onPress: () => go(place.person(by.person!)) } : undefined,
    nation ? { id: "nation", label: nation.base.identity.name, detail: "The other government", icon: "flag", href: place.country(cast.counterpart), onPress: () => go(place.country(cast.counterpart)) } : undefined,
    cast.locus?.state ? { id: "state", label: cast.locus.placeName, detail: "Where it's happening", icon: "mapPin", href: place.state(cast.locus!.state!), onPress: () => go(place.state(cast.locus!.state!)) } : undefined,
    selection ? { id: "trail", label: "Past changes", detail: "Everything on your Record about this", icon: "record", href: `${place.record()}?subject=${encodeURIComponent(selection)}`, onPress: () => go(`${place.record()}?subject=${encodeURIComponent(selection)}`) } : undefined,
  ];
  return items.filter((item): item is RelatedItem => item !== undefined);
}

export function DecisionRelated({ campaign, cast, head, selection }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly head: Letterhead; readonly selection: string | undefined }) {
  return <RelatedRail title="Related" items={relatedItems(campaign, cast, head, selection)} />;
}
