import { statehouseStance } from "@admin/engine";
function lineFor(stance, state) {
    switch (stance) {
        case "partner":
            return `${state} runs your programs through its own state agencies.`;
        case "arms-length":
            return `${state} works with you when it helps the state and keeps its distance otherwise.`;
        case "refusing":
            return `${state} is dragging its feet on federal programs, and its governor is campaigning against you.`;
    }
}
/** One statehouse's stance and its line. Undefined where no governor is seated. */
export function statehouseReading(campaign, state) {
    const stance = statehouseStance(campaign, state);
    if (!stance)
        return undefined;
    const name = campaign.states[state]?.base.name ?? state;
    return { stance, line: lineFor(stance, name) };
}
