import { landedOnCard, type Pressed } from "./press-target";

export type LinkPress = Pressed & {
  readonly button?: number;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly defaultPrevented?: boolean;
  readonly preventDefault: () => void;
};

// An app served under a subpath (GitHub Pages serves it at /<repo>/) routes
// without the prefix but must print it in an anchor's href, or a middle-click,
// copied link or reload leaves the app.
let linkBase = "";

export function configureLinkBase(base: string): void {
  linkBase = base.replace(/\/+$/, "");
}

export function anchorHref(href: string): string {
  return linkBase && href.startsWith("/") && !href.startsWith("//") ? `${linkBase}${href}` : href;
}

// The browser owns modified clicks; routing only replaces an ordinary activation.
export function pressLink(event: LinkPress, onPress: () => void): void {
  if (event.defaultPrevented || (event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !landedOnCard(event)) return;
  event.preventDefault();
  onPress();
}

// A door is a whole card or row rendered as an anchor. The browser underlines
// an anchor and that underline reaches every line of text inside it, which no
// child can undo, so the anchor itself carries none; inline links set their
// own underline.
export const DOOR_STYLE = { textDecorationLine: "none" } as const;
