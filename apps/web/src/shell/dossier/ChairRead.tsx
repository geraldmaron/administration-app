import { useState } from "react";
import { Button, Icon, Sheet } from "@admin/ui-web";
import type { ChairRead as Read, ReadPip } from "@admin/player-core";
import { Door } from "../Door";
import "./chair-read.css";

function Line({ pip }: { readonly pip: ReadPip }) {
  return (
    <div>
      <dt>
        <span className="chair-read__pip" data-tone={pip.tone} aria-hidden="true" /> {pip.label}
      </dt>
      <dd>{pip.word}</dd>
    </div>
  );
}

/**
 * A holder's read in one cell: a pip per reading the simulation uses, and the
 * word that decides it. Pressing it opens why: each reading in words and what
 * it moves in a focused inspector.
 */
/** The read's pips and deciding word, as a static mark for a card that is itself a control. */
export function ReadBadge({ read, variant = "compact" }: { readonly read: Read; readonly variant?: "compact" | "profile" }) {
  if (variant === "profile") return <dl className="read-profile" aria-label="Officer assessment">{read.pips.map((pip) => <div key={pip.key} data-tone={pip.tone} title={pip.consequence}><dt>{pip.label}</dt><dd>{pip.word}</dd></div>)}</dl>;
  return (
    <span className="read-badge" data-tone={read.tone} title={read.reason}>
      <Pips read={read} />
      <span className="chair-read__word">{read.word}</span>
    </span>
  );
}

function Pips({ read }: { readonly read: Read }) {
  return (
    <span className="chair-read__pips" aria-hidden="true">
      {read.pips.map((pip) => (
        <span key={pip.key} className="chair-read__pip" data-tone={pip.tone} title={`${pip.label}: ${pip.word}`} />
      ))}
    </span>
  );
}

export function ChairRead({ read, name, href }: { readonly read: Read; readonly name: string; readonly href: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button kind="ghost" size="sm" className="chair-read" aria-label={`${name}: ${read.word}. Show why`} aria-haspopup="dialog" onClick={() => setOpen(true)}><Pips read={read} /><span className="chair-read__word">{read.word}</span></Button>
    <Sheet open={open} onClose={() => setOpen(false)} title={`${name}: assessment`} placement="side">
      <div className="chair-read__evidence"><p className="chair-read__reason">{read.reason}</p>
        <dl className="chair-read__list">{read.pips.map((pip) => <Line key={pip.key} pip={pip} />)}</dl>
        {read.others.length > 0 ? <p className="chair-read__note">{read.others.map((pip) => `${pip.label}: ${pip.word.toLowerCase()}`).join("; ")}. These readings are not part of the assessment shown; while they serve, they affect the cost of dismissal.</p> : null}
        <Button asChild kind="secondary"><Door href={href} onClick={() => setOpen(false)}>{name}<Icon name="dossier" size={16} /></Door></Button>
      </div>
    </Sheet>
  </>;
}
