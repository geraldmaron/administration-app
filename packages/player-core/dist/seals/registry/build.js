/** One seal: its shape, its tinctures (field, rim, device), its device and the legend around it. */
export function seal(id, shape, [field, rim, device], deviceId, legend, extra = {}) {
    return {
        id,
        shape,
        field,
        rim,
        ...(legend ? { ring: { text: legend, color: rim === field ? device : rim } } : {}),
        device: deviceId,
        deviceColor: device,
        ...extra,
    };
}
export const USA = "UNITED STATES OF AMERICA";
export function byId(specs) {
    return Object.fromEntries(specs.map((spec) => [spec.id, spec]));
}
