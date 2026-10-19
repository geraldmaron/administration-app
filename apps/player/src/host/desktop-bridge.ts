import type { DesktopBridge } from "@admin/player-core";

/**
 * The typed bridge the Electron host exposes (DECISIONS §8.3). It exists only
 * when the web export runs inside the desktop host; the browser and the
 * phone builds never see it.
 */
export function desktopBridge(): DesktopBridge | undefined {
  const host = globalThis as { administrationDesktop?: DesktopBridge };
  return host.administrationDesktop;
}
