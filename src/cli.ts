#!/usr/bin/env node

/**
 * Package entrypoint. With no arguments it starts the MCP server over stdio, which is what
 * Claude Desktop does when it runs `npx fantasy-mcp-es`.
 */

import { startServer } from './server.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

const USAGE = `${PACKAGE_NAME} v${PACKAGE_VERSION}

Uso:
  ${PACKAGE_NAME}              arranca el servidor MCP por stdio
  ${PACKAGE_NAME} auth         inicia sesión en LaLiga Fantasy (todavía no disponible)
  ${PACKAGE_NAME} --version    imprime la versión
  ${PACKAGE_NAME} --help       muestra esta ayuda

Proyecto no oficial, sin relación con LaLiga.
`;

async function main(argv: readonly string[]): Promise<number> {
  const command = argv[0];

  switch (command) {
    case undefined:
      await startServer();
      return 0;

    case '--version':
    case '-v':
      process.stdout.write(`${PACKAGE_VERSION}\n`);
      return 0;

    case '--help':
    case '-h':
    case 'help':
      process.stdout.write(USAGE);
      return 0;

    case 'auth':
      process.stderr.write(
        'El comando `auth` todavía no está disponible: el inicio de sesión con LaLiga aún ' +
          'no está implementado.\n',
      );
      return 1;

    default:
      process.stderr.write(`Comando desconocido: ${command}\n\n${USAGE}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => {
    // The stdio server never resolves; the exit code is only set for the other commands.
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${detail}\n`);
    process.exitCode = 1;
  });
