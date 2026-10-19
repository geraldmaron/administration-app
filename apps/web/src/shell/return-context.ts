/** Transient navigation context, keyed by the exact local address; never saved with a campaign. */
type ReturnContext = { readonly top: number; readonly href?: string; readonly controlId?: string; readonly occurrence: number };
const contexts = new Map<string, ReturnContext>();

export function rememberDeparture(link: HTMLElement | SVGElement): void {
  const body = link.closest<HTMLElement>(".ui-surface__body");
  if (!body) return;
  const matches = [...body.querySelectorAll<HTMLAnchorElement>("a")].filter((a) => a.getAttribute("href") === link.getAttribute("href"));
  contexts.set(location.pathname + location.search, { top: body.scrollTop, href: link.getAttribute("href") ?? undefined, occurrence: matches.findIndex((a) => a === link), ...(link.id ? { controlId: link.id } : {}) });
  if (contexts.size > 40) contexts.delete(contexts.keys().next().value!);
}

export function restoreArrival(): boolean {
  const key = location.pathname + location.search;
  const context = contexts.get(key);
  const body = document.querySelector<HTMLElement>(".ui-surface__body");
  if (!context || !body) return false;
  contexts.delete(key);
  // A new gesture owns focus and scroll; a queued return must not undo it.
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  const inputs = ["pointerdown", "keydown", "wheel"] as const;
  for (const input of inputs) document.addEventListener(input, interrupt, true);
  requestAnimationFrame(() => {
    for (const input of inputs) document.removeEventListener(input, interrupt, true);
    if (interrupted || !body.isConnected || location.pathname + location.search !== key) return;
    body.scrollTo({ top: context.top, behavior: "instant" });
    if (context.controlId) {
      const control = document.getElementById(context.controlId);
      if (control && body.contains(control)) { control.focus({ preventScroll: true }); return; }
    }
    const links = [...body.querySelectorAll<HTMLAnchorElement>("a")].filter((a) => a.getAttribute("href") === context.href);
    links[context.occurrence]?.focus({ preventScroll: true });
  });
  return true;
}
