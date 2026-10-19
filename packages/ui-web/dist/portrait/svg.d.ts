type Attr = string | number | undefined;
export declare function el(tag: string, attrs: Readonly<Record<string, Attr>>, inner?: string): string;
export declare const path: (d: string, attrs?: Readonly<Record<string, Attr>>) => string;
export declare const group: (inner: string, attrs?: Readonly<Record<string, Attr>>) => string;
export declare const clip: (id: string, d: string) => string;
export {};
