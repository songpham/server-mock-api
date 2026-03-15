# server-mock-api

Configurable mock API server for frontend development — serves static JSON responses, custom headers, per-route delays, and query-param matching from a single JSON config file.

## Requirements

- Node.js 18+
- npm

## Quick Start

```bash
npm install
npm run dev      # nodemon hot-reload on src/ changes
# or
npm start        # plain node, no reload
```

Server starts on port 4002 by default. You should see:

```
Mock API listening on port 4002 — 5 routes loaded
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4002` | HTTP port the server listens on |
| `ROUTES_FILE` | `mock-routes.json` (next to package.json) | Absolute or relative path to route config file |

## Route Config Reference (`mock-routes.json`)

The file is a JSON object where each key is a route name (used in startup logs). Each value is a route config object.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `method` | string | yes | — | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `path` | string | yes | — | Express path, supports params (`:id`) and wildcards |
| `status` | number | yes | — | HTTP status code to return |
| `body` | object \| array \| string \| null | no | `null` | Response body. Object/array → JSON (`Content-Type: application/json`). String → plain text. `null` or omitted → empty body (`204` style) |
| `headers` | object | no | — | Custom response headers merged into reply (e.g. `{"X-Request-Id": "mock-001"}`) |
| `delay` | number | no | `0` | Simulated latency in milliseconds before responding |
| `query` | object | no | — | Query-param guard: ALL key/value pairs must match `req.query`. Non-matching requests fall through to the next handler for the same path. Enables query-param demultiplexing (define same path+method twice with different `query` objects) |

## Annotated Example Config

```json
{
  "getUsers": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "body": { "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }] }
  },
  "getUserById": {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 200,
    "body": { "id": 1, "name": "Alice", "email": "alice@example.com" }
  },
  "createUser": {
    "method": "POST",
    "path": "/api/users",
    "status": 201,
    "body": { "id": 3, "name": "New User" },
    "headers": { "X-Request-Id": "mock-001" }
  },
  "deleteUser": {
    "method": "DELETE",
    "path": "/api/users/:id",
    "status": 204,
    "body": null
  },
  "slowEndpoint": {
    "method": "GET",
    "path": "/api/reports",
    "status": 200,
    "body": { "report": "data" },
    "delay": 800
  }
}
```

- **`getUsers`** — Basic `GET` returning a JSON array
- **`getUserById`** — Express path param `:id` (matches `/api/users/42`, etc.)
- **`createUser`** — `POST` returning `201` with a custom response header (`X-Request-Id`)
- **`deleteUser`** — `DELETE` with `body: null` → empty body (`204`-style response)
- **`slowEndpoint`** — 800 ms artificial delay to simulate a slow back-end

### Query-Param Demultiplexing

Define the same `method` + `path` twice with different `query` objects to serve different responses based on query parameters:

```json
{
  "listActiveUsers": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "query": { "status": "active" },
    "body": { "users": [{ "id": 1, "name": "Alice" }] }
  },
  "listAllUsers": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "body": { "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }] }
  }
}
```

Requests to `GET /api/users?status=active` match `listActiveUsers`; all others fall through to `listAllUsers`.

## Startup Validation

On startup the server validates every route entry. Clear errors are printed and the process exits with code `1` on:

- Missing required field (`method`, `path`, or `status`)
- Invalid `status` type (non-number)
- Duplicate `method` + `path` + `query` signature

Example error:

```
[MOCK] Config validation error: Route "badRoute" is missing required field: "status"
```

## Running Tests

```bash
npm test            # run jest once
npm run test:watch  # interactive watch mode
```

Tests are in `tests/` and use Jest + Supertest.

## Project Structure

```
server-mock-api/
├── mock-routes.json      # Route definitions (edit this)
├── src/
│   ├── index.js          # Entry point — reads env, calls createApp(), listens
│   ├── app.js            # createApp() — builds Express app without listen()
│   ├── config/
│   │   └── loadRoutes.js # Read + validate + dedup mock-routes.json
│   ├── routes/
│   │   └── register.js   # Register each route on the Express app
│   ├── middleware/
│   │   └── notFound.js   # 404 fallback handler
│   └── utils/
│       └── validateRoute.js  # Pure validation (throws on invalid config)
└── tests/                # Jest + Supertest test suite
```
