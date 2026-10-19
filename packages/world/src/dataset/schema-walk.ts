// One walk over a zod schema, producing the leaves a registry can be checked
// against: what each leaf is, whether it may be absent, and the bounds the
// schema itself enforces. Every registry that claims to cover a schema (units,
// consumers, metrics) walks it through here, so they cannot disagree about
// what the schema's leaves are.

export type SchemaLeafType = "number" | "integer" | "boolean" | "enum" | "text" | "list" | "record";

export type SchemaLeaf = {
  readonly path: string;
  readonly type: SchemaLeafType;
  /** Absent is a legal value: an optional field, or one wrapped in a default. */
  readonly optional: boolean;
  /** The bounds zod enforces, where it enforces any. A one-sided bound leaves the other end undefined. */
  readonly min?: number;
  readonly max?: number;
  /** The closed set of values an enum admits. */
  readonly options?: readonly string[];
};

type Check = { readonly _zod?: { readonly def?: { readonly check?: string; readonly value?: number; readonly inclusive?: boolean; readonly format?: string } } };

type Def = {
  readonly type?: string;
  readonly shape?: Record<string, SchemaNode>;
  readonly innerType?: SchemaNode;
  readonly element?: SchemaNode;
  readonly entries?: Record<string, string>;
  readonly checks?: readonly Check[];
};

export type SchemaNode = { readonly _def?: Def; readonly def?: Def };

const defOf = (node: SchemaNode): Def => node.def ?? node._def ?? {};

function numericBounds(def: Def): { min?: number; max?: number; integer: boolean } {
  let min: number | undefined;
  let max: number | undefined;
  let integer = false;
  for (const check of def.checks ?? []) {
    const c = check._zod?.def;
    if (!c) continue;
    if (c.check === "greater_than" && c.value !== undefined) min = c.value;
    if (c.check === "less_than" && c.value !== undefined) max = c.value;
    if (c.check === "number_format" && c.format?.includes("int")) integer = true;
  }
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), integer };
}

function leafOf(path: string, def: Def, optional: boolean): SchemaLeaf {
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
export function schemaLeaves(schema: SchemaNode, prefix = "", optional = false): readonly SchemaLeaf[] {
  const def = defOf(schema);
  if ((def.type === "optional" || def.type === "nullable" || def.type === "default") && def.innerType) {
    return schemaLeaves(def.innerType, prefix, true);
  }
  if (def.type === "object" && def.shape) {
    return Object.entries(def.shape).flatMap(([key, child]) => schemaLeaves(child, prefix ? `${prefix}.${key}` : key, optional));
  }
  return [leafOf(prefix, def, optional)];
}
