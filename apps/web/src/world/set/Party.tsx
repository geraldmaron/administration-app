import type { ReactNode } from "react";
import { place } from "@admin/player-core";
import { Flag } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";
import "./set.css";

/** A government's name as a door to its file, drawn as words until that file is built. */
export function NationDoor({ nation, name, className }: { readonly nation: string; readonly name: string; readonly className?: string }) {
  const built = useBuilt();
  const href = place.country(nation);
  return built(href) ? (
    <Door href={href} {...(className ? { className } : {})}>
      {name}
    </Door>
  ) : (
    <span>{name}</span>
  );
}

export type PartyProps = {
  readonly nation: string;
  readonly name: string;
  /** The United States' own row is marked in gold. */
  readonly us?: boolean;
  /** Small marks after the name: a role, "At war". */
  readonly tags?: ReactNode;
  /** Lines under the name: why it came in, what it has committed, a meter. */
  readonly children?: ReactNode;
};

/** One government in a set: its flag, its name as a door, and what the screen says of it. */
export function Party({ nation, name, us = false, tags, children }: PartyProps) {
  const src = nationFlagUrl(nation);
  return (
    <li className="set-party ui-card-door" data-us={us ? "true" : undefined}>
      <Flag name={name} {...(src ? { src } : {})} height={20} decorative />
      <div>
        <span className="set-party__name">
          <NationDoor nation={nation} name={name} className="ui-card-door__link" />
        </span>
        {tags ? <span className="set-party__tags"> {tags}</span> : null}
      </div>
      {children ? <div className="set-party__body">{children}</div> : null}
    </li>
  );
}
