export type { Authority, AuthorityKind, AuthorityView, CodeSpan, ConstitutionSpan } from "./types.js";
export { AUTHORITIES, AUTHORITY_SOURCE_HOSTS, DIRECTIVE_AUTHORITY_EXEMPTIONS, authoritiesForGlossaryTerm, authorityById, authorityByCite, authorityKeys, normalizeCite, orderAuthorityRecord, resolveAuthorityText, } from "./registry.js";
export { authorityView, sourceHost, sourceLabel } from "./view.js";
export { LAW_CHAPTER, LAW_SECTIONS, lawSectionAuthorities, lawSectionFor, unplacedAuthorities, type LawChapter, type LawSection } from "./handbook-law.js";
