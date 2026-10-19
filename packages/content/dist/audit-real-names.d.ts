/**
 * The real federal bodies, states and cities the game itself models. A scenario
 * about the player's own government names the National Security Agency, the FBI,
 * Texas or Houston the way a real briefing would; inventing "the security
 * directorate" in their place teaches the player nothing and reads as fiction.
 * Drawn from the engine's institution catalog and the world dataset, so a name
 * the game cannot show is still refused.
 */
export declare const PLAYABLE_REAL_NAMES: readonly string[];
/**
 * The proper names of the playable government's own buildings, departments
 * and bodies. The player is the President of the United States, so prose
 * about the player's side says "the Pentagon", "the State Department", "the
 * Senate" — real names, capitalized, and not inventions. Listed only while
 * the United States is a playable charter, so opening a second nation does
 * not silently permit American nouns in a different government's room.
 */
export declare const PLAYABLE_INSTITUTION_NAMES: readonly string[];
