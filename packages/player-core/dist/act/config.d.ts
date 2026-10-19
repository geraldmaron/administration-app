import { type ActConfig } from "./catalogue";
/** Unknown choices are dropped. Explicit tariff rates stay intact so validation can refuse them without substituting an order. */
export declare function parseActConfig(search: Readonly<Record<string, unknown>>): ActConfig;
/** The address query for a set of settings; the inverse of `parseActConfig`. */
export declare function actSearchOf(config: ActConfig): Record<string, string | number>;
