/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" builds the /dev/map harness into a production bundle, for the frame-time measurement. */
  readonly VITE_MAP_HARNESS?: string;
}
