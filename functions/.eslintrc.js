module.exports = {
    "env": {
        "browser": false,
        "es6": true,
        "mocha": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "react-hooks"
    ],
    "rules": {
        "@typescript-eslint/camelcase": 0,
        "react-hooks/rules-of-hooks": "warn", // Checks rules of Hooks
        "react-hooks/exhaustive-deps": "warn"
    }
};