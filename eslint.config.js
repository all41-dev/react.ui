import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "claude_docs/**", "public/**"],
  },

  // TypeScript sources — type-aware so @typescript-eslint/no-deprecated works
  // (it replaces the unmaintained `deprecation` plugin used by the old .eslintrc.js).
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // v7 moved the flat configs under `flat`; the top-level keys are now
      // legacy eslintrc shape, which ESLint 10 rejects outright.
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      // A library legitimately co-exports helpers next to components
      // (makeActionColumns, getRowId, toTooltipText). HMR hint, not a defect.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-deprecated": "warn",
      "@typescript-eslint/member-ordering": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },

  // The datagrid is a library, not app screens: cell renderers, HOC factories and
  // their option types legitimately live next to the components that consume them.
  // Fast refresh falling back to a full reload for these files is acceptable.
  {
    files: ["src/components/datagrid/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // Plain JS (this config file, tooling scripts) — no type information available.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
);
