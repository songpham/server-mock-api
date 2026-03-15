'use strict';

/**
 * Iterates the route map and calls app[method](path, handler) for each entry.
 * Registration order matches JSON insertion order — more specific routes
 * must be defined before wildcards in mock-routes.json.
 */
function registerRoutes(app, routes) {
  for (const [name, config] of Object.entries(routes)) {
    const method = config.method.toLowerCase();
    if (typeof app[method] !== 'function') {
      console.error(`[MOCK] Unknown HTTP method "${config.method}" on route "${name}"`);
      process.exit(1);
    }
    app[method](config.path, makeHandler(name, config));
  }
}

/**
 * Builds an async Express handler for a single route config.
 *
 * Query guard: if config.query is set, ALL specified key/value pairs must match
 * req.query. If any mismatch, calls next() (NOT next(err)) to fall through to
 * the next registered handler for the same path. This enables query-param
 * demultiplexing: multiple handlers on the same method+path, each with different
 * query constraints, stacked in registration order.
 *
 * Body type branching (verbatim — no :param substitution):
 *   null / undefined  → res.status(n).end()
 *   string            → res.status(n).send(body)
 *   object / array    → res.status(n).json(body)
 */
function makeHandler(name, config) {
  return async function mockHandler(req, res, next) {
    // Query param guard — call next() if any required pair doesn't match
    if (config.query) {
      for (const [key, val] of Object.entries(config.query)) {
        if (req.query[key] !== val) {
          return next();
        }
      }
    }

    // Simulate network latency
    if (config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Set custom response headers
    if (config.headers) {
      res.set(config.headers);
    }

    // Send response — branch on body type
    const { status, body } = config;
    if (body === null || body === undefined) {
      return res.status(status).end();
    }
    if (typeof body === 'string') {
      return res.status(status).send(body);
    }
    return res.status(status).json(body);
  };
}

module.exports = { registerRoutes };
