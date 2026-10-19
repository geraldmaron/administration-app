import { boundPlace } from "./scenario-text.js";
import { renderText } from "./scenario-text.js";
/** Render all briefing fields, including snapshots saved before this binding fix. */
export function renderScenarioBrief(campaign, def, counterpart, place = boundPlace(campaign, def, counterpart)) {
    const render = (text) => renderText(campaign, counterpart, text, place);
    return { ...def,
        ...(def.particulars ? { particulars: def.particulars.map((item) => ({ label: render(item.label), value: render(item.value) })) } : {}),
        ...(def.context ? { context: { ...def.context, standing: render(def.context.standing), precedent: render(def.context.precedent), inaction: render(def.context.inaction), unknown: render(def.context.unknown), pressures: def.context.pressures.map((item) => ({ ...item, want: render(item.want) })) } } : {}),
    };
}
