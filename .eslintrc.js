module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
    ],
    "parserOptions": {
        "ecmaVersion": 2018,
        "ecmaFeatures": {
            "jsx": true
        },
        "sourceType": "module"
    },
    "plugins": [
        "babel",
        "react"
    ],
    "settings": {
        "react": {
          "pragma": "h",
          "version": "preact"
        }
      },
    "rules": {
        "no-mixed-spaces-and-tabs": "off",
        "react-in-jsx-scope":"off"
    }
};
