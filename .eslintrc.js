module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "preact"
    ],
    "parserOptions": {
        "ecmaVersion": 2018,
        "ecmaFeatures": {
            "jsx": true
        },
        "sourceType": "module"
    },
    "settings": {
        "jest": { "version": 27 }
      },
    "rules": {
        "no-mixed-spaces-and-tabs": 0,
        "radix":0,
        "no-unused-vars": 1,
        "react/self-closing-comp": 1,
        "quote-props":1,
        "no-lonely-if":1
    }
};
