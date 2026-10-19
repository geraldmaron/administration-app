import { useEffect } from "react";
import { scrollToSection } from "./SectionNav.web";

// A link that names a part of a page (`/world/nation/CN/act#act-situation`)
// lands there on every page, not only on pages with a section bar, and the
// card it lands on is ringed for a moment so the eye finds what the link was
// about. A saved game can take seconds to open and parts below the fold lay
// out late, so the landing keeps looking for its target for a while.

const LOOK_EVERY_MS = 200;
const LOOK_FOR_MS = 6000;
const RING_MS = 2400;

function ring(target: HTMLElement): void {
  const before = { outline: target.style.outline, offset: target.style.outlineOffset };
  target.setAttribute("data-landed", "true");
  target.style.outline = "3px solid var(--accent, currentColor)";
  target.style.outlineOffset = "3px";
  window.setTimeout(() => {
    target.removeAttribute("data-landed");
    target.style.outline = before.outline;
    target.style.outlineOffset = before.offset;
  }, RING_MS);
}

/** Lands the page on the address's hash once it has laid out, and rings what it landed on. */
export function useHashLanding(): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!id) return;
    let looked = 0;
    const timer = window.setInterval(() => {
      looked += LOOK_EVERY_MS;
      const target = document.getElementById(id);
      if (!target && looked < LOOK_FOR_MS) return;
      window.clearInterval(timer);
      if (!target) return;
      scrollToSection(id);
      ring(target);
    }, LOOK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);
}
