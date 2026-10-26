import { describe, expect, it, vi } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";

// The design system has no DOM renderer, so components are expanded by calling
// them; the hooks they use are stood in for, holding nothing between calls.
const setters: ((value: unknown) => void)[] = [];
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: (initial: unknown) => ({ current: initial }),
    useState: (initial: unknown) => {
      const set = vi.fn();
      setters.push(set);
      return [typeof initial === "function" ? (initial as () => unknown)() : initial, set];
    },
    useCallback: (fn: unknown) => fn,
  };
});
vi.mock("@tamagui/core", () => {
  const host = (defaults: Record<string, unknown> = {}) => (props: Record<string, unknown>) => createElement(String(props.render ?? "div"), { ...defaults, ...props });
  return {
    View: host(),
    styled: (_base: unknown, config: Record<string, unknown>) => host({ role: config.role, tabIndex: config.tabIndex }),
    useMedia: () => ({}),
  };
});
vi.mock("../icons/Icon", () => ({ Icon: () => null }));
vi.mock("./Text", () => ({ Text: ({ children }: { children?: ReactNode }) => createElement("span", {}, children) }));
vi.mock("./Stack", () => ({ Column: ({ children }: { children?: ReactNode }) => createElement("div", {}, children), Row: ({ children }: { children?: ReactNode }) => createElement("div", {}, children) }));
vi.mock("../layout/Fit", () => ({ useMeasuredWidth: () => [undefined, () => undefined], fitOf: () => "regular" }));
vi.mock("../data/Delta", () => ({ DeltaText: () => null }));
vi.mock("../forms/TextInput", () => ({ TextInput: () => null }));

import { keyActivation } from "./key-activation";
import { Button } from "./Button";
import { Pressable } from "./Pressable.web";
import { InlineField } from "../forms/InlineField";
import { Reading } from "../data/Reading";

type Host = { readonly type: string; readonly props: Record<string, unknown> & { onKeyDown?: (e: unknown) => void; onKeyUp?: (e: unknown) => void } };

/** Every host element the node expands to, outermost first. */
function hosts(node: ReactNode): Host[] {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return [];
  if (Array.isArray(node)) return node.flatMap(hosts);
  if (!isValidElement(node)) return [];
  const { type, props } = node as { type: unknown; props: Record<string, unknown> & { children?: ReactNode } };
  if (typeof type === "function") return hosts((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== "string") return hosts(props.children);
  return [{ type, props }, ...hosts(props.children)];
}

function buttonOf(node: ReactNode): Host {
  const found = hosts(node).find((host) => host.props.role === "button");
  if (!found) throw new Error("no role=button element");
  return found;
}

function key(el: Host, name: string, extra: Record<string, unknown> = {}) {
  return { key: name, target: el, currentTarget: el, defaultPrevented: false, preventDefault: vi.fn(), ...extra };
}

function press(el: Host, name: string, extra: Record<string, unknown> = {}) {
  el.props.onKeyDown?.(key(el, name, extra));
  el.props.onKeyUp?.(key(el, name, extra));
}

describe("keyActivation", () => {
  it("presses on Enter as the key goes down, once, and not on a held repeat", () => {
    const onPress = vi.fn();
    const keys = keyActivation(onPress);
    const el = {};
    keys.onKeyDown?.({ key: "Enter", target: el, currentTarget: el, preventDefault: vi.fn() });
    expect(onPress).toHaveBeenCalledTimes(1);
    keys.onKeyDown?.({ key: "Enter", target: el, currentTarget: el, repeat: true, preventDefault: vi.fn() });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("presses on Space only as the key comes up, and claims it on the way down so the page does not scroll", () => {
    const onPress = vi.fn();
    const keys = keyActivation(onPress);
    const el = {};
    const down = { key: " ", target: el, currentTarget: el, preventDefault: vi.fn() };
    keys.onKeyDown?.(down);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
    keys.onKeyUp?.({ key: " ", target: el, currentTarget: el, preventDefault: vi.fn() });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores a Space that went down elsewhere and came up here", () => {
    const onPress = vi.fn();
    const el = {};
    keyActivation(onPress).onKeyUp?.({ key: " ", target: el, currentTarget: el, preventDefault: vi.fn() });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("forgets a held Space when focus leaves, so coming back before the key does not press", () => {
    const onPress = vi.fn();
    const keys = keyActivation(onPress);
    const el = {};
    keys.onKeyDown?.({ key: " ", target: el, currentTarget: el, preventDefault: vi.fn() });
    keys.onBlur?.({});
    keys.onKeyUp?.({ key: " ", target: el, currentTarget: el, preventDefault: vi.fn() });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("leaves keys aimed at something inside the control alone", () => {
    const onPress = vi.fn();
    const keys = keyActivation(onPress);
    keys.onKeyDown?.({ key: "Enter", target: {}, currentTarget: {}, preventDefault: vi.fn() });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("runs the caller's own handler first and yields a key it prevents", () => {
    const onPress = vi.fn();
    const own = vi.fn();
    const el = {};
    keyActivation(onPress, { onKeyDown: own }).onKeyDown?.({ key: "Enter", target: el, currentTarget: el, defaultPrevented: true, preventDefault: vi.fn() });
    expect(own).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("button-role controls answer Enter and Space", () => {
  it("Button", () => {
    const onPress = vi.fn();
    const el = buttonOf(createElement(Button, { onPress, children: "Briefing history" }));
    press(el, "Enter");
    press(el, " ");
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("a disabled Button answers neither", () => {
    const onPress = vi.fn();
    const el = buttonOf(createElement(Button, { onPress, disabled: true, children: "Sign" }));
    press(el, "Enter");
    press(el, " ");
    expect(onPress).not.toHaveBeenCalled();
  });

  it("Pressable without an href", () => {
    const onPress = vi.fn();
    const el = buttonOf(createElement(Pressable, { onPress }));
    press(el, "Enter");
    press(el, " ");
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("a Pressable with an href stays a link the browser opens, with no Space of its own", () => {
    const onPress = vi.fn();
    const link = hosts(createElement(Pressable, { href: "/brief", onPress })).find((host) => host.props.role === "link");
    expect(link?.type).toBe("a");
    expect(link?.props.onKeyUp).toBeUndefined();
  });

  it("InlineField's read state opens the editor", () => {
    setters.length = 0;
    const el = buttonOf(createElement(InlineField, { label: "Defense share", value: 12, onChange: vi.fn() }));
    const [setOpen] = setters;
    press(el, "Enter");
    expect(setOpen).toHaveBeenCalledWith(true);
    (setOpen as ReturnType<typeof vi.fn>).mockClear();
    press(el, " ");
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it("Reading with onPress only", () => {
    const onPress = vi.fn();
    const el = buttonOf(createElement(Reading, { name: "Approval", value: "48%", onPress }));
    press(el, "Enter");
    press(el, " ");
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
