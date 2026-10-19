import type { ReactNode } from "react";
import { BrandGlyph } from "./BrandGlyph";

export type TopBarProps = {
  /** Where the mark leads: the title screen, or the Brief while a campaign is in play. */
  readonly home: ReactNode;
  /** The date and the state of the term, read at a glance. */
  readonly status?: ReactNode;
  /** Continue, save status, search: the bar's controls, in that order. */
  readonly actions?: ReactNode;
};

/** The mark, the presidency's current state, and the controls that act on the whole game. */
export function TopBar({ home, status, actions }: TopBarProps) {
  return (
    <header className="ui-top-bar">
      <div className="ui-top-bar__home">{home}</div>
      {status ? <div className="ui-top-bar__status">{status}</div> : null}
      {actions ? <div className="ui-top-bar__actions">{actions}</div> : null}
    </header>
  );
}

export type WordmarkProps = {
  /** Who holds the office, once a term is in play. */
  readonly holder?: string;
};

/** The seal and the office it stands for, as the top bar draws them. The words hide on a phone; the seal keeps its label. */
export function Wordmark({ holder }: WordmarkProps) {
  return (
    <span className="ui-wordmark">
      <BrandGlyph size={24} className="ui-wordmark__glyph" />
      <span className="ui-wordmark__name">
        <span className="ui-wordmark__office">Office of the President</span>
        {holder ? <span className="ui-wordmark__holder">{holder}</span> : null}
      </span>
    </span>
  );
}
