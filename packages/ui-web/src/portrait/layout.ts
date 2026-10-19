import type { FaceGenome, FaceShape } from "./types";
import { CX, clamp, lerp, lerpPt, pt, symmetric, type Pt } from "./geometry";

// Where every feature sits, computed once from the genome and the age. Each
// renderer reads positions from here rather than deriving its own, so a wider
// jaw moves the beard, the collar and the hijab's opening together.

export type Layout = {
  readonly age: number;
  /** 0 at thirty, 1 at eighty: how far the years have worked on the face. */
  readonly years: number;
  readonly crownY: number;
  readonly hairlineY: number;
  readonly browY: number;
  readonly eyeY: number;
  readonly tipY: number;
  readonly mouthY: number;
  readonly chinY: number;
  readonly jawY: number;
  readonly cheekY: number;
  readonly templeY: number;
  readonly cheekW: number;
  readonly templeW: number;
  readonly jawW: number;
  readonly chinW: number;
  readonly crownSideW: number;
  readonly face: readonly Pt[];
  readonly eyeInner: number;
  readonly eyeW: number;
  readonly eyeH: number;
  readonly eyeTilt: number;
  readonly noseW: number;
  readonly mouthW: number;
  readonly neckW: number;
  readonly shoulderW: number;
  readonly earTop: number;
  readonly earBottom: number;
  /** How far the collar and shoulders sit from where a mid-length face puts them. */
  readonly bodyShift: number;
};

/**
 * The eight head shapes portrait artists sort faces into, as proportions of
 * one base width: how wide the temples, cheeks and jaw run, how broad the
 * chin, how long the face, and how sharp the jaw's corner.
 */
type Archetype = {
  readonly temple: number;
  readonly cheek: number;
  readonly jaw: number;
  readonly chin: number;
  readonly length: number;
  readonly corner: number;
  /** The jawline's superellipse exponent: 2 is round, higher is broad and square, lower tapers to a point. */
  readonly squareness: number;
};

const ARCHETYPES: Record<FaceShape, Archetype> = {
  oval: { temple: 0.97, cheek: 1, jaw: 0.76, chin: 0.9, length: 0, corner: 0, squareness: 2.1 },
  round: { temple: 0.99, cheek: 1.03, jaw: 0.84, chin: 1.15, length: -3.5, corner: 0, squareness: 2.2 },
  square: { temple: 1, cheek: 1, jaw: 0.88, chin: 1.25, length: -2, corner: 0.7, squareness: 3.2 },
  oblong: { temple: 0.95, cheek: 0.95, jaw: 0.79, chin: 1, length: 6.5, corner: 0.2, squareness: 2.4 },
  heart: { temple: 1.03, cheek: 1, jaw: 0.72, chin: 0.6, length: 1, corner: 0, squareness: 1.65 },
  diamond: { temple: 0.89, cheek: 1.03, jaw: 0.74, chin: 0.7, length: 2.5, corner: 0, squareness: 1.75 },
  triangle: { temple: 0.88, cheek: 0.96, jaw: 0.88, chin: 1.15, length: 0, corner: 0.45, squareness: 2.8 },
  rectangle: { temple: 0.98, cheek: 0.97, jaw: 0.86, chin: 1.2, length: 5.5, corner: 0.6, squareness: 2.9 },
};

const PRESENTATION_JAW = { masculine: 0.04, feminine: -0.05, androgynous: 0 } as const;

type Frame = { crownY: number; templeW: number; cheekW: number; cheekY: number; jawW: number; jawY: number; chinY: number; sag: number; n: number };

/**
 * The jawline from its corner to the chin as a superellipse quarter: the one
 * curve that runs from a pointed chin through a round one to a broad square
 * jaw as a single exponent rises. Jowls pull the middle of it out and down.
 */
function jawline(m: Frame): Pt[] {
  const depth = m.chinY - m.jawY;
  return [0.3, 0.55, 0.78, 0.93].map((t) => {
    const theta = (t * Math.PI) / 2;
    const e = 2 / m.n;
    const sag = m.sag * Math.sin(Math.PI * t);
    return pt(CX + m.jawW * Math.pow(Math.cos(theta), e) + sag * 3.5, m.jawY + depth * Math.pow(Math.sin(theta), e) + sag * 2.2);
  });
}

/**
 * A square jaw is a corner, not a bump: two points placed on the straight lines
 * into and out of the jaw's angle pull the curve tight around it, and the closer
 * they sit, the sharper it turns. No point ever leaves the line it sits on.
 */
