import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { readImportedSave, type CampaignLibrary } from "@admin/player-core";
import { useCampaignStore } from "../app/hooks";

export type LibraryActions = {
  readonly busy: boolean;
  readonly open: (id: string) => void;
  readonly rename: (id: string, name: string) => void;
  readonly exportSave: (id: string, name: string) => void;
  readonly discard: (id: string) => void;
};

function fileName(name: string): string {
  const stem = name.trim().replace(/[^A-Za-z0-9._ -]+/g, "").replace(/\s+/g, "-").slice(0, 60);
  return `${stem || "administration"}.json`;
}

/** Hands the save file to the browser as a download; the object URL is released once the click has been handed off. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(name);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The vault as the saves screen reads it, with every action it offers and the one place their failures are reported. */
export function useLibrary() {
  const store = useCampaignStore();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<CampaignLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(true);
  const refresh = useCallback((clearError = false) => {
    setReading(true);
    if (clearError) setError(null);
    store.saves.list().then((next) => { setLibrary(next); setReading(false); }, (cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)); setReading(false); });
  }, [store]);
  useEffect(() => refresh(), [refresh]);
  const attempt = useCallback(
    async (work: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await work();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [refresh],
  );
  const actions: LibraryActions = {
    busy: busy || reading,
    // Opening is not founding: `begin` opens a new slot, so a return goes through load and restore.
    open: (id) =>
      void attempt(async () => {
        await store.saves.load(id);
        await store.restore();
        await navigate({ to: "/brief" });
      }),
    rename: (id, name) =>
      void attempt(async () => {
        const renamed = await store.saves.rename(id, name);
        setNotice(`Renamed to “${renamed.name}”.`);
      }),
    exportSave: (id, name) =>
      void attempt(async () => {
        download(name, await store.saves.exportSave(id));
        setNotice(`“${name}” was saved to your downloads as a file you can import again.`);
      }),
    discard: (id) =>
      void attempt(async () => {
        const name = library?.campaigns.find((summary) => summary.id === id)?.name ?? "The administration";
        await store.discard(id);
        setNotice(`“${name}” was discarded from this device.`);
      }),
  };
  const importSave = (file: File) =>
    void attempt(async () => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file is not a save exported from this game: it is not readable as a save file.");
      }
      await store.begin(readImportedSave(parsed));
      await navigate({ to: "/brief" });
    });
  return { library, error, notice, busy: busy || reading, reading, retry: () => refresh(true), actions, importSave };
}
