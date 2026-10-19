export type ValidationError = {
    kind: "shape" | "dangling-reference" | "plausibility" | "unit-mismatch" | "currency-rate-mismatch";
    path: string;
    message: string;
};
