import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    ...nextPlugin.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
