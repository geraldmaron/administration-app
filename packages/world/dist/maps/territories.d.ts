/**
 * The Natural Earth shapes that are not governments on the roster.
 *
 * The roster is every government that holds territory, so every other shape on
 * the map is territory one of them holds: drawn in the reading of the
 * government that administers it rather than dark as if the game had no view
 * of it. Greenland reads as Denmark does, Puerto Rico and Guam as the United
 * States itself. Western Sahara is the one shape administered by no roster
 * government the United Nations accepts, and is drawn as disputed rather than
 * handed to a claimant.
 */
export declare const TERRITORY_ADMINISTRATOR: Readonly<Record<string, string | null>>;
