export type HaikuLine<Count extends number> = {
    readonly text: string;
    readonly syllables: Count;
};
export type Haiku = readonly [HaikuLine<5>, HaikuLine<7>, HaikuLine<5>];
export declare const HAIKU: {
    readonly "title-welcome": readonly [{
        readonly text: "Night on the White House";
        readonly syllables: 5;
    }, {
        readonly text: "a lamp lit in the office";
        readonly syllables: 7;
    }, {
        readonly text: "the work starts at dawn";
        readonly syllables: 5;
    }];
    readonly "nothing-yet": readonly [{
        readonly text: "Nothing here for now";
        readonly syllables: 5;
    }, {
        readonly text: "the last page waits to be filled";
        readonly syllables: 7;
    }, {
        readonly text: "as the term goes on";
        readonly syllables: 5;
    }];
    readonly "oath-sealing": readonly [{
        readonly text: "The hand on the book";
        readonly syllables: 5;
    }, {
        readonly text: "the words said, the seal pressed down";
        readonly syllables: 7;
    }, {
        readonly text: "a new term begins";
        readonly syllables: 5;
    }];
    readonly "term-end": readonly [{
        readonly text: "The desk is cleared off";
        readonly syllables: 5;
    }, {
        readonly text: "someone new will sit here next";
        readonly syllables: 7;
    }, {
        readonly text: "the lights are turned down";
        readonly syllables: 5;
    }];
};
export type HaikuId = keyof typeof HAIKU;
/** The three lines of a haiku, in order, as the words a screen shows. */
export declare function haikuLines(id: HaikuId): readonly [string, string, string];
