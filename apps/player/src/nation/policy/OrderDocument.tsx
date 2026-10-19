import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { orderAuthorityRecord, sealFor } from "@admin/player-core";
import { Badge, Column, DocParagraph, LegalCitation, OrderPaper, Seal, Stamp, Surface, Text } from "@admin/ui";
import { useOpenAuthority } from "../../law/AuthorityProvider";
import { authorityWords, type OrderTerms } from "./order-terms";

function Plain({ children }: { readonly children: ReactNode }) {
  return <Text variant="body">{children}</Text>;
}

/** The power the order rests on, its citation opening the law, and for a power Congress withdrew, the act that would have to pass. */
export function OrderAuthorityCite({ terms, plain }: { readonly terms: OrderTerms; readonly plain?: boolean }) {
  const Para = plain ? Plain : DocParagraph;
  const open = useOpenAuthority();
  const authority = terms.authority;
  if (!authority) return <Para>{authorityWords(undefined)}</Para>;
  const record = orderAuthorityRecord(authority);
  return (
    <Column gap="sm">
      <LegalCitation citation={{ cite: authority.cite, title: record?.title ?? authority.name }} onPress={() => open(record?.cite ?? authority.cite)} />
      {authority.kind === "needs-act" ? <Badge status="warning" icon="statusBlocked">Needs a new law from Congress</Badge> : null}
      <Para>{authorityWords(authority)}</Para>
    </Column>
  );
}

/** The authority clause as the order states it: the citation that opens the law, and a flag when the power needs a new act. The explanation of what the power allows lives beside the paper. */
function FormalAuthority({ terms }: { readonly terms: OrderTerms }) {
  const open = useOpenAuthority();
  const authority = terms.authority;
  if (!authority) return <DocParagraph>{authorityWords(undefined)}</DocParagraph>;
  const record = orderAuthorityRecord(authority);
  return (
    <Column gap="xs">
      <DocParagraph>{`This order is issued under ${authority.cite}.`}</DocParagraph>
      <LegalCitation citation={{ cite: authority.cite, title: record?.title ?? authority.name }} onPress={() => open(record?.cite ?? authority.cite)} />
      {authority.kind === "needs-act" ? <Badge status="warning" icon="statusBlocked">Needs a new law from Congress</Badge> : null}
    </Column>
  );
}

/** A stable executive order number for a signed order's record, in the range the series has reached. */
export function orderNumber(id: string): string {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 900, 11);
  return `Executive Order ${14_400 + hash}`;
}

const GENERAL_PROVISIONS = "(a) This order shall be implemented consistent with applicable law and subject to the availability of appropriations. (b) This order is not intended to, and does not, create any right or benefit, substantive or procedural, enforceable at law or in equity by any party against the United States, its departments, agencies, or entities, its officers, employees, or agents, or any other person.";

/** What the staff say about the order: kept off the paper because the order says none of it. */
function StaffNotes({ terms }: { readonly terms: OrderTerms }) {
  const lines = [
    `${terms.costNow}.${terms.debt ? ` ${terms.debt}.` : ""} Recurring cost: ${terms.recurring}${/[.!?]$/.test(terms.recurring) ? "" : "."}`,
    ...terms.changes.map((line) => `${line.label}: ${line.text}`),
    ...(terms.landed.length > 0 ? [`States: ${terms.landed.map((state) => `${state.name} (${terms.reference === "order-relief-program" ? "receives relief" : state.helps ? "gains" : "pays the cost"})`).join(", ")}.`] : []),
    `Estimated chance of a court challenge: ${terms.challenge}.`,
    ...(terms.attorneyGeneral ? [`${terms.attorneyGeneral}.`] : []),
    ...(terms.excepted ? ["This work continues even if government funding runs out."] : []),
  ];
  return (
    <Surface level="raised" pad="lg" accentEdge="gold" role="region" aria-label="Staff notes on this order">
      <Column gap="sm">
        <Text variant="label" weight="strong">Staff notes on this order</Text>
        {lines.map((line) => (
          <Text key={line} variant="body" tone="secondary">
            {line}
          </Text>
        ))}
      </Column>
    </Surface>
  );
}

/** The order as the White House issues it: a draft with no number until the President signs it, then the signed text. The staff's notes sit under the paper. */
export function OrderDocument({ campaign, terms, signedOn, blocked, recordId }: { readonly campaign: Campaign; readonly terms: OrderTerms; readonly signedOn?: string; readonly blocked?: string; readonly recordId?: string }) {
  const signed = signedOn !== undefined;
  const stamp = signed ? <Stamp tone="law">Signed</Stamp> : <Stamp tone="draft">{blocked ? "Draft: can't be signed yet" : "Draft"}</Stamp>;
  return (
    <Column gap="md">
      <OrderPaper
        {...(signed ? { number: orderNumber(recordId ?? terms.reference) } : {})}
        title={terms.name}
        seal={<Seal spec={sealFor("SEAL-PRESIDENT")} size={72} label="Seal of the President of the United States" />}
        stamp={stamp}
        {...(signed ? { signer: campaign.founding.leader.name, signed: signedOn } : {})}
        sections={[
          { heading: "Purpose", body: terms.purpose },
          { heading: "Policy", body: `${terms.scope}.` },
          { heading: "Implementation", body: `${terms.department}.` },
          { heading: "Effective date", body: `${terms.timing}.` },
          { heading: "Authority", body: <FormalAuthority terms={terms} /> },
          { heading: "General provisions", body: GENERAL_PROVISIONS },
        ]}
      />
      {blocked ? <Text variant="caption" tone="secondary">It can't be signed until it has {blocked}.</Text> : null}
      <StaffNotes terms={terms} />
    </Column>
  );
}
