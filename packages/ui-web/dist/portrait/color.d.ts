export type Hsl = {
    readonly h: number;
    readonly s: number;
    readonly l: number;
};
export declare function hexToHsl(hex: string): Hsl;
export declare function hslToHex({ h, s, l }: Hsl): string;
export declare function shift(hex: string, d: {
    h?: number;
    s?: number;
    l?: number;
}): string;
export declare function mix(a: string, b: string, t: number): string;
