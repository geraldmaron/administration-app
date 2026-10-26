import { describe, expect, it, vi } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";
import { alignedMoves, sharedMoves } from "./outcome-moves";
import { pressLink, type LinkPress } from "../primitives/link-press";
import type { EffectView, OutcomeView } from "./types";

vi.mock("@tamagui/core", () => ({ View: ({ children }: { children?: ReactNode }) => createElement("div", {}, children) }));
vi.mock("../primitives/PressableFrame", () => ({
  PressableFrame: ({ render, href, children, role, ...props }: { render?: string; href?: string; children?: ReactNode; role?: string; "aria-label"?: string }) =>
    createElement(render ?? "div", { href, role, "aria-label": props["aria-label"] }, children),
}));
vi.mock("../primitives/Button", async () => ({ Pressable: (await import("../primitives/Pressable.web")).Pressable, Button: () => null }));
vi.mock("../primitives/Surface", () => ({ Surface: ({ render, href, children, ...props }: { render?: string; href?: string; children?: ReactNode; "aria-label"?: string }) => createElement(render ?? "div", { href, "aria-label": props["aria-label"] }, children) }));
vi.mock("../primitives/Stack", () => ({ Column: ({ children }: { children?: ReactNode }) => createElement("div", {}, children), Row: ({ children }: { children?: ReactNode }) => createElement("div", {}, children) }));
vi.mock("../primitives/Text", () => ({ Text: ({ children }: { children?: ReactNode }) => createElement("span", {}, children) }));
vi.mock("../primitives/CountDot", () => ({ CountDot: () => null }));
vi.mock("../icons/Icon", () => ({ Icon: () => null }));

import { Pressable } from "../primitives/Pressable.web";
import { EntityLink, RelatedRail } from "../context/EntityLink";
import { CardLink } from "../primitives/CardLink.web";
import { PressRow } from "../primitives/PressRow.web";
import { NotificationList } from "../calendar/Inbox";
import { EntryRow } from "../record/EntryRow";

/** Expands function components down to host elements, so the doors can be read as markup without a DOM renderer in the design system. */
function renderToStaticMarkup(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToStaticMarkup).join("");
  if (!isValidElement(node)) return "";
  const { type, props } = node as { type: unknown; props: Record<string, unknown> & { children?: ReactNode } };
  if (typeof type === "function") return renderToStaticMarkup((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== "string") return renderToStaticMarkup(props.children);
  const attrs = ["href", "role", "aria-label"].flatMap((name) => (typeof props[name] === "string" ? [` ${name}="${String(props[name])}"`] : []));
  return `<${type}${attrs.join("")}>${renderToStaticMarkup(props.children)}</${type}>`;
}

const effect = (metric: string, value: number): EffectView => ({ metric, label: metric, value, unit: "pts", text: String(value), tone: value > 0 ? "favorable" : "adverse" });
const outcome = (effects: readonly EffectView[]): OutcomeView => ({ effects, cost: { text: "Free" }, details: [] });
const event = (extra: Partial<LinkPress> = {}): LinkPress => ({ target: null, currentTarget: null, preventDefault: vi.fn(), ...extra });

describe("content doors", () => {
  it("renders named anchors for names, related doors and record rows", () => {
    const nodes = [
      createElement(CardLink, { href: "/nation", label: "Nation", onPress: vi.fn(), children: "National condition" }),
      createElement(PressRow, { href: "/congress", label: "Congress", onPress: vi.fn(), children: "Congress" }),
      createElement(NotificationList, { items: [{ id: "news", href: "/press", title: "New story", summary: "The wire has filed", dateLabel: "Today", sourceLabel: "News", icon: "press", urgency: "soft", read: false, actionable: false, onPress: vi.fn() }] }),
      createElement(EntityLink, { href: "/person/secretary", label: "The Secretary", onPress: vi.fn() }),
      createElement(RelatedRail, { items: [{ id: "office", href: "/office/defense", label: "Defense", onPress: vi.fn() }] }),
      createElement(EntryRow, { href: "/record?entry=order", onPress: vi.fn(), entry: { id: "order", mark: "record", tone: "gold", date: "Today", actor: "You", headline: "Signed the order", moves: [], more: 0 } }),
    ];
    for (const node of nodes) {
      const html = renderToStaticMarkup(node);
      expect(html).toMatch(/<a[^>]*href="[^"]+"[^>]*aria-label="[^"]+"/);
    }
  });

  it("keeps an ordinary activation routed and leaves modified clicks to the browser", () => {
    const onPress = vi.fn();
    const ordinary = event();
    pressLink(ordinary, onPress);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(ordinary.preventDefault).toHaveBeenCalledOnce();
    for (const extra of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
      const modified = event(extra);
      pressLink(modified, onPress);
      expect(modified.preventDefault).not.toHaveBeenCalled();
    }
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("leaves an inner control and a portaled sheet independent of the row", () => {
    const onPress = vi.fn();
    for (const contained of [true, false]) {
      const inner = {};
      const nested = event({ target: { closest: () => inner }, currentTarget: { contains: () => contained } });
      pressLink(nested, onPress);
      expect(nested.preventDefault).not.toHaveBeenCalled();
    }
    expect(onPress).not.toHaveBeenCalled();
  });

  it("keeps actions without a destination as press targets", () => {
    expect(renderToStaticMarkup(createElement(Pressable, { onPress: vi.fn(), "aria-label": "Open help" }))).not.toContain("<a");
  });
});

describe("comparison reading positions", () => {
  it("keeps metric positions when each option has a different largest move", () => {
    const outcomes = [outcome([effect("Standing", 8), effect("Stability", 2)]), outcome([effect("Stability", -9), effect("Readiness", 1)]), outcome([effect("Readiness", 10), effect("Standing", 0)])];
    const readings = sharedMoves(outcomes);
    const rows = outcomes.map((item) => alignedMoves(item, readings, new Map([["pts", 10]])));
    expect(rows.map((row) => row.map(({ effect }) => effect.metric))).toEqual(Array(3).fill(["Standing", "Stability", "Readiness"]));
    expect(rows.map((row) => row.find((item) => item.largest)?.effect.metric)).toEqual(["Standing", "Stability", "Readiness"]);
    expect(rows[1]![0]!.effect).toMatchObject({ value: 0, text: "No change", tone: "neutral" });
    expect(rows[2]![0]!.effect.value).toBe(0);
    expect(outcomes[1]!.effects).toHaveLength(2);
  });

  it("keeps empty and flat outcomes aligned without a false largest move", () => {
    const readings = sharedMoves([outcome([effect("Approval", 0)]), undefined]);
    const row = alignedMoves(outcome([]), readings, new Map());
    expect(row).toHaveLength(1);
    expect(row[0]).toMatchObject({ largest: false, effect: { value: 0, label: "Approval" } });
    expect(sharedMoves([undefined])).toEqual([]);
  });
});
