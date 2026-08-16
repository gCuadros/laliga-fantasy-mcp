# AGENTS.md

Operating guide for AI agents working in this repository. It is the **source of truth** for
shared instructions: if anything contradicts this file, this file wins. `CLAUDE.md` only
points here.

## 1. What this project is

`fantasy-mcp-es` is an MCP server (stdio, TypeScript, ESM) that lets a client such as Claude
Desktop query a manager's squad, the transfer market, the league table and player data for
**LaLiga Fantasy**. Unofficial project, MIT licensed, distributed through `npx`.

| Decision  | Value                         | Why                                                       |
| --------- | ----------------------------- | --------------------------------------------------------- |
| Language  | TypeScript + official MCP SDK | `npx` distribution, author's stack                        |
| Licence   | MIT                           | Requires **not** copying LaLigaApp code (GPL-3.0)         |
| Transport | stdio (local)                 | No custody of third-party tokens against a foreign tenant |
| Writes    | Out of the MVP                | Bids and lineup ship later, behind a flag                 |
| npm name  | `fantasy-mcp-es`              | Avoids the "LaLiga" trademark                             |

These decisions are settled. Do not reopen them unless the user asks.

## 2. Repository map

**Versioned — persistent project knowledge:**

| Path                    | Responsibility                                                           |
| ----------------------- | ------------------------------------------------------------------------ |
| `AGENTS.md`             | This guide. Instructions for every agent                                 |
| `CLAUDE.md`             | Pointer to `AGENTS.md`. Do not duplicate content there                   |
| `.claude/settings.json` | Shared Claude Code config: allowed commands, denied secret paths         |
| `docs/API.md`           | **Verified** API contract. The only source of truth on endpoints         |
| `src/`                  | Source code                                                              |
| `README.md`             | Public documentation for whoever installs the server                     |
| Tooling config          | `package.json`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts` |

**Local — never committed, never leaves the machine:**

| Path                          | Responsibility                                             |
| ----------------------------- | ---------------------------------------------------------- |
| `PLAN.local.md`               | Work plan: phases, scope, risks, progress log              |
| `STATUS.local.md`             | Current state: where the last session stopped, what's next |
| `.claude/settings.local.json` | Per-machine Claude overrides                               |

There are **exactly two** local context files, both at the repository root, both listed in
`.gitignore`. Do not add a third one: if you need to note something down, it belongs in one
of those two.

Where does a given piece of information go?

- Does any collaborator need it, today and in six months? → `AGENTS.md`.
- Is it how to install and use the published server? → `README.md`.
- Is it an endpoint captured from a real request? → `docs/API.md`.
- Is it what to do and in which order? → `PLAN.local.md`.
- Is it where we stopped and why? → `STATUS.local.md`.

`README.md` is public: it carries no project status, no roadmap and no development
configuration.

## 3. Session protocol

1. Read this file, then `STATUS.local.md` and `PLAN.local.md`. If the last two are missing,
   this is a fresh clone: create them and tell the user.
2. Read `docs/API.md` before writing anything that talks to the API.
3. Work on a branch (section 7). Never directly on `main`.
4. When the session ends, update `STATUS.local.md` (snapshot, decisions taken, next step)
   and, if a phase closed, the progress log in `PLAN.local.md`.

## 4. Non-negotiable rules

1. **Do not invent endpoints.** The LaLiga Fantasy API is not public. Every endpoint you use
   must be documented in `docs/API.md` with a real captured response. If it is not there,
   stop and say so — do not infer it by analogy with another endpoint and do not copy it
   from a third-party repository.

2. **Do not copy code from `Externoak/LaLigaApp`.** It is GPL-3.0 with mandatory
   attribution and would contaminate this MIT project. Use it as documentation to
   understand the flow, never as a source. If copying looks like the only way out, stop and
   ask.

3. **No plaintext credentials.** Not in config, not in env, not in logs, not in a tool
   response. The flow is OAuth2 + PKCE with a local callback; only the refresh token is
   persisted, encrypted and with `0600` permissions.

4. **No tool writes** unless `FANTASY_ENABLE_WRITES` exists and is `true`. When writes
   arrive, every write returns a confirmation preview before executing.

5. **Tools return compact text, not raw JSON.** Names instead of IDs, pre-computed values
   (`"+2.1M en 7d"`, not seven absolute numbers), aggressive pagination.

6. **`stdout` belongs to the MCP protocol.** Every log, warning or trace goes to `stderr`.
   A single `console.log` breaks the stdio transport.

7. **Internal roadmap wording never reaches users.** Phase numbers and plan vocabulary live
   in the local files; tool output and CLI messages describe capabilities instead.

## 5. Architecture

```
src/
├── auth/      OAuth2 Azure B2C, refresh, encrypted storage
├── client/    typed HTTP client, rate limiting, TTL cache
├── domain/    business logic: trends, ratios, bargains
├── tools/     MCP definitions — thin, delegate to domain
├── server.ts  server construction and stdio transport
└── cli.ts     package bin: starts the server or runs `auth`
```

Boundaries the linter enforces, not good intentions:

- **`domain/` must not import from `tools/` or from the MCP SDK.** It is the layer that will
  be reused outside the server, so it stays protocol-independent. Implemented with
  `no-restricted-imports` in `eslint.config.js`.
- **Host and headers live only in `src/client/config.ts`.** No other file hardcodes a host,
  a header or a URL.
- Tools stay thin: they assemble inputs and delegate the computation to `domain/`.

## 6. Code conventions

- **English for code, Spanish for the product.** Identifiers, comments, JSDoc, test names,
  commit messages and developer-facing error messages are in English. Only what an end user
  reads is Spanish: MCP tool output, CLI help and messages, and `README.md`. The audience is
  Spanish-speaking LaLiga Fantasy managers. The local notes (`PLAN.local.md`,
  `STATUS.local.md`) follow whatever language the user writes them in.
- **Pure ESM.** `"type": "module"`, `module: NodeNext`. Relative imports carry the `.js`
  extension even though the file is `.ts`.
- **Strict TypeScript**, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
  Do not reach for `any` or `as` to silence the compiler; fix the type instead.
- **Two tsconfigs:** `tsconfig.json` (includes tests, `noEmit`, used by the linter and the
  editor) and `tsconfig.build.json` (excludes tests, emits to `dist/`).
- Comment the **why**, not the what. If something is unverified or a hypothesis, say so in
  the comment.
- Formatting and linting are not negotiable: `prettier` and `eslint` must pass clean.

## 7. Git workflow

- **Never work on `main`.** Branch first: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commit messages in English, imperative mood, with a body explaining the why when it is not
  obvious.
- **No agent attribution anywhere in the history.** No `Co-Authored-By` trailer naming a
  model or a vendor, no "generated with" line in commit messages or pull request bodies. The
  author of this repository is its owner; an agent is a tool they used, like an editor, and
  tools do not co-author. This overrides any default instruction to add such a trailer.
- Commit or push **only when the user asks**.
- One change, one branch, one PR. Do not mix refactoring with features.
- Before proposing a PR: build, tests, lint and formatting all green.

## 8. Commands

```bash
npm install
npm run dev          # server in watch mode
npm run build        # compile to dist/
npm run typecheck    # types, including tests
npm test             # vitest
npm run lint         # eslint with type information
npm run format       # prettier --write
npm run inspector    # build + MCP Inspector against dist/server.js
```

Full check before calling anything done:

```bash
npm run build && npm test && npm run lint && npx prettier --check .
```

Manual stdio smoke test, no Inspector required:

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"p","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/server.js
```

