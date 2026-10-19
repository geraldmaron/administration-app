import { portrait } from "@admin/design";
import { dress } from "./attire";
import { facialHair } from "./beard";
import { brows, ear, eyes, faceDefs, marks, mouth, neck, nose, skinShading } from "./face";
import type { FaceGenome, Mood, Treatment } from "./types";
import { coversEars, hairBack, hairFront } from "./hair";
import { HIDES_EARS, HIDES_HAIR, earrings, glasses, headwear } from "./headwear";
import { layoutFor } from "./layout";
import { eyeColor, hairPalette, skinPalette } from "./palette";
import { CX } from "./geometry";
import { effectDefs, finish } from "./effects";
import { el } from "./svg";

export type RenderOptions = {
  readonly age: number;
  /** What the moment shows on the face; the genome's resting expression when absent. */
  readonly mood?: Mood;
  /** How the surface presents the person: an official portrait unless the record says otherwise. */
  readonly treatment?: Treatment;
  /** Prefix for clip and gradient ids, unique per face when several share a document. */
  readonly id?: string;
  readonly backdrop?: boolean;
};

function backdrop(id: string): string {
  const grad = el(
    "radialGradient",
    { id: `${id}-bg`, cx: 0.5, cy: 0.36, r: 0.78 },
    el("stop", { offset: 0, "stop-color": portrait.studio.backdrop.center }) + el("stop", { offset: 0.62, "stop-color": portrait.studio.backdrop.mid }) + el("stop", { offset: 1, "stop-color": portrait.studio.backdrop.edge }),
  );
  return grad + el("rect", { width: 200, height: 200, fill: `url(#${id}-bg)` });
}

function seeded(g: FaceGenome): (i: number) => number {
  const base = g.head.width * 101 + g.eyes.size * 37 + g.nose.width * 13 + g.marks.freckles * 7;
  return (i: number) => {
    const x = Math.sin(base * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
}

const nudge = (v: number, d: number): number => Math.max(0, Math.min(1, v + d));

/** A mood moves the expression genes for one rendering; it never touches the stored face. */
export function withMood(g: FaceGenome, mood: Mood | undefined): FaceGenome {
  switch (mood) {
    case "warm":
      return { ...g, mouth: { ...g.mouth, expression: nudge(g.mouth.expression, 0.34) } };
    case "stern":
      return { ...g, mouth: { ...g.mouth, expression: nudge(g.mouth.expression, -0.3) }, brows: { ...g.brows, tilt: nudge(g.brows.tilt, -0.28) } };
    case "concerned":
      return { ...g, mouth: { ...g.mouth, expression: nudge(g.mouth.expression, -0.14) }, brows: { ...g.brows, tilt: nudge(g.brows.tilt, 0.32) } };
    case "strained":
      return { ...g, mouth: { ...g.mouth, expression: nudge(g.mouth.expression, -0.12) }, eyes: { ...g.eyes, openness: nudge(g.eyes.openness, -0.2) }, brows: { ...g.brows, tilt: nudge(g.brows.tilt, 0.15) } };
    default:
      return g;
  }
}

function treatmentDefs(id: string, treatment: Treatment): string {
  switch (treatment) {
    case "wire":
      return el("filter", { id: `${id}-tx` }, el("feColorMatrix", { type: "saturate", values: 0 }) + el("feComponentTransfer", {}, el("feFuncR", { type: "linear", slope: 1.25, intercept: -0.08 }) + el("feFuncG", { type: "linear", slope: 1.25, intercept: -0.08 }) + el("feFuncB", { type: "linear", slope: 1.25, intercept: -0.08 })));
    case "archival":
      return el("filter", { id: `${id}-tx` }, el("feColorMatrix", { type: "matrix", values: "0.39 0.69 0.18 0 0 0.35 0.62 0.16 0 0 0.27 0.48 0.13 0 0 0 0 0 1 0" }));
    case "silhouette":
      return el("filter", { id: `${id}-tx` }, el("feFlood", { "flood-color": portrait.treatment.silhouette }) + el("feComposite", { in2: "SourceAlpha", operator: "in" }));
    default:
      return "";
  }
}

export function renderFace(genome: FaceGenome, options: RenderOptions): string {
  const id = options.id ?? "f";
  const g = withMood(genome, options.mood);
  const treatment = options.treatment ?? "official";
  const L = layoutFor(g, options.age);
  const skin = skinPalette(g, L.years);
  const hair = hairPalette(g, options.age);
  const seed = Math.round(g.hair.volume * 1000 + g.head.jaw * 100);
  const hidden = HIDES_HAIR.has(g.headwear.style);
  const earsShown = !HIDES_EARS.has(g.headwear.style) && (hidden || !coversEars(g.hair.cut));
  const garment = dress(id, L, g, skin);
  const beard = facialHair(L, g, hair);
  const layers = [
    options.backdrop === false ? "" : backdrop(id),
    effectDefs(id) + faceDefs(id, L, skin, eyeColor(g.eyes.color)),
    hidden ? "" : hairBack(id, L, g, hair, seed),
    `<g transform="translate(0 ${Math.round(L.bodyShift * 100) / 100})">${garment.back}${neck(id, L, skin)}${garment.front}</g>`,
    earsShown ? ear(L, g, skin, -1) + ear(L, g, skin, 1) : "",
    skinShading(id, L, skin, g.makeup.blush),
    marks(L, g, skin, seeded(g)),
    beard.beard,
    mouth(id, L, g, skin),
    beard.mustache,
    nose(id, L, g, skin),
    eyes(id, L, g, skin),
    brows(id, L, g, hair),
    hidden ? "" : hairFront(id, L, g, hair, seed),
    headwear(id, L, g),
    glasses(L, g),
    earsShown ? earrings(L, g) : "",
  ];
  const [ground, ...figure] = layers;
  const filtered = treatment === "official" || treatment === "redacted" ? figure.join("") : `<g filter="url(#${id}-tx)">${figure.join("")}</g>`;
  const bar = treatment === "redacted" ? el("rect", { x: CX - L.cheekW - 4, y: L.eyeY - 6.5, width: (L.cheekW + 4) * 2, height: 11, fill: portrait.treatment.redaction }) : "";
  const paper = treatment === "wire" ? el("rect", { width: 200, height: 200, fill: portrait.treatment.wire }) : treatment === "archival" ? el("rect", { width: 200, height: 200, fill: portrait.treatment.archival }) : ground;
  const grade = treatment === "silhouette" ? "" : finish(id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${treatmentDefs(id, treatment)}${paper}${filtered}${bar}${grade}</svg>`;
}
