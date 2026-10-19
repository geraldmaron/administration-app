import { useCallback, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { executiveOrder } from "@admin/engine";
import { useStoresIfReady } from "../device/hooks";
import { rememberOath } from "../device/session";
import { useVaultRoom } from "../saves/useVaultRoom";
import { takeOath } from "./seal";
import type { Founding } from "./useFounding";

/** One frame and a tick, so the sealing state is drawn before the seal holds the thread for a second or more. */
const painted = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export type Sealing = {
  readonly phase: "idle" | "reviewing" | "room" | "sealing";
  readonly error?: string;
};

/**
 * The oath: the presidential review, then seal, store and the Brief. One
 * confirmed press founds one administration; a return to the terms or a
 * refusal opens the latch again. A full vault is not a refusal: the player
 * picks a saved administration to replace, and the same oath then seals with
 * no second press. Cancelling that choice returns to the review, draft intact.
 */
export function useOath(founding: Founding, picks: readonly string[]) {
  const store = useStoresIfReady();
  const router = useRouter();
  const room = useVaultRoom(store);
  const latch = useRef(false);
  const [state, setState] = useState<Sealing>({ phase: "idle" });
  const orders = picks.map((id) => executiveOrder(id)?.name ?? id);
  const review = useCallback(() => setState({ phase: "reviewing" }), []);
  const cancel = useCallback(() => {
    if (!latch.current) setState({ phase: "idle" });
  }, []);
  const confirm = useCallback(async () => {
    if (latch.current) return;
    latch.current = true;
    setState({ phase: "sealing" });
    try {
      if (!store) throw new Error("This device's saves have not opened yet, so the administration could not be stored.");
      await painted();
      const campaign = takeOath(founding.draft, founding.currentPreview, picks);
      const seal = async () => {
        await store.begin(campaign);
        rememberOath({ campaign, orders });
        router.replace("/brief");
      };
      await room.run(seal, {
        then: "take the oath",
        onWaiting: () => setState({ phase: "room" }),
        onCanceled: () => {
          latch.current = false;
          setState({ phase: "reviewing" });
        },
        onResumed: () => setState({ phase: "sealing" }),
        onSettled: (failure) => {
          if (!failure) return;
          latch.current = false;
          setState({ phase: "idle", error: failure.message });
        },
      });
    } catch (cause) {
      latch.current = false;
      setState({
        phase: "idle",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }, [founding.draft, founding.currentPreview, picks, orders, store, router, room]);
  return { ...state, orders, review, cancel, confirm, roomSheet: room.sheet };
}

export type Oath = ReturnType<typeof useOath>;
