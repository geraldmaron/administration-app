import type { ReactNode } from "react";
import { BrandGlyph } from "./BrandGlyph";

export type DocumentState = "draft" | "issued" | "in-effect" | "challenged" | "stayed" | "expired" | "revoked" | "vetoed" | "signed" | "pending";

export type DocumentSection = {
  /** The operative heading: "Purpose", "Directive", "Resources", "Effective date". */
  readonly heading: string;
  readonly body: ReactNode;
};

export type DocumentProps = {
  /** "The White House" or the issuing office. */
  readonly issuer: string;
  /** "Executive order", "Presidential memorandum", "Proclamation", "Bill", "Treaty". */
  readonly kind: string;
  readonly title: string;
  /** A game record id or simulated number; shown as-is, never dressed up as a real citation. */
  readonly reference?: string;
  /** The date line: "Draft prepared February 3, 2029" or "Issued February 3, 2029". */
  readonly dated: string;
  readonly state: DocumentState;
  /** The state as words, when the default would mislead: "Awaiting signature", "Stayed by the court". */
  readonly stateLabel?: string;
  readonly sections: readonly DocumentSection[];
  /** The signature block: who signs, and whether it has been signed. */
  readonly signature?: { readonly name: string; readonly title: string; readonly signed: boolean };
  readonly children?: ReactNode;
};

const STATE_WORDS: Readonly<Record<DocumentState, string>> = {
  draft: "Draft",
  pending: "Pending",
  signed: "Signed",
  issued: "Issued",
  "in-effect": "In effect",
  challenged: "Challenged in court",
  stayed: "Stayed",
  expired: "Expired",
  revoked: "Revoked",
  vetoed: "Vetoed",
};

const STATE_TONE: Readonly<Record<DocumentState, string>> = {
  draft: "pending",
  pending: "pending",
  signed: "success",
  issued: "success",
  "in-effect": "success",
  challenged: "warning",
  stayed: "warning",
  expired: "unknown",
  revoked: "danger",
  vetoed: "danger",
};

/**
 * A presidential instrument as paper: issuer, kind, title, reference, date,
 * state, numbered operative sections and the signature block. A draft is
 * marked as one throughout, so an unsigned page never reads as issued.
 */
export function Document({ issuer, kind, title, reference, dated, state, stateLabel, sections, signature, children }: DocumentProps) {
  return (
    <article className="ui-document" data-state={state} aria-label={`${kind}: ${title}`}>
      <header className="ui-document__head">
        <div className="ui-document__issuer">
          <BrandGlyph size={32} className="ui-document__seal" />
          <span>{issuer}</span>
        </div>
        <p className="ui-document__kind">{kind}</p>
        <h2 className="ui-document__title">{title}</h2>
        <dl className="ui-document__meta">
          {reference ? (
            <div>
              <dt>Reference</dt>
              <dd>{reference}</dd>
            </div>
          ) : null}
          <div>
            <dt>Date</dt>
            <dd>{dated}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`ui-document__state ui-document__state--${STATE_TONE[state]}`}>{stateLabel ?? STATE_WORDS[state]}</span>
            </dd>
          </div>
        </dl>
      </header>
      <ol className="ui-document__sections">
        {sections.map((section, index) => (
          <li key={section.heading} className="ui-document__section">
            <h3 className="ui-document__heading">
              <span className="ui-document__number">Sec. {index + 1}.</span> {section.heading}
            </h3>
            <div className="ui-document__body">{section.body}</div>
          </li>
        ))}
      </ol>
      {children}
      {signature ? (
        <footer className="ui-document__signature" data-signed={signature.signed || undefined}>
          <span className="ui-document__line">{signature.signed ? signature.name : "Not yet signed"}</span>
          <span className="ui-document__signer">
            {signature.name}, {signature.title}
          </span>
        </footer>
      ) : null}
    </article>
  );
}
