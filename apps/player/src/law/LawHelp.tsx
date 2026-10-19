import { authorityByCite } from "@admin/player-core";
import { LawHelp as SharedLawHelp, type LawView } from "@admin/ui";
import { useOpenAuthority } from "./AuthorityProvider";

export type LawHelpProps = {
  readonly title: string;
  readonly meaning: string;
  readonly steps?: readonly string[];
  /** The citations behind the power; each opens its record in the registry. */
  readonly cites?: readonly string[];
  readonly presentation?: "button" | "card";
  readonly lede?: string;
};

/** Citations resolved from the authority registry into what help sheets and reading frames show, each opening its record. */
export function useLawViews(cites: readonly string[]): readonly LawView[] {
  const open = useOpenAuthority();
  return cites.map((cite): LawView => {
    const record = authorityByCite(cite);
    return { cite, title: record?.shortTitle ?? record?.title ?? cite, ...(record ? { summary: record.summary } : {}), onOpen: () => open(cite) };
  });
}

/** The shared law help with its citations resolved, so a screen names the cites and nothing else. */
export function CitedLawHelp({ cites = [], ...rest }: LawHelpProps) {
  return <SharedLawHelp {...rest} law={useLawViews(cites)} />;
}
