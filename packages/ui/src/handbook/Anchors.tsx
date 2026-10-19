import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { ScrollViewInstance } from "react-native";
import { View } from "@tamagui/core";

type Registry = {
  readonly register: (id: string, node: unknown) => void;
  readonly scrollTo: (id: string) => void;
};

const AnchorContext = createContext<Registry>({ register: () => undefined, scrollTo: () => undefined });

type Measurable = { measureLayout: (relativeTo: unknown, onSuccess: (x: number, y: number) => void, onFail?: () => void) => void };
type IntoView = { scrollIntoView: (options: { block: "start"; behavior: "auto" | "smooth" }) => void };

const hasIntoView = (node: unknown): node is IntoView => typeof (node as Partial<IntoView> | null)?.scrollIntoView === "function";
const hasMeasure = (node: unknown): node is Measurable => typeof (node as Partial<Measurable> | null)?.measureLayout === "function";

/**
 * Named places inside one scrolling page, so a link can land on a section:
 * an explainer in its chapter, a letter in the A to Z. A host that can bring
 * an element into view does; otherwise the section is measured against the
 * scroll content and the page scrolls to it.
 */
export function useAnchorRegistry(scroll: React.RefObject<ScrollViewInstance | null>, content: React.RefObject<unknown>): Registry {
  const nodes = useRef(new Map<string, unknown>());
  const register = useCallback((id: string, node: unknown) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);
  const scrollTo = useCallback(
    (id: string) => {
      const node = nodes.current.get(id);
      if (hasIntoView(node)) {
        node.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      if (hasMeasure(node) && content.current) {
        node.measureLayout(content.current, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }), () => console.warn(`The section "${id}" could not be measured to scroll to it.`));
      }
    },
    [content, scroll],
  );
  return useMemo(() => ({ register, scrollTo }), [register, scrollTo]);
}

export function AnchorProvider({ registry, children }: { readonly registry: Registry; readonly children: ReactNode }) {
  return <AnchorContext.Provider value={registry}>{children}</AnchorContext.Provider>;
}

/** Scrolls the page to a named section. */
export function useScrollToAnchor(): (id: string) => void {
  return useContext(AnchorContext).scrollTo;
}

/** A section a link can land on. */
export function Anchor({ id, children }: { readonly id: string; readonly children: ReactNode }) {
  const { register } = useContext(AnchorContext);
  return (
    <View ref={(node: unknown) => register(id, node)} id={id}>
      {children}
    </View>
  );
}

/** Lands on `id` once the page has drawn, when the address names one. */
export function useLandOn(id: string | undefined): void {
  const scrollTo = useScrollToAnchor();
  useEffect(() => {
    if (!id) return undefined;
    const timer = setTimeout(() => scrollTo(id), 120);
    return () => clearTimeout(timer);
  }, [id, scrollTo]);
}
