import { portrait } from "@admin/design";
import { hslToHex, mix, shift } from "./color";
import type { EyeColor, FaceGenome, HairColor, Undertone } from "./types";
import { clamp } from "./geometry";

// Skin is six tones, each with three shades and an undertone: 72 complexions.
// Tones are spaced for an even perceived step rather than an even lightness
// step, which is why the dark end is closer together in L than the light end.
export const TONES = portrait.skin.tones;

const UNDERTONE: Record<Undertone, { h: number; s: number }> = {
  neutral: { h: 0, s: 0 },
  warm: { h: 3, s: 0.03 },
  pink: { h: -6, s: 0.02 },
  olive: { h: 8, s: -0.08 },
};

export type SkinPalette = {
  readonly base: string;
  readonly shadow: string;
  readonly deep: string;
  readonly light: string;
  readonly blush: string;
  readonly lip: string;
  readonly lipLight: string;
  readonly line: string;
  /** Where lit skin turns into shadow, light scatters red beneath the surface. */
  readonly warm: string;
};

export function skinPalette(g: FaceGenome, years: number): SkinPalette {
  const tone = TONES[Math.max(0, Math.min(5, g.skin.tone - 1))]!;
  const u = UNDERTONE[g.skin.undertone];
  const l = tone.l + (g.skin.shade - 0.5) * 0.05;
  const base = hslToHex({ h: tone.h + u.h, s: tone.s + u.s - years * 0.05, l });
  const dark = tone.l < 0.45;
  const shadow = shift(base, { h: -4, s: 0.04, l: dark ? -0.075 : -0.09 });
  const deep = shift(base, { h: -7, s: 0.06, l: dark ? -0.14 : -0.2 });
  const tint = g.skin.tone <= 2 ? portrait.skin.lip.light : g.skin.tone <= 4 ? portrait.skin.lip.mid : portrait.skin.lip.deep;
  const lipAmount = g.presentation === "feminine" ? 0.5 : g.presentation === "androgynous" ? 0.34 : 0.24;
  const lip = mix(shadow, tint, lipAmount - years * 0.08);
  return {
    base,
    shadow,
    deep,
    light: shift(base, { s: -0.05, l: dark ? 0.06 : 0.05 }),
    blush: mix(base, portrait.skin.blush, g.skin.tone <= 3 ? 0.2 : 0.12),
    lip,
    lipLight: shift(lip, { l: 0.06, s: -0.02 }),
    line: mix(deep, portrait.skin.line, 0.35),
    warm: mix(base, portrait.skin.scatter, dark ? 0.28 : 0.38),
  };
}

export const HAIR: Readonly<Record<HairColor, string>> = portrait.hair.natural;

export type HairPalette = {
  readonly base: string;
  readonly shadow: string;
  readonly light: string;
  readonly brow: string;
  /** The sides and temples, which gray first. */
  readonly temple: string;
  readonly gray: number;
};

/**
 * How gray a head is at this age: nothing before the onset, then most of the
 * way over about twenty-five years. A gene rather than a table, because two
 * people of the same age differ here more than almost anywhere else.
 */
export function grayAt(onset: number, age: number): number {
  const startAge = 20 + onset * 42;
  return clamp((age - startAge) / 26);
}

export function hairPalette(g: FaceGenome, age: number): HairPalette {
  const natural = HAIR[g.hair.color];
  const gray = g.hair.dyed ? 0 : grayAt(g.hair.grayOnset, age);
  const silver = mix(portrait.hair.silver.dark, portrait.hair.silver.light, clamp((gray - 0.45) / 0.55));
  const base = mix(natural, silver, gray * 0.92);
  const isLight = gray > 0.55 || g.hair.color === "blonde" || g.hair.color === "dark-blonde";
  return {
    base,
    shadow: shift(base, { l: isLight ? -0.14 : -0.06, s: 0.02 }),
    light: shift(base, { l: isLight ? 0.06 : 0.12, s: -0.04 }),
    brow: mix(shift(natural, { l: -0.04 }), silver, gray * 0.7),
    temple: mix(natural, silver, Math.min(1, gray * 1.6 + (g.hair.dyed ? 0 : grayAt(g.hair.grayOnset, age + 8) * 0.5))),
    gray,
  };
}

export const EYES: Readonly<Record<EyeColor, string>> = portrait.eye.iris;

export function eyeColor(c: EyeColor): string {
  return EYES[c];
}
