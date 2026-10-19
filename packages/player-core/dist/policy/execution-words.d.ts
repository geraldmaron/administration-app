/**
 * How a chair's execution reads. The engine scales a program's weekly effect
 * by a quality between 0.6 and 1.4, so a strong secretary lands more than the
 * program was written to do. Read as "133% of the benefit" it looks like a
 * completion rate past full, so it is said as over or under the written effect.
 */
export declare function executionWords(quality: number): string;
/** The short figure beside a bar: "+33%", "−20%" or "As written". */
export declare function executionFigure(quality: number): string;
