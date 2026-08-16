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
          // `eslint.config.js` no está en el tsconfig (allowJs está desactivado).
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // `domain/` se reutilizará fuera del MCP (ver CLAUDE.md): no puede depender del
    // protocolo. La regla la comprueba el linter, no la buena fe.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/tools/**', '@modelcontextprotocol/*'],
              message: 'domain/ no puede importar de tools/ ni del SDK de MCP.',
            },
          ],
        },
      ],
    },
  },
]);
