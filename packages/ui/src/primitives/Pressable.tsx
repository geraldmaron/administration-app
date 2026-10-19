import type { ComponentProps } from "react";
import { PressableFrame } from "./PressableFrame";

export type PressableProps = ComponentProps<typeof PressableFrame> & { readonly href?: string };

export function Pressable({ href: _href, ...props }: PressableProps) {
  return <PressableFrame {...props} />;
}