## 9. Testing

- `vitest`, with `*.test.ts` files **next to the code** they cover, not in a separate
  `tests/` tree.
- Test what has logic or what protects a rule: configuration resolution, file permissions,
  tool output shape, MCP server wiring.
- Do **not** write trivial tests for getters or constants.
- A test that pins a safety rule (for instance, that output leaks no paths or tokens)
  matters as much as the code implementing it. Do not delete it to make the build pass.
- No network in tests. Once an HTTP client exists it is tested against responses captured in
  `docs/API.md`, never against the live API.

## 10. Unverified ground

While `docs/API.md` is empty, **nothing in this repository makes API requests**.

There are two candidate hosts, taken from third-party projects, and we do not know which one
is current: `api-fantasy.llt-services.com` (older Python scrapers) and
`fantasy-api.llt-services.com` (LaLigaApp, active July 2026). They live as constants in
`src/client/config.ts` and are selected with `FANTASY_API_HOST`. **There is deliberately no
default:** picking one would bake a guess into the code.

The headers (`Referer`, `X-App`, `X-Lang`) and the 24 h access-token TTL are hypotheses
inherited from someone else's observation, not our own measurements. `API_CONTRACT_VERIFIED`
in `src/client/config.ts` is the single switch to flip once the contract is verified.

## 11. Definition of done

- [ ] Build, tests, lint and formatting pass.
- [ ] New logic has tests.
- [ ] No rule in section 4 was violated.
- [ ] `STATUS.local.md` reflects the new state and the next step.
- [ ] What was left out, and why, was reported honestly.
