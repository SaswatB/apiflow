module.exports = {
  root: true,
  parserOptions: {
    parser: "@typescript-eslint/parser",
    sourceType: "module",
    ecmaFeatures: {
      legacyDecorators: true,
      jsx: true
    }
  },
  env: {
    browser: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "plugin:vue/recommended"
  ],
  globals: {
    __static: true
  },
  plugins: [
    "vue"
  ],
  "rules": {
    // allow paren-less arrow functions
    "arrow-parens": 0,
    // allow async-await
    "generator-star-spacing": 0,
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
    "no-console": 0,
    // limit number of html attributes on each line
    "vue/max-attributes-per-line": [2, {
      "singleline": 4,
      "multiline": {
        "max": 1,
        "allowFirstLine": true
      }
    }],
    // typescript automatically checks for unused vars
    "no-unused-vars": "off"
  }
}