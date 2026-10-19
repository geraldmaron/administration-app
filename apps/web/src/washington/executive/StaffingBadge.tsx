import "../../media/institution-artwork.css";
import { institutionArtwork } from "../../media/authority";
import { Icon, Tag, isIconName, type IconName, type TagTone } from "@admin/ui-web";
import type { Staffing } from "@admin/player-core";
import type { PendingNominee } from "./roster";

type Look = { readonly label: string; readonly tone: TagTone; readonly icon: IconName };

/** Each way a chair is held has its own word, tone and glyph, so an acting officer never reads as a confirmed one. */
const LOOKS: Readonly<Record<Staffing, Look>> = {
  confirmed: { label: "Confirmed", tone: "good", icon: "approve" },
  acting: { label: "Acting", tone: "caution", icon: "pending" },
  vacant: { label: "Vacant", tone: "risk", icon: "emptyCabinet" },
};

export const STAFFING_WORDS: Readonly<Record<Staffing, string>> = { confirmed: "Confirmed", acting: "Acting", vacant: "Vacant" };

export function StaffingBadge({ staffing }: { readonly staffing: Staffing }) {
  const look = LOOKS[staffing];
  return (
    <Tag tone={look.tone} icon={look.icon}>
      {look.label}
    </Tag>
  );
}

/** A name the Senate has in front of it, shown beside the chair's own state and never in place of it. */
export function NomineeBadge({ nominee }: { readonly nominee: PendingNominee }) {
  return (
    <span className="nominee-badge">
      <Tag tone="action" icon="appoint">
        Nominee pending
      </Tag>
      <span className="nominee-badge__who">
        {nominee.name}, {nominee.stage}
      </span>
    </span>
  );
}

/** An office's emblem from the icon set, and a building where the set has none for it. */
export function Emblem({ name, size = 20 }: { readonly name: string; readonly size?: number }) {
  return <Icon name={isIconName(name) ? name : "building"} size={size} />;
}

/** Verified department artwork; unregistered institutions retain their semantic icon. */
export function InstitutionMark({ institution, emblem, size = 28 }: { readonly institution: string; readonly emblem: string; readonly size?: number }) {
  const artwork = institutionArtwork(institution);
  return artwork ? <img className="institution-mark" src={artwork.src} alt={`${artwork.name} insignia`} width={size} height={size} /> : <Emblem name={emblem} size={size} />;
}
