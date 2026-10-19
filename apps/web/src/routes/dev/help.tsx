import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { EXPLAINERS, GLOSSARY } from "@admin/player-core";
import { ExplainerView, GlossaryCard } from "../../help";

// Every explainer and glossary entry through the help views, for the people
// writing the copy to see how it draws. A diagnostic, not a screen.
const GALLERY_ENABLED = import.meta.env.DEV;

function DevHelp() {
  const [swapped, setSwapped] = useState<Readonly<Record<string, string>>>({});
  if (!GALLERY_ENABLED) return null;
  return (
    <div style={{ blockSize: "100%", overflowY: "auto", background: "var(--color-ground-base)", color: "var(--color-text-primary)" }}>
    <div style={{ display: "grid", gap: "var(--space-2xl)", padding: "var(--space-xl)", maxInlineSize: "80rem", marginInline: "auto" }}>
      <h1>Help ({EXPLAINERS.length} explainers, {GLOSSARY.length} terms)</h1>
      <section aria-labelledby="dev-explainers">
        <h2 id="dev-explainers">Explainers</h2>
        {EXPLAINERS.map((item) => {
          const shown = EXPLAINERS.find((candidate) => candidate.id === swapped[item.id]) ?? item;
          return (
            <section key={item.id} id={item.id} aria-labelledby={`dev-${item.id}`} style={{ marginBlockEnd: "var(--space-2xl)" }}>
              <h3 id={`dev-${item.id}`}>{shown.title} <code>{shown.id}</code></h3>
              <ExplainerView explainer={shown} onOpen={(next) => setSwapped((now) => ({ ...now, [item.id]: next }))} />
            </section>
          );
        })}
      </section>
      <section aria-labelledby="dev-terms">
        <h2 id="dev-terms">Terms</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))", gap: "var(--space-md)" }}>
          {GLOSSARY.map((entry) => <div key={entry.id} id={entry.id}><GlossaryCard entry={entry} /></div>)}
        </div>
      </section>
    </div>
    </div>
  );
}

export const Route = createFileRoute("/dev/help")({
  beforeLoad: () => {
    if (!GALLERY_ENABLED) throw notFound();
  },
  component: GALLERY_ENABLED ? DevHelp : () => null,
});
