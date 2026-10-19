// The few haiku the game says aloud. A haiku is for a moment that has nothing
// to teach (a welcome, an empty page, a wait, a goodbye), so it never carries a
// figure or an instruction, and the screen that shows one says what to do in a
// plain sentence first. Each line declares its syllables so the test can hold
// the five-seven-five shape when a line is edited.
export const HAIKU = {
    "title-welcome": [
        { text: "Night on the White House", syllables: 5 },
        { text: "a lamp lit in the office", syllables: 7 },
        { text: "the work starts at dawn", syllables: 5 },
    ],
    "nothing-yet": [
        { text: "Nothing here for now", syllables: 5 },
        { text: "the last page waits to be filled", syllables: 7 },
        { text: "as the term goes on", syllables: 5 },
    ],
    "oath-sealing": [
        { text: "The hand on the book", syllables: 5 },
        { text: "the words said, the seal pressed down", syllables: 7 },
        { text: "a new term begins", syllables: 5 },
    ],
    "term-end": [
        { text: "The desk is cleared off", syllables: 5 },
        { text: "someone new will sit here next", syllables: 7 },
        { text: "the lights are turned down", syllables: 5 },
    ],
};
/** The three lines of a haiku, in order, as the words a screen shows. */
export function haikuLines(id) {
    const [first, second, third] = HAIKU[id];
    return [first.text, second.text, third.text];
}
