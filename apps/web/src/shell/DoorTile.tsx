import type { ReactNode } from "react";
import { Icon, IconBadge, type IconBadgeTone, type IconName } from "@admin/ui-web";
import { useBuilt } from "./built-routes";
import { Door } from "./Door";

export type DoorTileProps = {
  readonly href: string;
  readonly icon: IconName;
  readonly title: string;
  /** One line on what is there, so the player knows before they go. */
  readonly description: string;
  /** What is waiting there now, short: "2 bills on the floor". */
  readonly status?: ReactNode;
  readonly tone?: IconBadgeTone;
};

/**
 * The app's one pattern for going to another screen: an icon tile, the name,
 * a line on what is there, and a chevron, with the whole tile the link.
 * Actions are buttons; places are tiles. A place this version does not have
 * draws no tile: a door to nowhere is not offered.
 */
export function DoorTile({ href, icon, title, description, status, tone = "blue" }: DoorTileProps) {
  const built = useBuilt();
  if (!built(href)) return null;
  return (
    <div className="ui-door-tile ui-card-door">
      <IconBadge name={icon} tone={tone} size={36} />
      <span className="ui-door-tile__text">
        <span className="ui-door-tile__title">
          <Door href={href} className="ui-card-door__link">
            {title}
          </Door>
        </span>
        <span className="ui-door-tile__description">{description}</span>
        {status ? <span className="ui-door-tile__status">{status}</span> : null}
      </span>
      <Icon name="chevron" size={18} className="ui-door-tile__chevron" />
    </div>
  );
}
