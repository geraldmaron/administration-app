/**
 * How present an authored artifact — a seal, an ambiance photograph, a
 * material texture — is allowed to be behind a room's content.
 *
 * Three steps, not a dial. Every artifact in the product was previously placed
 * at whatever opacity read well on the screen it was written for, which is how
 * the same seal ended up at four different weights in four rooms and how a
 * texture ended up strong enough to compete with the readings on top of it.
 *
 * The ceiling is set by contrast, not by taste: the navy ground is dark enough
 * that a light artifact raised much above `plate` starts eating the separation
 * body copy needs from its background.
 */
export const artifact = {
    opacity: {
        /** Sensed, not read. A mark that tells you whose room this is only if you look for it. */
        whisper: 0.08,
        /** Legible as a mark, subordinate to every word on top of it. */
        watermark: 0.16,
        /** The band's subject: a photograph or material the room is composed over. */
        plate: 0.42,
    },
};
