import { useId, useMemo } from "react";
import { View } from "@tamagui/core";
import { SvgXml } from "react-native-svg";
import type { FaceGenome } from "@admin/world";
import { Monogram } from "../dossier/Readings";
import { renderFace } from "./render";
import type { Mood, Treatment } from "./types";

/** The shape of player-core's PortraitSpec, declared here because this package cannot import it. */
export type PortraitFace = {
  readonly key: string;
  readonly genome: FaceGenome;
  readonly age: number;
  readonly mood?: Mood;
  readonly treatment?: Treatment;
};

export type PartyRing = "partyDem" | "partyRep" | "partyInd";

export type PortraitProps = {
  /** Absent for a person with no drawn face: their initials stand in. */
  readonly face?: PortraitFace | undefined;
  readonly name: string;
  readonly size: number;
  /** The person's party, as a fact about them; never a selection state. */
  readonly ring?: PartyRing | undefined;
  readonly shape?: "circle" | "square";
  /** Set where the name is written beside the face, so a reader hears it once. */
  readonly decorative?: boolean;
  readonly muted?: boolean;
};

const RING_WIDTH = 2;

/** A person's face, drawn from their own record, or their initials when the record has none yet. */
export function Portrait({ face, name, size, ring, shape = "circle", decorative, muted }: PortraitProps) {
  const square = shape === "square";
  const uid = useId().replace(/[^A-Za-z0-9]/g, "");
  const key = face?.key;
  const svg = useMemo(
    () => (face ? renderFace(face.genome, { age: face.age, id: `pf${uid}`, ...(face.mood ? { mood: face.mood } : {}), ...(face.treatment ? { treatment: face.treatment } : {}) }) : undefined),
    // The key names the person, age, mood and treatment, so it stands for the whole spec.
    [key, uid],
  );
  const inner = ring ? size - RING_WIDTH * 2 : size;
  const label = decorative ? { "aria-hidden": true } : { role: "img" as const, "aria-label": name };
  if (!svg) {
    return ring ? (
      <View width={size} height={size} borderRadius={square ? "control" : "pill"} borderWidth={RING_WIDTH} borderColor={ring} alignItems="center" justifyContent="center" {...label}>
        <Monogram name={name} size={inner} square={square} {...(muted ? { muted } : {})} />
      </View>
    ) : (
      <View {...label}>
        <Monogram name={name} size={size} square={square} {...(muted ? { muted } : {})} />
      </View>
    );
  }
  return (
    <View width={size} height={size} borderRadius={square ? "control" : "pill"} borderWidth={ring ? RING_WIDTH : 0} borderColor={ring ?? "transparent"} overflow="hidden" backgroundColor="surfaceRaised" {...label}>
      <SvgXml xml={svg} width={inner} height={inner} />
    </View>
  );
}
