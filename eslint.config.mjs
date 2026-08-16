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
    // Generated build output — Cloudflare adapter bundle, the Wrangler
    // scratch directory it builds through, and test runs. None of it is
    // ours to lint, and .wrangler/tmp in particular holds generated
    // worker bundles that report dozens of warnings.
    ".open-next/**",
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
