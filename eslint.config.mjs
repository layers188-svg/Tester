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
    // Generated build output — Cloudflare adapter bundle and test runs.
    ".open-next/**",
    // wrangler's scratch directory, written by `cf:preview`. Already
    // gitignored; linting it reports on generated bundles rather than
    // on anything anyone wrote.
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