function outline(a: Archetype, m: Frame): Pt[] {
  const k = a.corner;
  const cheek = pt(CX + m.cheekW, m.cheekY);
  const gonion = pt(CX + m.jawW, m.jawY);
  const arc = jawline(m);
  const reach = 0.26 - 0.2 * k;
  const corner = k > 0.15 ? [lerpPt(gonion, cheek, reach), gonion] : [gonion];
  return symmetric([
    pt(CX, m.crownY),
    pt(CX + m.templeW * 0.76, m.crownY + 8),
    pt(CX + m.templeW, m.crownY + 23),
    pt(CX + m.templeW + 0.2, 66),
    cheek,
    ...corner,
    ...arc,
    pt(CX, m.chinY),
  ]);
}

/** Anything that rests on the shoulders moves with them when a face's length moves the collar. */
export function onShoulders(L: Layout, points: readonly Pt[]): Pt[] {
  return points.map((p) => (p.y > 138 ? pt(p.x, p.y + L.bodyShift) : p));
}

export function layoutFor(g: FaceGenome, age: number): Layout {
  const years = clamp((age - 30) / 50);
  const soft = g.presentation === "feminine" ? 1 : g.presentation === "androgynous" ? 0.5 : 0;
  const build = g.head.build;
  const a = ARCHETYPES[g.head.shape];
  const sag = Math.max(0, years - 0.4);

  const crownY = 31.5 - g.head.forehead * 3 - Math.max(0, a.length) * 0.2;
  const eyeY = 84 + (g.head.length - 0.5) * 3;
  const chinY = 125.5 + g.head.length * 8 + a.length + build * 1.5 + years * 1.2 - soft * 1.5;
  const base = 31 + g.head.width * 4.2 + build * 1.6 - soft * 1.3;
  const cheekW = base * a.cheek;
  const templeW = base * a.temple - g.head.cheekbones * 1.6 + soft * 0.3;
  const jawRatio = clamp(a.jaw + (g.head.jaw - 0.5) * 0.14 + PRESENTATION_JAW[g.presentation] + build * 0.03, 0.6, g.presentation === "feminine" ? 0.86 : 0.92);
  const jawW = cheekW * jawRatio + years;
  const chinW = (3 + g.head.chin * 4.2) * a.chin - soft * 0.8 + build * 0.6;
  // Features sit at fractions of the eye-to-chin span rather than at fixed
  // offsets, so a short face and a long one keep human proportions: the nose
  // ends a little under halfway down, the mouth a third of the way from nose to
  // chin, and the jaw's corner between the mouth and the chin.
  const lower = chinY - eyeY;
  const tipY = eyeY + lower * (0.38 + g.nose.length * 0.1) + years * 1.2;
  const mouthY = tipY + (chinY - tipY) * 0.36;
  const jawY = Math.min(chinY - 11, mouthY - 1.5 + g.head.jaw * 3 + years * 2.5);
  const cheekY = 88 + (1 - g.head.cheekbones) * 3;

  const eyeW = 11.4 + g.eyes.size * 3.6 - years * 0.4;
  const openness = clamp(g.eyes.openness - years * 0.35 + (g.eyes.shape === "round" ? 0.25 : 0) - (g.eyes.shape === "mono" ? 0.12 : 0));
  const baseTilt = (g.eyes.tilt - 0.5) * 2.8;

  return {
    age,
    years,
    crownY,
    hairlineY: 43 + g.head.forehead * 9,
    browY: eyeY - 8 - g.brows.height * 3.4,
    eyeY,
    tipY,
    mouthY,
    chinY,
    jawY,
    cheekY,
    templeY: 66,
    cheekW,
    templeW,
    jawW,
    chinW,
    crownSideW: templeW * 0.76,
    face: outline(a, { crownY, templeW, cheekW, cheekY, jawW, jawY, chinY, sag, n: Math.max(1.4, a.squareness + (g.head.chin - 0.5) * 0.9 - soft * 0.2) }),
    eyeInner: 5.2 + g.eyes.spacing * 3.8,
    eyeW,
    eyeH: eyeW * (0.27 + openness * 0.12),
    eyeTilt: g.eyes.shape === "downturned" ? baseTilt - 1.4 : baseTilt,
    noseW: 5.2 + g.nose.width * 4.8 + build * 0.6 - soft * 0.6 + years * 0.5,
    mouthW: 8 + g.mouth.width * 5.6 + (1 - soft) * 0.6,
    neckW: cheekW * lerp(0.46, 0.37, soft) + build * 2,
    shoulderW: lerp(76, 66, soft) + build * 6,
    earTop: eyeY - 5,
    earBottom: tipY + 2.5,
    bodyShift: clamp(chinY - 131, -10, 8) - 2.5,
  };
}
