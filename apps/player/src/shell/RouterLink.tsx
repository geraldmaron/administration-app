import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable } from "@admin/ui";

/**
 * The router's link in the design system's shape: a real anchor on the web
 * (middle-click, copy link) and a press target on devices, with the shared
 * focus ring either way.
 */
export function RouterLink({ href, children, label, current }: { readonly href: string; readonly children: ReactNode; readonly label?: string; readonly current?: boolean }) {
  const router = useRouter();
  return (
    <Pressable href={href} role="link" aria-label={label} aria-current={current ? "page" : undefined} onPress={() => router.push(href as never)} backgroundColor="transparent">
      {children}
    </Pressable>
  );
}
