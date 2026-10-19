import { type Campaign, type DirectiveKind, type DirectiveStatus, type EffectPacket, type InstitutionId, type RefusalMemorandum } from "@admin/engine";
export declare const DIRECTIVE_KIND_LABELS: Readonly<Record<DirectiveKind, {
    readonly label: string;
    readonly detail: string;
}>>;
export declare const DIRECTIVE_KIND_ORDER: readonly DirectiveKind[];
export type DirectiveTarget = {
    readonly institution: InstitutionId;
    readonly name: string;
    readonly kinds: readonly DirectiveKind[];
    /** Instructions this body has already refused; the second refusal at one body opens an inspector general's file. */
    readonly refusals: number;
};
/** Every standing body an instruction could be addressed to, cabinet departments and their bureaus by name. */
export declare function directiveTargets(campaign: Campaign): readonly DirectiveTarget[];
export type DirectivePreview = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly status: DirectiveStatus;
    /** The statute that bars it, printed unaltered, where it is barred. */
    readonly memorandum?: RefusalMemorandum;
    /** The body's politicization and oversight pressure, 0..1, before and after: a refusal raises both. */
    readonly politicization: {
        readonly before: number;
        readonly after: number;
    };
    readonly oversight: {
        readonly before: number;
        readonly after: number;
    };
    /** Whether this refusal is the one that makes it a pattern an inspector general opens a file on. */
    readonly opensInquiry: boolean;
    readonly summary: string;
};
/** What the body will do with this instruction, read off the packet the issue would commit. */
export declare function directivePreview(campaign: Campaign, institution: InstitutionId, kind: DirectiveKind, subject: string): DirectivePreview;
/** The instruction itself, built on the campaign it is committed against. */
export declare function directivePacket(campaign: Campaign, institution: InstitutionId, kind: DirectiveKind, subject: string): EffectPacket;
