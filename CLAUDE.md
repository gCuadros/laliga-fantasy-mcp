# fantasy-mcp-es

Servidor MCP para LaLiga Fantasy (juego oficial de LaLiga). Permite a Claude consultar
plantilla, mercado, liga y jugadores del usuario para ayudarle a tomar decisiones.

Plan completo en `docs/PLAN.md`. Contrato de API en `docs/API.md`.

## Decisiones cerradas

| Decisión   | Valor                        | Motivo                                                 |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| Lenguaje   | TypeScript + SDK oficial MCP | Distribución vía `npx`, stack del autor                |
| Licencia   | MIT                          | Requiere **no copiar** código de LaLigaApp (GPL-3.0)   |
| Transporte | stdio (local)                | No custodiar tokens de terceros contra un tenant ajeno |
| Escrituras | Fuera del MVP                | Pujas y alineación llegan en fase 5, detrás de flag    |
| Nombre npm | `fantasy-mcp-es`             | Evita "LaLiga" por marca                               |

## Reglas no negociables

1. **No inventes endpoints.** La API de LaLiga Fantasy no es pública. Todo endpoint que
   uses debe estar documentado en `docs/API.md` con una respuesta real capturada. Si algo
   no está ahí, para y dilo — no lo deduzcas por analogía con otro endpoint.

2. **No copies código de `Externoak/LaLigaApp`.** Es GPL-3.0 con atribución obligatoria y
   contaminaría este proyecto. Sirve como documentación para entender el flujo, no como
   fuente. Si en algún momento parece que la única salida es copiar, para y pregunta.

3. **Nada de credenciales en texto plano.** Ni en config, ni en env, ni en logs. El flujo
   es OAuth2 + PKCE con callback local; solo se persiste el refresh token, cifrado y con
   permisos 0600.

4. **Ninguna tool escribe** mientras `FANTASY_ENABLE_WRITES` no exista y esté a `true`.
   Cuando lleguen, toda escritura devuelve un preview de confirmación antes de ejecutar.

5. **Las tools devuelven texto compacto, no JSON crudo.** Nombres en vez de IDs, valores
   ya calculados (`"+2.1M en 7d"`, no siete valores absolutos), listados paginados.

## Arquitectura

```
src/
├── auth/      OAuth2 Azure B2C, refresh, almacenamiento cifrado
├── client/    cliente HTTP tipado, rate limiting, cache con TTL
├── domain/    lógica de negocio: tendencias, ratios, chollos
├── tools/     definiciones MCP — finas, delegan en domain
└── server.ts  entrypoint stdio
bin/cli.ts     comando `auth`
```

`domain/` no debe importar nada de `tools/`. Es la capa que después se reutiliza fuera
del MCP (bot de datos), así que se mantiene independiente del protocolo.

## Estado sin verificar

Hay dos hosts candidatos en proyectos de terceros y **no sabemos cuál es el vigente**:

- `api-fantasy.llt-services.com` (scrapers Python, más antiguos)
- `fantasy-api.llt-services.com` (LaLigaApp, activo jul-2026)

Hasta que la Fase 0 lo resuelva, ningún código debe hardcodear uno de los dos fuera de
`src/client/config.ts`.

## Contexto de la API (hipótesis, pendiente de verificar)

Cabeceras que parecen requeridas:

```
Authorization: Bearer <access_token>
Referer: https://fantasy.laliga.com/
X-App: Fantasy-web
X-Lang: es
```

Auth: OAuth2 contra tenant Azure AD B2C de LaLiga. Access token de 24h. No podemos
registrar cliente propio ni pedir scopes.

## Comandos

```bash
npm run dev          # servidor en watch
npm run build        # compilar
npm test             # tests
npx @modelcontextprotocol/inspector node dist/server.js   # probar tools
```
