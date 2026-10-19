// The one shape every dataset check reports in. In its own module so a check
// file can import it without importing the validator that calls it back.
export type ValidationError = {
  kind:
    | "shape"
    | "dangling-reference"
    | "plausibility"
    | "unit-mismatch"
    | "currency-rate-mismatch";
  path: string;
  message: string;
};
