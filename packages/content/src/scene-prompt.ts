import type { ScenarioClass } from "./scenario.js";
import type { SceneFacets, SceneRegister, SceneSite } from "./scene.js";

// The photograph that runs beside a dispatch.
//
// Scenes illustrate a dispatch's setting and condition. They do not prove
// an event occurred. Ambient imagery has a separate role.
//
// Three constraints do the work, and all three are about staying out of
// trouble rather than about style:
//
//  1. **No identifiable faces, ever.** A generated face on a news photo courts
//     a real-person-likeness problem the portrait catalogue is already set up
//     to handle properly. Figures are distant, turned away, or backlit.
//  2. **No identifiable real places.** A parliament, not the Palace of
//     Westminster. The nations are real, but a scene is cast onto whichever one
//     the board picked, so a recognizable landmark would name a country the
//     scenario is not allowed to name.
//  3. **No text, insignia or flags.** The same rail the portraits carry: a
//     legible banner or a national flag turns a generic scene into a claim
//     about a specific country.

/** How wide a dispatch photograph sits above its story. */
export const SCENE_STANDARD = {
  format: "webp",
  width: 768,
  height: 432,
  maxBytes: 60_000,
  aspect: "16:9",
} as const;

export const SCENE_NEGATIVE_PROMPTS: readonly string[] = [
  "identifiable face",
  "recognizable person",
  "real person likeness",
  "portrait",
  "close-up of a face",
  "text",
  "signage with readable words",
  "watermark",
  "logo",
  "national flag",
  "military insignia",
  "recognizable real landmark",
  "illustration",
  "cartoon",
  "3d render",
  "gore",
  "visible injury",
  "children in distress",
];

// Added to the negatives for every register except `damaged`. See scenePrompt.
const RESTRAINT_NEGATIVES: readonly string[] = [
  "destroyed building",
  "collapsed structure",
  "rubble",
  "burnt-out vehicle",
  "wreckage",
  "fire",
  "smoke",
  "explosion",
  "bomb damage",
  "shell holes",
  "war zone",
  "ruins",
];

// Shared photographic framing; the site and condition choose the lighting.
// Keep color detail rather than forcing every scene into a desaturated grade.
const GRADE = [
  "photojournalism, press wire photograph",
  "natural available light",
  "documentary realism",
  "natural color, scene-specific tonal contrast, preserve meaningful color detail",
  "wide establishing shot",
  "no people in the foreground",
  "sharp focus, photorealistic",
].join(", ");

// What marks the place as *this* kind of event, and nothing else.
//
// Evidence only, never a whole scene, and that restraint is what makes the
// faceted stills work. A subject line like "a damaged apartment block on
// an empty street ... low winter light" names a place and a condition as well
// as an event, so composing it with a site and a register triple-specifies
// both and the class wins: asking for a war at a shipping strait returned an
// apartment block with some water behind it. These entries name only the
// evidence — what a photographer would point at to show what happened — and
// leave where the camera stands to SITE_SETTING and what state the place is in
// to REGISTER_CONDITION. Each axis says one thing exactly once.
const SCENE_EVIDENCE: Readonly<Record<ScenarioClass, string>> = {
  tragedy: "a small improvised memorial of flowers and candles against a barrier",
  terror: "police tape across a cordon, scattered debris swept to one side, a lone emergency vehicle at distance",
  unrest: "trampled placards, overturned barriers and scorch marks on the ground",
  disaster: "standing floodwater and silt lines up the walls, sandbags where they failed",
  "public-health": "a temporary medical tent and empty gurneys behind plastic sheeting",
  migration: "a line of tents and gray blankets against a wire perimeter fence",
  "foreign-crisis": "a hastily set diplomatic table under an awning, chairs unoccupied",
  war: "military damage — shell scars across the facades, a burnt-out vehicle, an abandoned sandbag position",
  espionage: "a forced service door and a cable trunk pulled open, equipment cases left behind",
  hostage: "police lines and vehicle barricades holding a perimeter at distance",
  technology: "a failed installation of dark equipment cabinets, one console still lit",
  economy: "steel roller shutters closed across every frontage, an empty loading bay",
  scandal: "a bare lectern and rows of vacant press seating, cable runs taped to the ground",
  justice: "a court building's steps and barriers, an empty press pen at the foot of them",
  institution: "a sealed official entrance, notices pasted to the glass, barriers across the approach",
  culture: "a shuttered public venue with its billboards stripped bare",
  death: "black drapery hung at an official entrance and a closed book of condolence on a stand",
  triumph: "bunting and a prepared dais with empty seating set in rows",
};

