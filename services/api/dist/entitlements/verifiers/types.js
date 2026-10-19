/** Wraps a transport call so a network fault becomes `unavailable`, never `invalid`. */
export async function attempt(platform, call) {
    try {
        return await call();
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { status: "unavailable", reason: `${platform} verification could not complete: ${detail}` };
    }
}
export function parseJson(body) {
    const parsed = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null) {
        throw new Error("store response was not a JSON object");
    }
    return parsed;
}
