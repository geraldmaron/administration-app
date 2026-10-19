import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClassificationLevel } from "@admin/engine";
import { bannerWords, highestClassification } from "@admin/player-core";
import { ClassificationBar, classificationKey } from "@admin/ui";

type Marks = {
  readonly register: (id: string, level: ClassificationLevel) => void;
  readonly release: (id: string) => void;
};

// Registration and the current level live in separate contexts so a screen
// that only registers never re-renders when another screen's mark changes.
const MarksContext = createContext<Marks | undefined>(undefined);
const LevelContext = createContext<ClassificationLevel>("UNCLASSIFIED");

/** Holds what each mounted screen has marked and hands the shell the most restrictive. */
export function ClassificationProvider({ children }: { readonly children: ReactNode }) {
  const marked = useRef(new Map<string, ClassificationLevel>());
  const [level, setLevel] = useState<ClassificationLevel>("UNCLASSIFIED");
  const marks = useMemo<Marks>(() => {
    const settle = () => setLevel(highestClassification(marked.current.values()));
    return {
      register: (id, next) => {
        marked.current.set(id, next);
        settle();
      },
      release: (id) => {
        marked.current.delete(id);
        settle();
      },
    };
  }, []);
  return (
    <MarksContext.Provider value={marks}>
      <LevelContext.Provider value={level}>{children}</LevelContext.Provider>
    </MarksContext.Provider>
  );
}

/**
 * A screen calls this with the engine's level for what it displays: the
 * decision's `classificationForSeverity`, or a document's
 * `defaultClassificationForFamily`. It never invents one. Pass `undefined`
 * (or call nothing) when nothing on the screen is marked; the registration
 * ends when the screen unmounts.
 */
export function useMarking(level: ClassificationLevel | undefined): void {
  const marks = useContext(MarksContext);
  const id = useId();
  useEffect(() => {
    if (!marks || level === undefined) return undefined;
    marks.register(id, level);
    return () => marks.release(id);
  }, [marks, id, level]);
}

/** The level the shell is showing now. */
export function useScreenClassification(): ClassificationLevel {
  return useContext(LevelContext);
}

/** The top or bottom banner of the frame, in the color and words of the screen's highest marking. */
export function ShellClassificationBar({ edge }: { readonly edge: "top" | "bottom" }) {
  const level = useScreenClassification();
  return <ClassificationBar level={classificationKey(bannerWords(level))} edge={edge} />;
}
