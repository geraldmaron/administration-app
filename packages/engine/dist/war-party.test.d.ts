declare global {
    interface ImportMeta {
        glob(pattern: readonly string[], options: {
            readonly query: "?raw";
            readonly import: "default";
            readonly eager: true;
        }): Record<string, string>;
    }
}
export {};
