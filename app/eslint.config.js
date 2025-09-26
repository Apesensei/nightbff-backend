const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended'); // Requires eslint-plugin-prettier and eslint-config-prettier

module.exports = [
  // Global ignores
  { 
    ignores: ["dist/", ".eslintrc.js", "eslint.config.js"] // Ignore build output and old/new config files
  },
  
  // Base configuration for TypeScript files
  {
    files: ["src/**/*.ts", "test/**/*.ts"], // Apply to TS files in src and test
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: { // Define global environments
          node: true,
          jest: true,
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      // Start with recommended rules
      ...typescriptPlugin.configs['recommended'].rules,
      // Turn off specific rules as per original config
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Add other rule overrides if needed
    },
  },
  
  // Configuration specifically for test files to relax certain rules
  {
    files: ["test/**/*.spec.ts", "test/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.ts", "src/**/tests/**/*.ts"],
    rules: {
      // It's common to have unused variables in test setups (e.g., for mocks)
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Apply Prettier recommendations (must be last)
  eslintPluginPrettierRecommended, 
]; 