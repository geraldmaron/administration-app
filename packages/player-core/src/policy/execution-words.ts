/**
 * How a chair's execution reads. The engine scales a program's weekly effect
 * by a quality between 0.6 and 1.4, so a strong secretary lands more than the
 * program was written to do. Read as "133% of the benefit" it looks like a
 * completion rate past full, so it is said as over or under the written effect.
 */
export function executionWords(quality: number): string {
  const points = Math.round((quality - 1) * 100);
  if (points === 0) return "has the full written effect";
  return points > 0 ? `has ${points}% more effect than written` : `has ${-points}% less effect than written`;
}

/** The short figure beside a bar: "+33%", "−20%" or "As written". */
export function executionFigure(quality: number): string {
  const points = Math.round((quality - 1) * 100);
  if (points === 0) return "As written";
  return points > 0 ? `+${points}%` : `−${-points}%`;
}
