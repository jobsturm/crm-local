import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  // TypeScript files config
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce no any
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Require explicit return types
      '@typescript-eslint/explicit-function-return-type': 'error',

      // Other strict rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/strict-boolean-expressions': 'off', // Too strict for now
      '@typescript-eslint/no-confusing-void-expression': 'off', // Conflicts with Express patterns
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } }, // Allow async Express handlers
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true }, // Allow numbers in template literals
      ],
      '@typescript-eslint/no-deprecated': 'warn', // Warn instead of error for deprecated
      '@typescript-eslint/no-empty-object-type': 'off', // Allow empty interfaces for DTOs
      '@typescript-eslint/no-unnecessary-type-parameters': 'off', // Allow for clarity
    },
  },
  // Vue files config
  {
    files: ['**/*.vue'],
    plugins: {
      vue: pluginVue,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
      // Browser globals (window, document, etc.) for Vue components
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...pluginVue.configs['flat/recommended'].rules,
      // Vue specific rules
      'vue/multi-word-component-names': 'off', // Allow single word component names like App.vue
      'vue/no-v-html': 'warn', // Warn about v-html usage
      'vue/require-default-prop': 'off', // Not needed with TypeScript
      'vue/require-prop-types': 'off', // TypeScript handles this
      
      // TypeScript rules (less strict for Vue files)
      '@typescript-eslint/explicit-function-return-type': 'off', // Vue composition API doesn't need this
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too noisy with Vue refs
      '@typescript-eslint/no-unsafe-member-access': 'off', // Too noisy with Vue refs
      '@typescript-eslint/no-unsafe-call': 'off', // Too noisy with Vue
      '@typescript-eslint/no-unsafe-return': 'off', // Too noisy with Vue
      '@typescript-eslint/no-unsafe-argument': 'off', // Too noisy with Vue
      '@typescript-eslint/no-floating-promises': 'off', // Vue lifecycle hooks don't await
      '@typescript-eslint/no-misused-promises': 'off', // Event handlers can be async
      '@typescript-eslint/no-confusing-void-expression': 'off', // Vue patterns
      '@typescript-eslint/require-await': 'off', // Vue async patterns
      '@typescript-eslint/no-unnecessary-condition': 'off', // Vue reactive patterns
    },
  },
  // Ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '*.js',
      '**/templates/**', // Reference files not part of build
    ],
  }
);
