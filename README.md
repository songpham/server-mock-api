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
| `response` | object \| array \| string \| null | no | `null` | Response payload. Object/array → JSON (`Content-Type: application/json`). String → plain text. `null` or omitted → empty body |
| `body` | any JSON value | no | — | Request-body matcher. When `response` is present, incoming `req.body` must match the configured value. If `response` is omitted, `body` is treated as a legacy alias for the response payload |
| `headers` | object | no | — | Custom response headers merged into reply (e.g. `{"X-Request-Id": "mock-001"}`) |
| `delay` | number | no | `0` | Simulated latency in milliseconds before responding |
| `query` | object | no | — | Query-param guard: ALL key/value pairs must match `req.query`. Non-matching requests fall through to the next handler for the same path. Enables query-param demultiplexing (define same path+method twice with different `query` objects) |
| `params` | object | no | — | Path-param guard: ALL key/value pairs must match `req.params`. Useful for serving different static bodies for the same Express path such as `/api/users/:id` |

## Annotated Example Config

```json
{
  "getUsersPage2": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "query": { "page": "2" },
    "response": {
      "users": [{ "id": 3, "name": "John" }],
      "metadata": { "page": "2" }
    }
  },
  "getUsers": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "response": { "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }] }
  },
  "getUser1": {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 200,
    "params": { "id": "1" },
    "response": { "id": 1, "name": "Alice", "email": "alice@example.com" }
  },
  "getUser2": {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 200,
    "params": { "id": "2" },
    "response": { "id": 2, "name": "Bob", "email": "bob@example.com" }
  },
  "createUser": {
    "method": "POST",
    "path": "/api/users",
    "status": 201,
    "body": { "name": "New User" },
    "response": { "id": 3, "name": "New User" },
    "headers": { "X-Request-Id": "mock-001" }
  },
  "deleteUser": {
    "method": "DELETE",
    "path": "/api/users/:id",
    "status": 204,
    "response": null
  },
  "slowEndpoint": {
    "method": "GET",
    "path": "/api/reports",
    "status": 200,
    "response": { "report": "data" },
    "delay": 800
  }
}
```

- **`getUsersPage2`** — Query-specific route for `GET /api/users?page=2`; this must appear before the fallback `getUsers` route
- **`getUsers`** — Basic `GET` returning a JSON array via `response`
- **`getUser1` / `getUser2`** — Same Express path, but `params.id` is used to choose which static response to return
- **`createUser`** — `POST` route that matches an incoming request body and returns a separate `response` payload with a custom header (`X-Request-Id`)
- **`deleteUser`** — `DELETE` with `response: null` → empty body (`204`-style response)
- **`slowEndpoint`** — 800 ms artificial delay to simulate a slow back-end

### Query-Param Demultiplexing

Define the same `method` + `path` twice with different `query` objects to serve different responses based on query parameters:

```json
{
  "listUsersPage2": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "query": { "page": "2" },
    "response": {
      "users": [{ "id": 3, "name": "John" }],
      "metadata": { "page": "2" }
    }
  },
  "listAllUsers": {
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "response": { "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }] }
  }
}
```

Requests to `GET /api/users?page=2` match `listUsersPage2`; all others fall through to `listAllUsers`. Place the query-constrained route first so it runs before the fallback route.

### Path-Param Demultiplexing

You can also define the same `method` + `path` multiple times with different `params` guards:

```json
{
  "getUser1": {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 200,
    "params": { "id": "1" },
    "response": { "id": 1, "name": "Alice" }
  },
  "getUser2": {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 200,
    "params": { "id": "2" },
    "response": { "id": 2, "name": "Bob" }
  }
}
```

Requests to `GET /api/users/1` and `GET /api/users/2` now resolve to different static responses while still using the same Express route shape.

### Request-Body Matching

For write methods, use `body` to match the incoming request and `response` for the payload you want to send back:

```json
{
  "createUser": {
    "method": "POST",
    "path": "/api/users",
    "status": 201,
    "body": { "name": "Alice" },
    "response": { "id": 1, "name": "Alice" }
  },
  "createAdminUser": {
    "method": "POST",
    "path": "/api/users",
    "status": 201,
    "body": { "name": "Admin", "role": "admin" },
    "response": { "id": 2, "name": "Admin", "role": "admin" }
  }
}
```

This lets the same `POST /api/users` endpoint return different mock responses based on the request JSON.

## Startup Validation

On startup the server validates every route entry. Clear errors are printed and the process exits with code `1` on:

- Missing required field (`method`, `path`, or `status`)
- Invalid `status` type (non-number)
- Duplicate `method` + `path` + `params` + `query` + request-body signature

Legacy note: if a route still uses `body` without `response`, the server treats `body` as the response payload for backward compatibility.

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
