import { useRef, useState } from "react";
import { chapterForExplainer, explainer } from "@admin/player-core";
import { Icon, Sheet } from "@admin/ui-web";
import { ExplainerView } from "../help";
import { Door } from "./Door";
import "./explainer-note.css";

/**
 * A screen's own explanation, named for its subject. It opens the drawn
 * explainer in a side sheet so the page, its scroll position and anything typed
 * into it stay as they were; closing returns focus to this button. Read-next
 * links swap the sheet to another explainer, and closing resets it to this one.
 */
export function ExplainerNote({ id }: { readonly id: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(id);
  const button = useRef<HTMLButtonElement>(null);
  const home = explainer(id);
  if (!home) return null;
  const shown = explainer(current) ?? home;
  const chapter = chapterForExplainer(shown.id);
  const close = () => {
    setOpen(false);
    setCurrent(id);
  };
  return (
    <div className="explainer-note">
      <button ref={button} type="button" className="explainer-note__open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon name="info" size={18} />
        <span>{home.title}</span>
      </button>
      <Sheet
        open={open}
        placement="side"
        title={shown.title}
        returnFocus={() => button.current}
        {...(chapter ? { foot: <Door href={`/handbook/${chapter.id}#${shown.id}`} className="explainer-note__chapter" onClick={close}>Read the chapter: {chapter.title}</Door> } : {})}
        onClose={close}
      >
        <ExplainerView explainer={shown} onOpen={setCurrent} />
      </Sheet>
    </div>
  );
}
