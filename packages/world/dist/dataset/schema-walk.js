// One walk over a zod schema, producing the leaves a registry can be checked
// against: what each leaf is, whether it may be absent, and the bounds the
// schema itself enforces. Every registry that claims to cover a schema (units,
// consumers, metrics) walks it through here, so they cannot disagree about
// what the schema's leaves are.
const defOf = (node) => node.def ?? node._def ?? {};
function numericBounds(def) {
    let min;
    let max;
    let integer = false;
    for (const check of def.checks ?? []) {
        const c = check._zod?.def;
        if (!c)
            continue;
        if (c.check === "greater_than" && c.value !== undefined)
            min = c.value;
        if (c.check === "less_than" && c.value !== undefined)
            max = c.value;
        if (c.check === "number_format" && c.format?.includes("int"))
            integer = true;
    }
    return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), integer };
}
function leafOf(path, def, optional) {
    switch (def.type) {
        case "number": {
            const { min, max, integer } = numericBounds(def);
            return { path, type: integer ? "integer" : "number", optional, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
        }
        case "boolean":
            return { path, type: "boolean", optional };
        case "enum":
            return { path, type: "enum", optional, options: Object.values(def.entries ?? {}) };
        case "array":
            return { path, type: "list", optional };
        case "record":
            return { path, type: "record", optional };
        default:
            return { path, type: "text", optional };
    }
}
/**
 * Every leaf under `schema`, depth first, in declaration order. An object is
 * never a leaf; an array or record is, because its entries have to agree with
 * something outside the record and a registry treats it as one value.
 */
export function schemaLeaves(schema, prefix = "", optional = false) {
    const def = defOf(schema);
    if ((def.type === "optional" || def.type === "nullable" || def.type === "default") && def.innerType) {
        return schemaLeaves(def.innerType, prefix, true);
    }
    if (def.type === "object" && def.shape) {
        return Object.entries(def.shape).flatMap(([key, child]) => schemaLeaves(child, prefix ? `${prefix}.${key}` : key, optional));
    }
    return [leafOf(prefix, def, optional)];
}
