import { useState } from "react";
import { Button, Icon, Sheet } from "@admin/ui-web";
import { HANDBOOK } from "@admin/player-core";
import { Door } from "../shell/Door";

function ChapterList({ current, onNavigate }: { readonly current?: string | undefined; readonly onNavigate?: () => void }) {
  return (
    <ol className="hb-nav__list">
      {HANDBOOK.map((chapter, index) => (
        <li key={chapter.id}>
          <Door href={`/handbook/${chapter.id}`} className="hb-nav__link" onClick={onNavigate} aria-current={chapter.id === current ? "page" : undefined}>
            <span className="hb-nav__number" aria-hidden="true">{index + 1}</span>
            <span>{chapter.title}</span>
          </Door>
        </li>
      ))}
      <li>
        <Door href="/handbook/terms" className="hb-nav__link" onClick={onNavigate} aria-current={current === "terms" ? "page" : undefined}>
          <span className="hb-nav__number" aria-hidden="true">A</span>
          <span>All terms, A to Z</span>
        </Door>
      </li>
    </ol>
  );
}

/**
 * The chapter list. On a desktop it is a rail that stays beside the page; on a
 * phone it opens the shared navigation inspector. Each is a separate element so the
 * one that is hidden is gone from the reading order, not merely out of sight.
 */
export function HandbookNav({ current }: { readonly current?: string | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hb-nav hb-nav--fold">
        <Button kind="secondary" icon={<Icon name="menu" size={18} />} onClick={() => setOpen(true)}>Chapters</Button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Handbook chapters" placement="side">
          <nav aria-label="Handbook chapters, folded">
            <ChapterList current={current} onNavigate={() => setOpen(false)} />
          </nav>
        </Sheet>
      </div>
      <nav className="hb-nav hb-nav--rail" aria-label="Handbook chapters">
        <ChapterList current={current} />
      </nav>
    </>
  );
}

export function HandbookLayout({ current, children }: { readonly current?: string | undefined; readonly children: React.ReactNode }) {
  return (
    <div className="hb-layout">
      <HandbookNav current={current} />
      <div className="hb-main">{children}</div>
    </div>
  );
}
