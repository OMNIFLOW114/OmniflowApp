module.exports = {
  env: {
    es6: true,
    node: true, // This line ensures Node.js globals like module and require are recognized
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "no-undef": "error", // Ensures that all variables are defined before use
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }] // Ignores unused function arguments that start with "_"
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {
    module: "readonly", // Define globals that should be considered "readonly"
    require: "readonly", // Allow use of require in Node.js environment
  },
};
