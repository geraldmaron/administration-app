import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { readImportedSave, type CampaignLibrary, type CampaignStore } from "@admin/player-core";
import { useStoresIfReady } from "../device/hooks";
import { useVaultRoom } from "../saves/useVaultRoom";
import { readSaveFile, writeSaveFile } from "./save-file";

export type LibraryActions = {
  readonly busy: boolean;
  readonly open: (id: string) => void;
  readonly rename: (id: string, name: string) => void;
  readonly exportSave: (id: string, name: string) => void;
  readonly discard: (id: string) => void;
};

const words = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/** The vault as listed, re-read on demand; null until the first read lands or when it failed. */
function useListing(store: CampaignStore | null) {
  const [library, setLibrary] = useState<CampaignLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(true);
  const refresh = useCallback(
    (clearError = false) => {
      if (!store) return;
      setReading(true);
      if (clearError) setError(null);
      store.saves.list().then(
        (next) => {
          setLibrary(next);
          setReading(false);
        },
        (cause: unknown) => {
          setError(words(cause));
          setReading(false);
        },
      );
    },
    [store],
  );
  useEffect(() => refresh(), [refresh]);
  return { library, error, setError, reading: reading || !store, refresh };
}

/** Runs one library action at a time and reports its failure or its outcome in words. */
function useAttempt(refresh: () => void, setError: (error: string | null) => void) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const attempt = useCallback(
    async (work: () => Promise<string | undefined>) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const said = await work();
        if (said) setNotice(said);
      } catch (cause) {
        setError(words(cause));
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [refresh, setError],
  );
  return { busy, notice, attempt };
}

/** The vault as the saves screen reads it, with every action it offers and the one place their failures are reported. */
export function useLibrary() {
  const store = useStoresIfReady();
  const router = useRouter();
  const { library, error, setError, reading, refresh } = useListing(store);
  const { busy, notice, attempt } = useAttempt(refresh, setError);
  const room = useVaultRoom(store);
  const need = (): CampaignStore => {
    if (!store) throw new Error("This device's saves have not opened yet.");
    return store;
  };
  const actions: LibraryActions = {
    busy: busy || reading,
    // Opening is not founding: `begin` opens a new slot, so a return goes through load and restore.
    open: (id) =>
      void attempt(async () => {
        await need().saves.load(id);
        await need().restore();
        router.push("/brief");
        return undefined;
      }),
    rename: (id, name) => void attempt(async () => `Renamed to “${(await need().saves.rename(id, name)).name}”.`),
    exportSave: (id, name) =>
      void attempt(async () => {
        await writeSaveFile(name, await need().saves.exportSave(id));
        return `A copy of “${name}” is in your downloads. You can import it later to keep playing.`;
      }),
    discard: (id) =>
      void attempt(async () => {
        const name = library?.campaigns.find((summary) => summary.id === id)?.name ?? "The presidency";
        await need().discard(id);
        return `“${name}” was discarded from this device.`;
      }),
  };
  const importSave = () =>
    void attempt(async () => {
      const text = await readSaveFile();
      if (text === undefined) return undefined;
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't a save from this game, so we can't open it.");
      }
      const imported = readImportedSave(parsed);
      // The file is already read, so a full vault asks which administration to replace instead of sending the player back to pick it again.
      await room.run(
        async () => {
          await need().begin(imported);
          router.push("/brief");
        },
        {
          then: "open the imported save",
          onSettled: (failure) => {
            if (failure) setError(failure.message);
            refresh();
          },
        },
      );
      return undefined;
    });
  return {
    library,
    error,
    notice,
    busy: busy || reading,
    reading,
    retry: () => refresh(true),
    actions,
    importSave,
    roomSheet: room.sheet,
  };
}
