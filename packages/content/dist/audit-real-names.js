import { INSTITUTION_CATALOG } from "@admin/engine";
import { worldCities, worldNations, worldStates } from "@admin/world";
// Listed only while the United States is a playable charter, so opening a second nation does not
// silently permit American nouns in a different government's room.
const USA_PLAYABLE = worldNations.some((nation) => nation.playable && String(nation.identity.government).includes("usa"));
/**
 * The real federal bodies, states and cities the game itself models. A scenario
 * about the player's own government names the National Security Agency, the FBI,
 * Texas or Houston the way a real briefing would; inventing "the security
 * directorate" in their place teaches the player nothing and reads as fiction.
 * Drawn from the engine's institution catalog and the world dataset, so a name
 * the game cannot show is still refused.
 */
export const PLAYABLE_REAL_NAMES = !USA_PLAYABLE ? [] : [
    ...INSTITUTION_CATALOG.flatMap((body) => [body.name, ...(body.abbr ? [body.abbr] : [])]),
    ...worldStates.map((state) => state.name),
    ...worldCities.filter((city) => city.nation === "USA").map((city) => city.name),
];
/**
 * The proper names of the playable government's own buildings, departments
 * and bodies. The player is the President of the United States, so prose
 * about the player's side says "the Pentagon", "the State Department", "the
 * Senate" — real names, capitalized, and not inventions. Listed only while
 * the United States is a playable charter, so opening a second nation does
 * not silently permit American nouns in a different government's room.
 */
export const PLAYABLE_INSTITUTION_NAMES = USA_PLAYABLE
    ? [
        "the Pentagon",
        "the State Department",
        "the Defense Department",
        "the Justice Department",
        "the Treasury Department",
        "the Interior Department",
        "the Commerce Department",
        "the Energy Department",
        "the Labor Department",
        "the Education Department",
        "the Agriculture Department",
        "the Transportation Department",
        "the Veterans Affairs Department",
        "the Housing Department",
        "the Health Department",
        "the Department of Homeland Security",
        "Homeland Security",
        "the Attorney General",
        "the Senate",
        "the House",
        "the Capitol",
        "the White House",
        "the West Wing",
        "the Oval Office",
        "the Situation Room",
        "the Cabinet Room",
        "the Supreme Court",
        "the Federal Reserve",
        "the Joint Chiefs",
        "the National Guard",
        "the Coast Guard",
        "the Secret Service",
        "the Vice President",
        "the Speaker",
    ]
    : [];
