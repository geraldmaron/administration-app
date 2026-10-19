import type { ReactNode } from "react";
import { institutionArtwork } from "../../media/authority";
import { Icon, type IconName } from "@admin/ui-web";
import "./dossier.css";

// The official frame every file shares: a person's dossier, an office's, a
// judge's, a government's country file, a state's. A banner with the seal and
// the house it comes from, an identity plate, the vital facts each with its
// mark, then numbered sections, the way a briefing memorandum is laid out.

export type DossierProps = {
  /** What kind of file this is: "Dossier", "Country file", "Office file". */
  readonly kind: string;
  readonly institution?: string;
  /** The house that keeps it: "The White House", "Department of State". */
  readonly house: string;
  /** How it is marked for handling, read first. */
  readonly marking?: string;
  /** The date the record is read as of. */
  readonly asOf?: string;
  readonly children: ReactNode;
};

/** The file as a whole: its banner, then whatever plate, vitals and sections it holds. */
export function Dossier({ kind, house, marking = "For the President", asOf, institution, children }: DossierProps) {
  const artwork = institutionArtwork(institution ?? house);
  return (
    <article className="dossier">
      {artwork ? <img className="dossier__watermark" src={artwork.src} alt="" /> : null}
      <header className="dossier__banner">
        {artwork ? <img className="dossier__seal-art" src={artwork.src} alt={`${artwork.name} insignia`} /> : null}
        <p className="dossier__house">
          <span className="dossier__kind">{kind}</span>
          <span className="dossier__house-name">{house}</span>
          {asOf ? <span className="dossier__asof">As of {asOf}</span> : null}
        </p>
        <span className="dossier__marking">{marking}</span>
      </header>
      {children}
    </article>
  );
}

export type IdPlateProps = {
  /** The face or the flag. */
  readonly mark: ReactNode;
  /** The post or station, in one line. */
  readonly post: ReactNode;
  /** Party, status, posture: short tags. */
  readonly tags?: ReactNode;
  /** One line under the post: the watch line, the standing. */
  readonly line?: ReactNode;
  /** The file's reference: a number derived from the subject's record id, and the date it is read on. */
  readonly reference?: { readonly id: string; readonly dated: string };
};

/** A six-figure file number that is the same for the same record every time, so a file reads as filed rather than generated. */
export function fileNumber(id: string): string {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1_000_000, 7);
  return String(hash).padStart(6, "0");
}

/** Who or what the file is about: the mark, the post, the tags that say where they stand. The name is the screen's title. */
export function IdPlate({ mark, post, tags, line, reference }: IdPlateProps) {
  return (
    <div className="dossier__plate">
      <div className="dossier__mark">{mark}</div>
      <div className="dossier__id">
        <p className="dossier__post">{post}</p>
        {tags ? <div className="dossier__tags">{tags}</div> : null}
        {line ? <p className="dossier__line">{line}</p> : null}
      </div>
      {reference ? (
        <p className="dossier__reference">
          <span>File {fileNumber(reference.id)}</span>
          <span>Read {reference.dated}</span>
        </p>
      ) : null}
    </div>
  );
}

export type Vital = {
  readonly icon: IconName;
  readonly label: string;
  readonly value: ReactNode;
};

/** The facts a reader checks first, each with its mark, in a grid that reflows to one column on a phone. */
export function Vitals({ items, label = "Vital facts" }: { readonly items: readonly Vital[]; readonly label?: string }) {
  if (items.length === 0) return null;
  return (
    <dl className="dossier__vitals" aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className="dossier__vital">
          <Icon name={item.icon} size={18} className="dossier__vital-mark" />
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type DossierSectionProps = {
  readonly id: string;
  readonly n: number;
  readonly icon: IconName;
  readonly title: string;
  /** One visible line saying what the section reads. */
  readonly note?: ReactNode;
  readonly children: ReactNode;
};

/** A numbered section of the file, with its mark and a one-line note on what it reads. */
export function DossierSection({ id, n, icon, title, note, children }: DossierSectionProps) {
  return (
    <section className="dossier__section" aria-labelledby={id}>
      <h2 id={id} className="dossier__head">
        <span className="dossier__number" aria-hidden="true">
          {n}
        </span>
        <Icon name={icon} size={18} className="dossier__head-mark" />
        {title}
      </h2>
      {note ? <p className="dossier__note">{note}</p> : null}
      {children}
    </section>
  );
}
