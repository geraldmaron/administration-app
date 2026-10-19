import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Text, View } from "@admin/ui";

/** A map that throws while drawing leaves the screen with a plain message, never a blank page. */
class MapBoundary extends Component<{ readonly children: ReactNode; readonly fallback: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn("A map stopped drawing; the figures beside it still hold.", error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MapNote({ height, message }: { readonly height: number; readonly message: string }) {
  return (
    <View height={height} borderRadius="card" borderWidth={1} borderColor="borderColor" backgroundColor="backgroundStrong" alignItems="center" justifyContent="center" padding="lg" aria-live="polite">
      <Text variant="label" weight="regular" tone="secondary" textAlign="center" maxWidth={420}>
        {message}
      </Text>
    </View>
  );
}

/** True once the page has painted, so its readings and lists never wait on the map. */
function useAfterPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);
  return ready;
}

export type MapSlotProps = {
  /** The height of the waiting and failure notes, the map's own shortest frame. */
  readonly height: number;
  /** What the screen says when the map cannot draw: where the same figures are instead. */
  readonly failed: string;
  /** The lazily loaded map, handed the call that reports a drawing it cannot run. */
  readonly children: (onFail: (reason: string) => void) => ReactNode;
};

/**
 * Where a screen's map goes: it mounts after the page paints, loads as its own
 * chunk, and gives way to a plain note if it cannot draw on this device.
 */
export function MapSlot({ height, failed, children }: MapSlotProps) {
  const ready = useAfterPaint();
  const [failure, setFailure] = useState<string | null>(null);
  const loading = <MapNote height={height} message="Loading the map." />;
  if (failure) return <MapNote height={height} message={`${failed} ${failure}`} />;
  if (!ready) return loading;
  return (
    <MapBoundary fallback={<MapNote height={height} message={failed} />}>
      <Suspense fallback={loading}>{children(setFailure)}</Suspense>
    </MapBoundary>
  );
}
