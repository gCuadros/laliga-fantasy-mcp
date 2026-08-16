# fantasy-mcp-es

Servidor MCP para consultar tu plantilla, el mercado y tu liga de LaLiga Fantasy desde
Claude.

> **Proyecto no oficial.** No está afiliado, asociado, autorizado ni respaldado por LaLiga
> ni por ninguna de sus filiales. "LaLiga" y "LaLiga Fantasy" son marcas de sus respectivos
> propietarios. Este software es de uso personal y con fines educativos: sólo accede a los
> datos de tu propia cuenta, no redistribuye datos y no aloja servidores propios. Úsalo
> bajo tu responsabilidad y respetando los términos de servicio de LaLiga.

En desarrollo: todavía no hay versión publicada en npm.

## Requisitos

Node.js 20 o superior.

## Configuración en Claude Desktop

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

El fichero está en `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) o `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Reinicia Claude Desktop
después de editarlo.

## Licencia

MIT © Gonzalo Cuadros. Ver [LICENSE](LICENSE).

Este proyecto **no** contiene código derivado de otros clientes de LaLiga Fantasy; en
particular, no reutiliza código de proyectos con licencia GPL.
