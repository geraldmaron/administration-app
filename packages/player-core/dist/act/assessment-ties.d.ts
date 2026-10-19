import { type Campaign, type TariffStatute } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ActAssessment } from "./assessment";
import type { ActOption } from "./catalogue";
import { type OptionPreview } from "./preview";
/** A meeting with a government, against not meeting. */
export declare function engagementAssessment(campaign: Campaign, nation: NationId, option: ActOption, preview: OptionPreview): ActAssessment;
/** A treaty, against not signing one. */
export declare function treatyAssessment(campaign: Campaign, nation: NationId, option: ActOption, preview: OptionPreview): ActAssessment;
export declare function tariffAssessment(campaign: Campaign, nation: NationId, option: ActOption, preview: OptionPreview, sector?: string, rate?: number, statute?: TariffStatute): ActAssessment;
/** Asking Congress to authorize force, against asking no one. */
export declare function authorizationAssessment(campaign: Campaign, nation: NationId, option: ActOption, preview: OptionPreview): ActAssessment;
