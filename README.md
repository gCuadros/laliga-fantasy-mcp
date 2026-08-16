# fantasy-mcp-es

Servidor MCP para consultar tu plantilla, el mercado y tu liga de LaLiga Fantasy desde
Claude.

> **Proyecto no oficial.** No está afiliado, asociado, autorizado ni respaldado por LaLiga
> ni por ninguna de sus filiales. "LaLiga" y "LaLiga Fantasy" son marcas de sus respectivos
> propietarios. Este software es de uso personal y con fines educativos: sólo accede a los
> datos de tu propia cuenta, no redistribuye datos y no aloja servidores propios. Úsalo
> bajo tu responsabilidad y respetando los términos de servicio de LaLiga.

## Estado

**Fase 1 de 5 (scaffolding).** El servidor arranca y expone una sola tool, `health_check`.

Todavía **no hay ninguna tool de datos**: la API de LaLiga Fantasy no es pública y su
contrato (`docs/API.md`) se verifica a mano antes de escribir cliente alguno. Hasta que esa
verificación esté hecha, nada de este repositorio hace peticiones a la API.

| Fase                              | Estado             |
| --------------------------------- | ------------------ |
| 0 · Verificación de la API        | pendiente (manual) |
| 1 · Scaffolding                   | ✅                 |
| 2 · Autenticación (OAuth2 + PKCE) | pendiente          |
| 3 · Cliente y dominio             | pendiente          |
| 4 · Las 7 tools y publicación     | pendiente          |

## Requisitos

Node.js 20 o superior.

## Configuración en Claude Desktop

Edita el fichero de configuración:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fantasy-es": {
      "command": "npx",
      "args": ["-y", "fantasy-mcp-es"]
    }
  }
}
```

Reinicia Claude Desktop y pídele que ejecute `health_check`.

> El paquete se publicará en npm en la Fase 4. Mientras tanto, clona el repositorio,
> ejecuta `npm install && npm run build` y apunta la configuración a tu copia local:
> `"command": "node"`, `"args": ["/ruta/al/repo/dist/server.js"]`.

## Variables de entorno

| Variable                | Valor                         | Para qué                                                                                                                   |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `FANTASY_API_HOST`      | `legacy`, `app` o un hostname | Elige el host de la API. **Sin valor por defecto**: hay dos candidatos y la Fase 0 aún no ha confirmado cuál es el vigente |
| `FANTASY_ENABLE_WRITES` | `true`                        | Habilita las escrituras (pujas, alineación). Fase 5; hoy no hace nada                                                      |

Las credenciales nunca se configuran por entorno. En la Fase 2, `npx fantasy-mcp-es auth`
abrirá el navegador y guardará únicamente un refresh token cifrado en
`~/.fantasy-mcp-es/credentials.json` con permisos `0600`.

## Desarrollo

```bash
npm install
npm run dev        # servidor en watch
npm run build      # compilar a dist/
npm test           # tests
npm run lint       # eslint
npm run inspector  # MCP Inspector contra dist/server.js
```

## Licencia

MIT © Gonzalo Cuadros. Ver [LICENSE](LICENSE).

Este proyecto **no** contiene código derivado de otros clientes de LaLiga Fantasy; en
particular, no reutiliza código de proyectos con licencia GPL.
