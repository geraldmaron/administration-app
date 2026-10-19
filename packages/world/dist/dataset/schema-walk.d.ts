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
type Check = {
    readonly _zod?: {
        readonly def?: {
            readonly check?: string;
            readonly value?: number;
            readonly inclusive?: boolean;
            readonly format?: string;
        };
    };
};
type Def = {
    readonly type?: string;
    readonly shape?: Record<string, SchemaNode>;
    readonly innerType?: SchemaNode;
    readonly element?: SchemaNode;
    readonly entries?: Record<string, string>;
    readonly checks?: readonly Check[];
};
export type SchemaNode = {
    readonly _def?: Def;
    readonly def?: Def;
};
/**
 * Every leaf under `schema`, depth first, in declaration order. An object is
 * never a leaf; an array or record is, because its entries have to agree with
 * something outside the record and a registry treats it as one value.
 */
export declare function schemaLeaves(schema: SchemaNode, prefix?: string, optional?: boolean): readonly SchemaLeaf[];
export {};
