export type AuthorityKind = "constitution" | "statute" | "regulation" | "executive-order" | "case" | "treaty";
/**
 * A run of sections in the United States Code or the Code of Federal
 * Regulations. `to` absent means the one section. Section numbers are kept as
 * written ("3349d", "200.211") because the codes put letters and decimals in
 * them.
 */
export type CodeSpan = {
    readonly code: "usc" | "cfr";
    readonly title: number;
    readonly from: string;
    readonly to?: string;
};
/** One provision of the Constitution's articles. */
export type ConstitutionSpan = {
    readonly article: "I" | "II" | "III";
    readonly section: number;
    readonly clause?: number;
};
export type Authority = {
    readonly id: string;
    /** The citation as a lawyer writes it. */
    readonly cite: string;
    readonly title: string;
    /** The name a reader knows it by, where that differs from the title. */
    readonly shortTitle?: string;
    readonly kind: AuthorityKind;
    /** What it is, in plain words. */
    readonly summary: string;
    /** What it lets the President do, each said as an act. */
    readonly enables: readonly string[];
    /** The conditions, clocks and people who can stop it. */
    readonly limits: readonly string[];
    /** A public primary source for the text. */
    readonly sourceUrl: string;
    /** Glossary ids the authority explains or rests under. Every id must exist. */
    readonly glossaryTerms?: readonly string[];
    /** Other spellings and names of the authority as engine and help text write them. */
    readonly aliases?: readonly string[];
    /** The code sections the record answers for, so a pinpoint cite finds it. */
    readonly covers?: readonly CodeSpan[];
    /** The constitutional provision the record answers for. */
    readonly provision?: ConstitutionSpan;
    /**
     * Present only on a law no longer in force: when and how it stopped. A
     * lapsed record is what a card cites for an act that needs Congress to grant
     * the power again.
     */
    readonly lapsed?: string;
};
/** What a screen draws for one authority. */
export type AuthorityView = {
    readonly id: string;
    readonly cite: string;
    readonly title: string;
    readonly summary: string;
    readonly enables: readonly string[];
    readonly limits: readonly string[];
    readonly sourceUrl: string;
    /** The host of the source, by its plain name. */
    readonly sourceLabel: string;
    readonly kindLabel: string;
    readonly inForce: boolean;
    readonly lapsed?: string;
};
