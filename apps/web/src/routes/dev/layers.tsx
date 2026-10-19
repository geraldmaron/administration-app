import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Button, Expandable, HelpTip, Sheet } from "@admin/ui-web";
import { useReviewer } from "../../review/PresidentialReview";
import type { ReviewTerms } from "../../review/review-machine";

// The layer gallery: a crowded page to check the focused layers against. Expand
// one chart and close it; the others stay their size, the picked row and the
// typed note survive, and focus returns to the control that opened it. The
// review buttons open each tier with a stand-in result; nothing is committed.
const GALLERY_ENABLED = import.meta.env.DEV;

const page = { display: "grid", gap: "var(--space-lg)", padding: "var(--space-xl)", background: "var(--color-ground-sunken)", color: "var(--color-text-primary)", minBlockSize: "100%" } as const;
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "var(--space-md)" } as const;
const card = { display: "grid", gap: "var(--space-sm)", padding: "var(--space-md)", borderRadius: "var(--radius-card)", background: "var(--color-ground-base)", boxShadow: "0 0 0 1px var(--color-border-subtle)" } as const;
const heading = { display: "flex", alignItems: "center", gap: "var(--space-xs)", margin: 0, fontSize: "var(--size-title)" } as const;

/** A small drawn series; the expanded layer draws the same one larger. */
function Chart({ seed, height }: { readonly seed: number; readonly height: number }) {
  const points = Array.from({ length: 24 }, (_, i) => 50 + 30 * Math.sin((i + seed) / 3) + ((i * 7 + seed) % 11));
  const path = points.map((value, i) => `${i === 0 ? "M" : "L"} ${(i / 23) * 300} ${100 - value}`).join(" ");
  return (
    <svg viewBox="0 0 300 100" style={{ inlineSize: "100%", blockSize: height }} role="img" aria-label={`Sample series ${seed}`}>
      <path d={path} fill="none" stroke="var(--color-blue)" strokeWidth="2" />
    </svg>
  );
}

const TERMS: Readonly<Record<"full" | "confirm", ReviewTerms>> = {
  full: { tier: "full", title: "Sign the sample order", lines: [{ label: "Order", value: "A gallery stand-in" }, { label: "Cost", value: "Nothing; this is a gallery" }], verb: "Confirm and sign", danger: false },
  confirm: { tier: "confirm", title: "Put off the sample matter", lines: [], verb: "Confirm", danger: false },
};

function ReviewButtons() {
  const reviewer = useReviewer();
  const [said, setSaid] = useState("");
  const open = async (tier: "full" | "confirm", outcome: "applied" | "refused" | "unsaved") => {
    if (!reviewer) return setSaid("No review is mounted.");
    const session = reviewer.open(TERMS[tier]);
    const confirmed = await session.decision;
    setSaid(confirmed ? "Confirmed in the gallery." : "Returned to the terms.");
    if (!confirmed) return;
    session.settle(
      outcome === "refused"
        ? { kind: "refused", words: "Time moved on in the meantime. Nothing was applied; review the terms again." }
        : { kind: "applied", date: "February 3, 2029", ...(outcome === "unsaved" ? { saveError: "The device's storage is full." } : {}) },
    );
  };
  return (
    <section style={card} aria-label="Presidential review">
      <h2 style={heading}>Presidential review</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
        <Button kind="commit" onClick={() => void open("full", "applied")}>Full review</Button>
        <Button kind="secondary" onClick={() => void open("full", "refused")}>Full, refused</Button>
        <Button kind="secondary" onClick={() => void open("full", "unsaved")}>Full, not saved</Button>
        <Button kind="secondary" onClick={() => void open("confirm", "applied")}>Short confirm</Button>
      </div>
      <p aria-live="polite">{said}</p>
    </section>
  );
}

function DevLayers() {
  const [picked, setPicked] = useState("b");
  const [note, setNote] = useState("");
  const [inspecting, setInspecting] = useState(false);
  if (!GALLERY_ENABLED) return null;
  return (
    <main style={page}>
      <h1 style={{ margin: 0 }}>Layers</h1>
      <ReviewButtons />
      <section style={card} aria-label="Selection and typed terms">
        <h2 style={heading}>
          Terms
          <HelpTip label="About these terms" more={{ title: "Terms, in depth", body: <p>The deeper explanation opens beside the page. Closing it returns focus to the information button.</p> }}>
            The short note says what this means and what you can do.
          </HelpTip>
        </h2>
        <fieldset style={{ display: "flex", gap: "var(--space-md)", border: 0, padding: 0 }}>
          {["a", "b", "c"].map((id) => (
            <label key={id}>
              <input type="radio" name="pick" value={id} checked={picked === id} onChange={() => setPicked(id)} /> Option {id.toUpperCase()}
            </label>
          ))}
        </fieldset>
        <label>
          Unsent note <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <Button kind="secondary" onClick={() => setInspecting(true)}>Open the inspector</Button>
        <Sheet open={inspecting} onClose={() => setInspecting(false)} placement="side" title="Inspector" lead="Related detail beside the page.">
          <p>The page behind keeps its selection and the unsent note.</p>
        </Sheet>
      </section>
      <div style={grid}>
        {[1, 2, 3, 4, 5, 6].map((seed) => (
          <section key={seed} style={card} aria-label={`Chart ${seed}`}>
            <h2 style={heading}>Chart {seed}</h2>
            <Expandable title={`Chart ${seed}`} lead="Sample series, drawn for the gallery." expanded={<Chart seed={seed} height={420} />}>
              <Chart seed={seed} height={120} />
            </Expandable>
          </section>
        ))}
      </div>
    </main>
  );
}

export const Route = createFileRoute("/dev/layers")({
  beforeLoad: () => {
    if (!GALLERY_ENABLED) throw notFound();
  },
  component: GALLERY_ENABLED ? DevLayers : () => null,
});
