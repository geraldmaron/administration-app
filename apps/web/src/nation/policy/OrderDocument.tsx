import type { Campaign } from "@admin/engine";
import { formatDate } from "@admin/player-core";
import { Collection, Document, Tag, type DocumentSection } from "@admin/ui-web";
import type { OrderTerms } from "./order-terms";

const ISSUER = "The White House";
const SIGNER_TITLE = "President of the United States";

function Directive({ terms }: { readonly terms: OrderTerms }) {
  return (
    <>
      <p>{terms.scope}.</p>
      {terms.changes.length > 0 ? (
        <ul className="order-terms__list">
          {terms.changes.map((line) => (
            <li key={line.label}>
              {line.label}: <span className="choice-cell" data-tone={line.tone}>{line.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>It makes no standing change to the national readings.</p>
      )}
      <Collection
        items={terms.landed}
        initial={6}
        noun="states"
        as="ul"
        className="order-terms__list"
        render={(state) => (
          <li key={state.name}>
            {state.name} {terms.reference === "order-relief-program"
              ? <Tag tone="action">Receives relief</Tag>
              : <Tag tone={state.helps ? "action" : "caution"}>{state.helps ? "Gains" : "Bears the cost"}</Tag>}
          </li>
        )}
      />
    </>
  );
}

function sections(terms: OrderTerms): readonly DocumentSection[] {
  return [
    { heading: "Purpose", body: <p>{terms.purpose}</p> },
    { heading: "Directive", body: <Directive terms={terms} /> },
    {
      heading: "Resources",
      body: (
        <p>
          {terms.costNow}. {terms.debt ? `${terms.debt}. ` : ""}Recurring cost: {terms.recurring.toLowerCase()}.
        </p>
      ),
    },
    { heading: "Responsible department", body: <p>{terms.department}.</p> },
    {
      heading: "Effective dates and review",
      body: (
        <>
          <p>{terms.timing}.</p>
          <p>Chance it is challenged in court, as assessed: {terms.challenge}.</p>
          {terms.attorneyGeneral ? <p>{terms.attorneyGeneral}.</p> : null}
          {terms.excepted ? <p>Excepted work: it carries on through a funding lapse.</p> : null}
        </>
      ),
    },
    {
      heading: "Authority as modeled",
      body: terms.authority ? (
        <p>
          {terms.authority.name}, {terms.authority.cite}. {terms.authority.limit}
        </p>
      ) : (
        <p>No statute or clause grants it, so it cannot be signed.</p>
      ),
    },
  ];
}

export type OrderDocumentProps = {
  readonly campaign: Campaign;
  readonly terms: OrderTerms;
  /** The signing date when signed; absent, the page is a draft and carries today's date. */
  readonly signedOn?: string;
  /** Why a draft cannot be signed today. */
  readonly blocked?: string;
  /** The game's record id of the signature, when signed. */
  readonly recordId?: string;
};

/** The order as an issued instrument: a draft until the President signs it, then the terms that were signed. */
export function OrderDocument({ campaign, terms, signedOn, blocked, recordId }: OrderDocumentProps) {
  const signed = signedOn !== undefined;
  return (
    <Document
      issuer={ISSUER}
      kind="Executive order"
      title={terms.name}
      reference={recordId ?? terms.reference}
      dated={signed ? `Signed ${signedOn}` : `Draft prepared ${formatDate(campaign.calendar)}`}
      state={signed ? "signed" : "draft"}
      {...(!signed && blocked ? { stateLabel: "Draft, not signable today" } : {})}
      sections={sections(terms)}
      signature={{ name: campaign.founding.leader.name, title: SIGNER_TITLE, signed }}
    />
  );
}
