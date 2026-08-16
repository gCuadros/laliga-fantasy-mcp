// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'node_modules/**', '.tokensave/**']),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // `eslint.config.js` is not part of the tsconfig (allowJs is off).
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // `domain/` will be reused outside the MCP server, so it must not depend on the
    // protocol. Enforced by the linter rather than by good intentions.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/tools/**', '@modelcontextprotocol/*'],
              message: 'domain/ must not import from tools/ or from the MCP SDK.',
            },
          ],
        },
      ],
    },
  },
]);
