import type { OutletFormat, OutletStance } from "./press-outlets.js";
type FormatVoice = Readonly<Record<OutletStance, string>>;
export declare const FORMAT_VOICE: Readonly<Partial<Record<OutletFormat, FormatVoice>>>;
export {};
