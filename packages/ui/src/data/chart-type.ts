import { typography } from "@admin/design";

/**
 * Chart text drawn in SVG at pixel size: axis ticks and end labels. SVG text
 * does not follow the rem scale, so it is pinned to the caption step (the
 * smallest text the player reads anywhere) rather than set per chart.
 */
export const CHART_LABEL_SIZE = typography.size.caption * 16;
