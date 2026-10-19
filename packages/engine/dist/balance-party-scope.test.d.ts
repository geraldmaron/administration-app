declare global {
    interface ImportMeta {
        glob(pattern: string, options: {
            readonly query: "?raw";
            readonly import: "default";
            readonly eager: true;
        }): Record<string, string>;
    }
}
export {};