// Where a class's evidence is physically different, and not merely relocated.
//
// Most classes look the same wherever they happen — a shuttered frontage is a
// shuttered frontage on any street. A few do not, and water is the sharp case:
// war on a strait is a vessel and a search pattern, not shell scars, because
// there is nothing at sea to shell. Composing the land evidence with a
// maritime setting produced the literal defect this table fixes — a wrecked
// street with a channel behind it, for a scenario about an aircraft down in
// open water.
//
// Deliberately sparse. An entry here earns its place by naming an event the
// generic line would get *physically wrong*, not by being a nicer sentence.
const EVIDENCE_AT: Partial<Record<ScenarioClass, Partial<Record<SceneSite, string>>>> = {
  war: {
    coast: "a naval patrol vessel standing off a quay, deck equipment shrouded, mooring lines out",
    chokepoint: "a gray patrol vessel holding station mid-channel and a marker buoy on the water, a search pattern of small craft in the distance",
  },
  terror: {
    chokepoint: "a harbor patrol cordon on the water, small craft holding a line, floating markers",
  },
  migration: {
    coast: "an overloaded open boat drawn up on the shingle, life jackets left in it",
    chokepoint: "a small overloaded boat low in the channel, a coastguard launch alongside",
  },
  hostage: {
    coast: "a cordoned quay, police launches holding the water approach at distance",
    chokepoint: "a vessel held mid-channel under watch, patrol craft standing off it",
  },
  disaster: {
    coast: "a storm-wrecked harbor front, fishing boats thrown up onto the quay",
    chokepoint: "debris rafts drifting in the channel, a shoreline stripped by water",
  },
  espionage: {
    chokepoint: "a survey vessel stopped over a cable route, a marker buoy and a cable drum on deck",
    coast: "a landing station's fenced compound at the shore, a cable trench open to the waterline",
  },
};

// Where the photograph is taken. Written as places rather than as adjectives,
// because a model given "coastal" returns a postcard and a model given "a
// working harbor front, quays and bollards, water at the edge of frame"
// returns somewhere a wire photographer could have stood.
const SITE_SETTING: Readonly<Record<SceneSite, string>> = {
  capital: "in the government quarter of a capital, institutional stone and wide pavements",
  city: "on an ordinary city street away from any capital, mid-rise blocks and shopfronts",
  coast: "on a working harbor front, quays and bollards, open water at the edge of frame",
  border: "at a land frontier crossing, barriers and a checkpoint lane, flat open ground beyond",
  interior: "deep in the provinces, low country buildings and utility structures, open land around them",
  chokepoint: "on a narrow shipping strait seen from the shore, a channel and its far bank",
};

// What has happened to it. This carries the light as well as the condition,
// because the two are the same decision to a photographer: nothing reads as
// "after" like the wrong hour of the day.
const REGISTER_CONDITION: Readonly<Record<SceneRegister, string>> = {
  intact: "everything intact and in working order, nothing damaged, ordinary overcast daylight",
  // Kept free of street furniture so it reads on water as well as on a road:
  // "barriers and closures" is nonsense in a channel, and the maritime sites
  // are exactly where this register does its most useful work.
  strained: "interrupted but structurally undamaged — activity halted, the place held and watched, everything still standing — flat gray afternoon light",
  damaged: "after the event: structural damage, debris, blackened or broken surfaces, cold low light",
  ceremonial: "formally prepared for an occasion, clean and dressed and waiting, warm low light",
};

/**
 * The prompt for one dispatch photograph, and the negatives that go with it.
 *
 * Deterministic per facet tuple, so a still regenerated later gets the same
 * instruction rather than whatever the composer happened to say that day.
 *
 * Composed on three axes rather than written per image for the same reason the
 * portrait prompt is: 18 classes across 6 sites and 4 registers is 432
 * photographs, and hand-authoring 432 subject lines produces 432 chances to
 * drift the grade. The class says what the event is, the site says where the
 * camera is, the register says what state the place is in — and the grade,
 * shared by the photographic pipeline, is what lets a still generated today sit beside
 * one generated last month.
 */
export function scenePrompt(facets: SceneFacets): { prompt: string; negative: string } {
  const evidence = EVIDENCE_AT[facets.kind]?.[facets.site] ?? SCENE_EVIDENCE[facets.kind];
  const prompt = [evidence, SITE_SETTING[facets.site], REGISTER_CONDITION[facets.register], GRADE].join(", ");
  // Destruction is refused outright unless the register asked for it. Image
  // models reach for catastrophe on any war or terror cue — the class word
  // alone is enough — and a picture that outruns its scenario is a lie the
  // briefing tells before the player has read a word of it. Saying "undamaged"
  // in the positive prompt did not hold; naming the wreckage as forbidden does.
  const negative =
    facets.register === "damaged"
      ? SCENE_NEGATIVE_PROMPTS.join(", ")
      : [...SCENE_NEGATIVE_PROMPTS, ...RESTRAINT_NEGATIVES].join(", ");
  return { prompt, negative };
}

/** The single instruction sent to an image model. */
export function sceneInstruction(facets: SceneFacets): string {
  const { prompt, negative } = scenePrompt(facets);
  return [
    `Generate a single ${SCENE_STANDARD.width}x${SCENE_STANDARD.height} (${SCENE_STANDARD.aspect}) image.`,
    `${prompt}.`,
    `Do not include: ${negative}.`,
  ].join("\n\n");
}
