import { createContext, useCallback, useContext, useRef, type ComponentRef } from "react";
import { AccessibilityInfo, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type View } from "react-native";

// Where a page's sections sit inside its scroll view, for a phone app. The web
// finds a section by its element id; a native view has no id to look up, so
// each Section registers its view here and the page's scroll view moves to it.

type ScrollHandle = ComponentRef<typeof ScrollView>;
type ViewHandle = ComponentRef<typeof View>;

/** One page's scroll view, the content it scrolls, and who wants to hear it move. */
export type PageScroll = {
  scroll: ScrollHandle | null;
  content: ViewHandle | null;
  y: number;
  readonly listeners: Set<() => void>;
};

const PageContext = createContext<PageScroll | null>(null);
export const PageScrollProvider = PageContext.Provider;

const anchors = new Map<string, { readonly node: ViewHandle; readonly page: PageScroll }>();

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch((error: unknown) => console.warn("Could not read the reduce-motion setting; page jumps will animate.", error));
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) => {
  reduceMotion = enabled;
});

/** The page's own scroll handle, with the props its scroll view and content take. */
export function usePageScroll() {
  const page = useRef<PageScroll>({ scroll: null, content: null, y: 0, listeners: new Set() }).current;
  return {
    page,
    scrollRef: (node: ScrollHandle | null) => {
      page.scroll = node;
    },
    contentRef: (node: ViewHandle | null) => {
      page.content = node;
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      page.y = event.nativeEvent.contentOffset.y;
      page.listeners.forEach((listener) => listener());
    },
  };
}

export function usePage(): PageScroll | null {
  return useContext(PageContext);
}

/** A ref that files a section's view under its id, for the page it sits in. */
export function useAnchor(id: string): (node: ViewHandle | null) => void {
  const page = useContext(PageContext);
  return useCallback(
    (node: ViewHandle | null) => {
      if (node && page) anchors.set(id, { node, page });
      else if (!node && anchors.get(id)?.page === page) anchors.delete(id);
    },
    [id, page],
  );
}

/** How far down its page's content an anchor sits, or null when it is not laid out. */
export function anchorTop(id: string): Promise<number | null> {
  const anchor = anchors.get(id);
  const content = anchor?.page.content;
  if (!anchor || !content) return Promise.resolve(null);
  return new Promise((resolve) => anchor.node.measureLayout(content, (_x, y) => resolve(y), () => resolve(null)));
}

/** Scroll the anchor's page so the anchor sits at the top. */
export function landOn(id: string): void {
  void anchorTop(id).then((top) => {
    if (top !== null) anchors.get(id)?.page.scroll?.scrollTo({ y: Math.max(0, top - 8), animated: !reduceMotion });
  });
}
