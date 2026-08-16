# fantasy-mcp-es — Plan de desarrollo

**v2 · 14 agosto 2026** · Decisiones cerradas, listo para ejecutar

---

## 0. Advertencia

Nada de lo que hay aquí sobre endpoints está verificado de primera mano. Todo procede de
proyectos de terceros que han hecho reverse engineering. **La Fase 0 es verificarlo.**
Hasta entonces, cada URL de este documento es una hipótesis.

Discrepancia sin resolver:

| Fuente                                                  | Host                           |
| ------------------------------------------------------- | ------------------------------ |
| `alxgarci/marca-fantasy-api-scraper-updated` (Python)   | `api-fantasy.llt-services.com` |
| `Externoak/LaLigaApp` (React/Electron, activo jul-2026) | `fantasy-api.llt-services.com` |

LaLigaApp es más reciente y activo, así que a priori es la referencia más fiable. Confirmar
con DevTools, no asumir.

---

## 1. Decisiones cerradas

| Decisión   | Valor                        | Consecuencia                                    |
| ---------- | ---------------------------- | ----------------------------------------------- |
| Lenguaje   | TypeScript + SDK oficial MCP | Distribución `npx`, sin fricción de instalación |
| Licencia   | **MIT**                      | Prohibido copiar código de LaLigaApp (GPL-3.0)  |
| Transporte | **stdio local**              | Cero servidores, cero tokens de terceros        |
| Escrituras | **Fuera del MVP**            | Fase 5, tras flag explícito                     |
| Nombre npm | `fantasy-mcp-es`             | Evita "LaLiga" por marca                        |

La decisión de MIT es la que más disciplina exige: LaLigaApp resuelve el OAuth B2C completo
y va a ser tentador copiar. Hay que leerlo, entenderlo y reimplementar.

---

## 2. Ventana temporal

La temporada 2026/27 arranca estos días. El interés de la comunidad Fantasy se concentra en
agosto-septiembre: es cuando la gente monta plantilla y prueba herramientas. En noviembre
cada manager ya tiene su rutina.

**MVP funcional y publicado en 3-4 semanas**, aunque sea con superficie mínima. Nada de
construir el pipeline perfecto primero.

---

## 3. Estado del arte

Para Fantasy LaLiga **no existe ningún MCP**. Hueco limpio.

| Proyecto                                     | Qué aporta                                                                              | Licencia                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------ |
| `Externoak/LaLigaApp`                        | Referencia clave. OAuth2 B2C completo, mercado, pujas, onces probables. v3.5.0 jul-2026 | **GPL-3.0** + atribución |
| `carlosgeos/laligafantasy`                   | Enfoque analítico: histórico de precios, curvas de valor                                | revisar                  |
| `alxgarci/marca-fantasy-api-scraper-updated` | Estructura JSON de jugadores, `marketValue` por fecha                                   | revisar                  |
| `diegoparrilla/marca-fantasy-scraper`        | El original                                                                             | revisar                  |

**Calibración de expectativas:** FPL (Premier) tiene ~7 servidores MCP y ninguno con
tracción masiva. Esto es portfolio y comunidad, no negocio. `lewis-king/fpl-mcp-server`
expone 30+ tools: el anti-patrón a evitar.

---

## 4. Autenticación — el riesgo número 1

OAuth2 contra el tenant **Azure AD B2C** de LaLiga. Login social con Google y
email/contraseña. JWT con refresco. **Access token de 24 horas.**

Consecuencias de diseño:

1. No se puede pedir al usuario que pegue un bearer: caduca cada día. Hace falta refresh.
2. El tenant no es nuestro. Reutilizamos el `client_id` del cliente web oficial. Si LaLiga
   rota configuración, quedamos fuera.
3. Nunca credenciales en texto plano en config.

Flujo objetivo:

```
npx fantasy-mcp-es auth
  → abre navegador contra el B2C de LaLiga
  → callback a http://localhost:<puerto>
  → guarda refresh_token en ~/.fantasy-mcp-es/credentials.json (0600, cifrado)
  → el servidor refresca el access token de forma transparente
```

---

## 5. Superficie de tools

**Principio:** cada tool responde una _pregunta de manager_, no envuelve un endpoint. Si
Claude necesita encadenar cuatro llamadas para decidir si vender a un jugador, el diseño
está mal.

### MVP — 7 tools de lectura

| Tool                   | Devuelve                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `get_my_squad`         | Plantilla con puntos, valor, delta 7d, estado, titularidad     |
| `get_market`           | Mercado con precio, tendencia y ratio puntos/precio            |
| `analyze_player`       | Histórico de puntos, curva de valor, próximos rivales, minutos |
| `get_league_standings` | Clasificación con puntos y valor de plantilla                  |
| `get_rival_squad`      | Plantilla de un rival                                          |
| `search_players`       | Búsqueda con filtros (posición, precio, forma)                 |
| `get_gameweek`         | Jornada actual, calendario, deadline                           |

### Fase 5 — escrituras

`place_bid`, `sell_player`, `set_lineup`, `set_captain`. Requieren
`FANTASY_ENABLE_WRITES=true` y preview de confirmación. Un agente pujando 20M por error no
tiene deshacer.

