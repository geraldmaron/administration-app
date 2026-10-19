export function stageMoment(steps, durations, reducedMotion) {
    let elapsed = 0;
    return steps.map((step, index) => {
        if (index > 0 && !reducedMotion) {
            elapsed += step.pause === "reveal" ? durations.slow : durations.normal;
        }
        return { key: step.key, delayMs: elapsed };
    });
}
/** The whole moment's length: when its last step has appeared. */
export function momentLengthMs(schedule) {
    return schedule.at(-1)?.delayMs ?? 0;
}
