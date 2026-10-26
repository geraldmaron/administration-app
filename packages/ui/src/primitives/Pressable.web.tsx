import { PressableFrame } from "./PressableFrame";
import { anchorHref, DOOR_STYLE, pressLink, type LinkPress } from "./link-press";
import type { PressableProps } from "./Pressable";

export type { PressableProps } from "./Pressable";

export function Pressable({ href, onPress, ...props }: PressableProps) {
  if (!href) return <PressableFrame onPress={onPress} {...props} role={props.role === undefined || props.role === "link" ? "button" : props.role} />;
  return <PressableFrame style={DOOR_STYLE} {...props} render="a" {...{ href: anchorHref(href) }} role="link" onPress={onPress ? ((event: LinkPress) => pressLink(event, () => onPress(event as never))) as never : undefined} />;
}