### Formato de salida

- Texto compacto, no JSON crudo
- Nombres, no IDs: `"Lamine Yamal"`, no `"player_18923"`
- Números ya calculados: `"+2.1M en 7d"`, no siete valores absolutos
- Paginación agresiva por defecto

---

## 6. Arquitectura

```
fantasy-mcp-es/
├── CLAUDE.md
├── docs/
│   ├── PLAN.md      (este fichero)
│   └── API.md       (contrato verificado — fuente de verdad)
├── src/
│   ├── auth/        OAuth2 B2C, refresh, almacenamiento cifrado
│   ├── client/      HTTP tipado, rate limiting, cache TTL
│   ├── domain/      tendencias, ratios, chollos
│   ├── tools/       definiciones MCP (finas)
│   └── server.ts    entrypoint stdio
└── bin/cli.ts       comando `auth`
```

`domain/` no importa de `tools/`. Es lo que después se reutiliza para el bot de datos sin
reescribir nada.

**Cache con TTL por tipo de dato.** Los valores de mercado cambian a diario; el histórico
de puntos nunca. Sin esto se martillea la API y llega el ban de IP.

---

## 7. Legal

**GPL.** LaLigaApp es GPL-3.0 con atribución obligatoria. Copiar su código de auth
contamina el proyecto. Usar como documentación, reimplementar.

**Términos de LaLiga.** API no pública, zona gris. Mitigaciones que funcionan (LaLigaApp
lleva un año publicado aplicándolas):

- Disclaimer visible: proyecto no oficial, no afiliado
- Sin servidores propios, sin redistribución de datos
- Rate limiting respetuoso, User-Agent identificable
- Sin eludir medidas técnicas
- Licencia clara y propósito educativo declarado

Riesgo real: DMCA takedown a GitHub. Bajo, no cero. Tener backup del repo.

**futbolfantasy.com** (onces probables, tendencias): scraping de un tercero distinto.
Módulo opcional y desactivable, fuera del MVP.

---

## 8. Fases

### Fase 0 — Verificación (2-3 días) ⚠️ BLOQUEANTE, MANUAL

No se puede delegar en el CLI: requiere login real en el navegador.

- DevTools sobre `fantasy.laliga.com`, Network → Fetch/XHR, Preserve log
- Capturar el flujo de login completo (authorize, token, callback)
- Confirmar host, versión de API y cabeceras
- Navegar por equipo, mercado, clasificación, jugador, alineación
- Rellenar `docs/API.md` con peticiones y respuestas reales anonimizadas

**Salida:** `docs/API.md` completo. Sin esto, las fases 1-3 están bloqueadas.

### Fase 1 — Scaffolding (medio día) ✅ delegable al CLI

Proyecto TypeScript, tooling, estructura de carpetas, servidor MCP mínimo que arranca y
expone una tool de health check. Sin tocar la API real.

### Fase 2 — Auth (3-5 días)

OAuth2 + PKCE con callback local, refresh automático, persistencia cifrada, comando `auth`
end-to-end. _Es donde más gente se atasca. Presupuestar el doble._

### Fase 3 — Cliente y dominio (4-5 días)

Cliente HTTP tipado, cache TTL, rate limiting. Cálculos de tendencia, ratio puntos/precio,
forma.

### Fase 4 — Tools y publicación (4-5 días)

Las 7 tools, prompts predefinidos (análisis de jornada, decisión de venta, elección de
capitán), verificación con MCP Inspector. README con bloque de config, publicación en npm y
registro en el MCP Registry, vídeo de demo.

### Fase 5 — Escrituras (opcional, post-lanzamiento)

Solo con tracción y con el flag de seguridad.

**Total MVP: ~3 semanas.**

---

## 9. Riesgos

| Riesgo                                | Prob. | Impacto | Mitigación                                         |
| ------------------------------------- | ----- | ------- | -------------------------------------------------- |
| Cambio en la API rompe todo           | Alta  | Alto    | Tests de contrato en CI diario, cliente aislado    |
| Flujo B2C más complejo de lo previsto | Media | Alto    | Fase 0 y 2 pronto, para descubrirlo ya             |
| Ban de IP                             | Media | Medio   | Cache agresiva, backoff, límites conservadores     |
| Contaminación GPL                     | Media | Medio   | Reimplementar, no copiar                           |
| Takedown                              | Baja  | Alto    | Disclaimers, sin redistribución, backup            |
| Nadie lo usa                          | Media | Bajo    | Es portfolio; el valor es el pipeline reutilizable |

---

## 10. Registro de progreso

Actualizar al cerrar cada fase.

- [ ] Fase 0 — Verificación
- [x] Fase 1 — Scaffolding · 14 ago 2026 · TypeScript ESM + SDK MCP, tooling (tsc estricto,
      eslint type-checked, prettier, vitest), estructura `src/` completa, `health_check`
      operativa por stdio y verificada con el MCP Inspector. Sin tocar la API.
- [ ] Fase 2 — Auth
- [ ] Fase 3 — Cliente y dominio
- [ ] Fase 4 — Tools y publicación
- [ ] Fase 5 — Escrituras
