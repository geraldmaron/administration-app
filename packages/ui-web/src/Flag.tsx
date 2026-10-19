export type FlagProps = {
  /** The place the flag belongs to: "California", "Japan". */
  readonly name: string;
  /** The real flag artwork's URL. Absent, a plain field stands in and says so. */
  readonly src?: string;
  /** Height in CSS pixels; the box is always 3:2 so rows keep their rhythm. */
  readonly height?: number;
  /** A flag beside the place's own name adds nothing for a screen reader. */
  readonly decorative?: boolean;
};

/** A real flag in a 3:2 box with a hairline, so a white field still reads as a flag on white. */
export function Flag({ name, src, height = 20, decorative = false }: FlagProps) {
  const style = { blockSize: `${height}px`, inlineSize: `${height * 1.5}px` };
  if (!src) {
    return <span className="ui-flag ui-flag--missing" style={style} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `${name} (no flag on file)`} aria-hidden={decorative || undefined} />;
  }
  return (
    <span className="ui-flag" style={style}>
      <img className="ui-flag__image" src={src} alt={decorative ? "" : `Flag of ${name}`} draggable={false} />
    </span>
  );
}
