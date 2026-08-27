// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "@stylistic/arrow-parens": ["error", "always"],
    "@stylistic/comma-dangle": ["error", "always-multiline"],
    "@stylistic/member-delimiter-style": [
      "error",
      {
        multiline: { delimiter: "semi", requireLast: true },
        singleline: { delimiter: "semi", requireLast: false },
      },
    ],
    "@stylistic/operator-linebreak": [
      "error",
      "after",
      { overrides: { "?": "before", ":": "before" } },
    ],
    "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
    "@stylistic/semi": ["error", "always"],
    "vue/no-multiple-template-root": "off",
    "vue/max-attributes-per-line": ["error", { singleline: 3 }],
    "vue/singleline-html-element-content-newline": "off",
  },
});
