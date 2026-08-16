# API de LaLiga Fantasy — contrato verificado

> **Este fichero es la única fuente de verdad sobre la API.**
> Nada entra aquí sin haber sido capturado de una petición real. No se copian endpoints
> de repositorios de terceros: se verifican y se documentan de cero.
>
> Estado: **VACÍO — Fase 0 pendiente**

## Cómo rellenarlo

1. Abrir `https://fantasy.laliga.com` en Chrome con DevTools → Network, filtro Fetch/XHR
2. Hacer login completo con la pestaña abierta y "Preserve log" activado
3. Navegar por: mi equipo, mercado, clasificación, ficha de jugador, alineación
4. Para cada llamada relevante, documentarla abajo con petición y respuesta reales
5. Anonimizar: sustituir tokens, IDs de usuario y emails por placeholders

---

## Configuración base

| Campo                  | Valor  | Verificado |
| ---------------------- | ------ | ---------- |
| Host                   | `TODO` | ❌         |
| Versión de API         | `TODO` | ❌         |
| Cabeceras obligatorias | `TODO` | ❌         |

## Autenticación (Azure AD B2C)

| Campo             | Valor  | Verificado |
| ----------------- | ------ | ---------- |
| Authorize URL     | `TODO` | ❌         |
| Token URL         | `TODO` | ❌         |
| `client_id`       | `TODO` | ❌         |
| Scopes            | `TODO` | ❌         |
| Redirect URI      | `TODO` | ❌         |
| PKCE              | `TODO` | ❌         |
| TTL access token  | ¿24h?  | ❌         |
| TTL refresh token | `TODO` | ❌         |

---

## Endpoints

Plantilla por endpoint:

### `GET /ruta`

**Para qué:** …
**Auth:** sí / no
**Parámetros:** …

<details><summary>Respuesta real (anonimizada)</summary>

```json
{}
```

</details>

**Campos que nos interesan:** …
**Notas:** …

---

### Pendientes de mapear

- [ ] Ligas del usuario
- [ ] Plantilla propia
- [ ] Plantilla de un rival
- [ ] Clasificación de liga
- [ ] Listado de jugadores
- [ ] Detalle de jugador (puntos por jornada)
- [ ] Histórico de valor de mercado
- [ ] Mercado actual
- [ ] Jornada actual y calendario
- [ ] Estado de jugador (lesión / sanción)

## Comportamiento observado

| Aspecto            | Observación |
| ------------------ | ----------- |
| Rate limiting      | `TODO`      |
| Códigos de error   | `TODO`      |
| Paginación         | `TODO`      |
| Cabeceras de cache | `TODO`      |
