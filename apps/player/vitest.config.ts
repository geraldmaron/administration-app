import { defineConfig } from "vitest/config";

// The app's tsconfig extends Expo's base, which Vite cannot resolve; unit tests
// cover pure modules, so they compile with a plain JSX setting instead.
export default defineConfig({
  esbuild: { tsconfigRaw: JSON.stringify({ compilerOptions: { jsx: "react-jsx", target: "es2022", useDefineForClassFields: true } }) },
  test: { include: ["src/**/*.test.ts"] },
});
