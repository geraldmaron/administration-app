import { authorityByCite } from "@admin/player-core";
import { LawHelp as SharedLawHelp, LegalCitation, Row } from "@admin/ui";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { useLawViews } from "../law/LawHelp";
import { LAW_TOPICS, type LawTopicId } from "./law-topics";

/** One citation as a chip that opens its authority; the registry's title is shown where it holds the record. */
export function Cite({ cite, title, compact }: { readonly cite: string; readonly title?: string; readonly compact?: boolean }) {
  const open = useOpenAuthority();
  const record = authorityByCite(cite);
  return <LegalCitation citation={{ cite, title: title ?? record?.shortTitle ?? record?.title ?? cite }} onPress={() => open(cite)} compact={compact} />;
}

/** Several citations in a row, each a door into the law. */
export function Cites({ cites }: { readonly cites: readonly string[] }) {
  return (
    <Row gap="xs" wrap>
      {cites.map((cite) => (
        <Cite key={cite} cite={cite} />
      ))}
    </Row>
  );
}

/**
 * The shared law help resolved from a topic of the registry, beside the act: its framework in a line, the
 * help sheet with its limits and what the game models, and every citation as
 * a chip that opens the statute.
 */
export function LawTopicHelp({ topic, compact }: { readonly topic: LawTopicId; readonly compact?: boolean }) {
  const entry = LAW_TOPICS[topic];
  const law = useLawViews(entry.cites);
  return <SharedLawHelp presentation="card" title={entry.title} meaning={entry.summary} steps={[entry.limits, entry.model]} law={law} {...(compact ? {} : { lede: entry.limits })} />;
}
