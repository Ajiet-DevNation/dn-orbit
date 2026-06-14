import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "app/generated/prisma/**",
    // Pre-bundled (esbuild) vendored component from 21st.dev — minified, not
    // human-editable source, so linting it is meaningless (also @ts-nocheck'd).
    "components/ui/8bit-toast.tsx",
  ]),
]);

export default eslintConfig;
