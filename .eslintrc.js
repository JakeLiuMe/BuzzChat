module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    // Extension globals
    chrome: 'readonly',
    browser: 'readonly',
    // BuzzChat globals
    BuzzChatSecurity: 'readonly',
    Analytics: 'readonly',
    SelectorManager: 'readonly',
    ExtPay: 'readonly'
  },
  rules: {
    // Errors
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-console': ['warn', {
      allow: ['warn', 'error', 'log'] // Allow log for [BuzzChat] prefixed logging
    }],

    // Best practices
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Style (non-blocking)
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'comma-dangle': ['warn', 'never'],

    // Security
    'no-new-func': 'error'
  },
  overrides: [
    {
      // Test files
      files: ['tests/**/*.js', '**/*.test.js'],
      env: {
        node: true
      },
      globals: {
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    {
      // Config files
      files: ['*.config.js', 'scripts/*.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
