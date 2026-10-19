import type { Authority, AuthorityKind, AuthorityView } from "./types.js";

const KIND_LABEL: Readonly<Record<AuthorityKind, string>> = {
  constitution: "Constitution",
  statute: "Statute",
  regulation: "Regulation",
  "executive-order": "Executive order",
  case: "Supreme Court decision",
  treaty: "Treaty",
};

const HOST_LABEL: Readonly<Record<string, string>> = {
  "uscode.house.gov": "United States Code, Office of the Law Revision Counsel",
  "www.govinfo.gov": "GovInfo, Government Publishing Office",
  "constitution.congress.gov": "Constitution Annotated, Library of Congress",
  "www.ecfr.gov": "Electronic Code of Federal Regulations",
  "www.federalregister.gov": "Federal Register",
  "www.archives.gov": "National Archives",
  "supreme.justia.com": "Justia, U.S. Supreme Court opinions",
  "www.nato.int": "NATO",
  "www.un.org": "United Nations",
};

/** The host of an https link, without relying on a platform URL parser. */
export function sourceHost(url: string): string | undefined {
  return /^https:\/\/([^/?#:]+)/.exec(url)?.[1];
}

export function sourceLabel(url: string): string {
  const host = sourceHost(url);
  return (host && HOST_LABEL[host]) ?? host ?? url;
}

export function authorityView(authority: Authority): AuthorityView {
  return {
    id: authority.id,
    cite: authority.cite,
    title: authority.title,
    summary: authority.summary,
    enables: authority.enables,
    limits: authority.limits,
    sourceUrl: authority.sourceUrl,
    sourceLabel: sourceLabel(authority.sourceUrl),
    kindLabel: KIND_LABEL[authority.kind],
    inForce: authority.lapsed === undefined,
    ...(authority.lapsed ? { lapsed: authority.lapsed } : {}),
  };
}
