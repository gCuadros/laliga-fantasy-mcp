#!/usr/bin/env node

/**
 * Entrypoint del paquete. Sin argumentos arranca el servidor MCP por stdio, que es lo que
 * hace Claude Desktop al lanzar `npx fantasy-mcp-es`.
 */

import { startServer } from './server.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

const USAGE = `${PACKAGE_NAME} v${PACKAGE_VERSION}

Uso:
  ${PACKAGE_NAME}              arranca el servidor MCP por stdio
  ${PACKAGE_NAME} auth         inicia sesión en LaLiga Fantasy (Fase 2, aún no disponible)
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
        'El comando `auth` llega en la Fase 2. El flujo OAuth2 + PKCE contra el B2C de ' +
          'LaLiga está bloqueado hasta que docs/API.md documente sus endpoints.\n',
      );
      return 1;

    default:
      process.stderr.write(`Comando desconocido: ${command}\n\n${USAGE}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => {
    // El servidor stdio no termina: sólo se fija el código cuando main resuelve.
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${detail}\n`);
    process.exitCode = 1;
  });
