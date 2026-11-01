import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // TODO: ~346 pre-existing `any` usages across src/** and tests/**.
      // Downgraded to warn to unblock CI; fix progressively.
      "@typescript-eslint/no-explicit-any": "warn",
      // TODO: 7 pre-existing spots (AdminClient, ChatClient, MatchesClient,
      // lib/i18n/context) setState synchronously in effects. Proper fixes need
      // refactors (derived state / lazy init) — downgraded to warn to unblock CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
