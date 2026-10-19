import { z } from "zod";
/**
 * Short enough that a real sentence clears it, long enough that "budget" does
 * not. A mechanism that fits in a word is a label, not a mechanism.
 */
export declare const MECHANISM_FLOOR = 30;
/** One priced metric, and the sentence that says why the fiction moved it. */
export declare const MechanismNote: z.ZodObject<{
    reply: z.ZodString;
    metric: z.ZodEnum<{
        standing: "standing";
        treasury: "treasury";
        stability: "stability";
        militaryReadiness: "militaryReadiness";
    }>;
    because: z.ZodString;
}, z.core.$strip>;
export declare const BindingSidecar: z.ZodObject<{
    universal: z.ZodOptional<z.ZodString>;
    mechanisms: z.ZodOptional<z.ZodArray<z.ZodObject<{
        reply: z.ZodString;
        metric: z.ZodEnum<{
            standing: "standing";
            treasury: "treasury";
            stability: "stability";
            militaryReadiness: "militaryReadiness";
        }>;
        because: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type BindingSidecar = z.infer<typeof BindingSidecar>;
export type BindingFinding = {
    readonly kind: "unbound-week" | "undeclared-universal-week" | "premise-in-sidecar" | "universal-week-overused" | "calendar-gated-batch" | "topics-missing" | "mechanism-missing" | "mechanism-orphaned" | "binding-sidecar-malformed";
    readonly scenario: string;
    readonly message: string;
};
/** The gate's channel is a list of reason strings; the kind leads each one so a refusal is greppable. */
export declare function bindingErrors(raw: unknown): readonly string[];
/**
 * Every way a drafted document fails the binding contract.
 *
 * Takes the raw document rather than parsed defs because the mechanism sidecar
 * only exists before the parse. A document that does not parse at all returns
 * nothing: the shape errors are the report in that case, and piling binding
 * findings on top of them buries the reason it was refused.
 */
export declare function bindingFindings(raw: unknown): readonly BindingFinding[];
