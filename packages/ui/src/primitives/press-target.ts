/** Anything inside a card or row that has its own job: pressing it must not also press the card. */
export const OWN_JOB = "a,button,input,select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=switch],[role=radio],[role=tab],[role=slider],[data-card-control]";

export type Pressed = { readonly target: unknown; readonly currentTarget: unknown };

/**
 * Whether a press landed on the card itself, or on something inside it that
 * is not another control. On a device there is no DOM to ask, and the touch
 * already went to the innermost pressable, so the answer is yes.
 */
export function landedOnCard(event: Pressed): boolean {
  const target = event.target as Element | null;
  const card = event.currentTarget as Element | null;
  if (!target || !card || typeof target.closest !== "function") return true;
  // A sheet or menu opened from inside the card is drawn elsewhere in the page, but React still bubbles its presses up to the card.
  if (!card.contains(target)) return false;
  const control = target.closest(OWN_JOB);
  return control === null || control === card;
}
