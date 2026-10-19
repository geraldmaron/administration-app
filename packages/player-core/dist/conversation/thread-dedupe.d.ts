import type { ConversationBeat } from "@admin/engine";
import type { ScenarioParticular } from "@admin/content";
export declare function trimParticularRestatement(text: string, particulars: readonly ScenarioParticular[]): string;
export declare function beatsWithoutParticularRestatement(beats: readonly ConversationBeat[], particulars: readonly ScenarioParticular[] | undefined): readonly ConversationBeat[];
