import type { ReactNode } from "react";
import { Theme, View } from "@tamagui/core";

/**
 * Where a region sits in the fiction. The desk is the default work plane; paper
 * is an issued document; situation is the classified watch floor, dark in
 * every theme; theater is the map; chrome is the command bar and navigation.
 * A component never asks which zone it is in: the zone re-maps the roles it
 * already reads (`color`, `surface`, `accent`), so the same reading prints on
 * paper and glows on the desk.
 */
export type ZoneName = "desk" | "paper" | "situation" | "theater" | "chrome";

export type ZoneProps = {
  readonly zone: ZoneName;
  readonly children: ReactNode;
  /** Paint the zone's own ground behind the children, for a region that is not already a surface. */
  readonly fill?: boolean;
};

export function Zone({ zone, children, fill }: ZoneProps) {
  const body = fill ? <View backgroundColor="background">{children}</View> : children;
  // The desk is the theme itself; nesting it would look for a sub-theme that does not exist.
  if (zone === "desk") return <>{body}</>;
  return <Theme name={zone}>{body}</Theme>;
}
