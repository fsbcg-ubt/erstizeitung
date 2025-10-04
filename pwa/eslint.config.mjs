// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import perfectionist from 'eslint-plugin-perfectionist';
import promisePlugin from 'eslint-plugin-promise';
import nodePlugin from 'eslint-plugin-n';
import regexpPlugin from 'eslint-plugin-regexp';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/workbox-*.js',
      'eslint.config.mjs',
      'pwa-assets.config.js',
      '**/*.config.js',
      'vitest.config.ts',
    ],
  },

  // Base JavaScript and TypeScript strict configuration
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,

  // Core configuration for all TypeScript files
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      unicorn,
      sonarjs,
      perfectionist,
      promise: promisePlugin,
      n: nodePlugin,
      regexp: regexpPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript-ESLint strict rules
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'property',
          format: null, // Allow any format for object properties
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Unicorn recommended rules
      ...unicorn.configs.recommended.rules,
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            props: true,
            Props: true,
            ref: true,
            Ref: true,
            params: true,
            Params: true,
            args: true,
            env: true,
            fn: true,
            dir: true,
            dest: true,
            src: true,
            err: true,
          },
        },
      ],
      'unicorn/no-null': 'off', // TypeScript uses null
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],

      // SonarJS recommended rules
      ...sonarjs.configs.recommended.rules,

      // Perfectionist sorting rules
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
            'object',
            'unknown',
          ],
          newlinesBetween: 'never',
          internalPattern: ['^@/.+'],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-object-types': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          partitionByComment: true,
        },
      ],
      'perfectionist/sort-enums': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],

      // Promise plugin rules
      ...promisePlugin.configs.recommended.rules,
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-new-statics': 'error',

      // Regexp plugin rules
      ...regexpPlugin.configs.recommended.rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // General strict rules
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // Node.js-specific configuration for build scripts
  {
    files: ['src/inject-html.ts', 'src/workbox-config.ts'],
    rules: {
      // Allow console in CLI scripts
      'no-console': 'off',
      // Node.js environment rules
      ...nodePlugin.configs.recommended.rules,
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'unicorn/prefer-module': 'off', // Allow CommonJS for Node scripts
    },
  },

  // Browser-specific configuration
  {
    files: [
      'src/register-sw.ts',
      'src/offline-indicator.ts',
      'src/install-button.ts',
    ],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        console: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        ServiceWorker: 'readonly',
        ServiceWorkerRegistration: 'readonly',
        Workbox: 'readonly',
      },
    },
    rules: {
      // Browser code should not use console except for errors
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },

  // Test files configuration
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      // Relax some rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'no-console': 'off',
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'unicorn/import-style': 'off', // Allow namespace imports for Node.js built-ins
    },
  },
);
