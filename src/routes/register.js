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

function matchesGuard(actualValues, expectedValues) {
  if (!expectedValues) {
    return true;
  }

  if (expectedValues === null || typeof expectedValues !== 'object') {
    return actualValues === expectedValues;
  }

  if (Array.isArray(expectedValues)) {
    if (!Array.isArray(actualValues) || actualValues.length !== expectedValues.length) {
      return false;
    }

    return expectedValues.every((expectedItem, index) => matchesGuard(actualValues[index], expectedItem));
  }

  if (actualValues === null || typeof actualValues !== 'object' || Array.isArray(actualValues)) {
    return false;
  }

  for (const [key, val] of Object.entries(expectedValues)) {
    if (!matchesGuard(actualValues[key], val)) {
      return false;
    }
  }

  return true;
}

function getRequestBodyGuard(config) {
  return config.response === undefined ? undefined : config.body;
}

function getResponsePayload(config) {
  return config.response === undefined ? config.body : config.response;
}

/**
 * Builds an async Express handler for a single route config.
 *
 * Guards: if config.params, config.query, or config.body are set, ALL specified
 * values must match req.params, req.query, and req.body. Request-body matching is
 * enabled when a route defines config.response; legacy routes can still use body
 * as the response payload when response is omitted.
 *
 * Body type branching (verbatim — no :param substitution):
 *   null / undefined  → res.status(n).end()
 *   string            → res.status(n).send(body)
 *   object / array    → res.status(n).json(body)
 */
function makeHandler(name, config) {
  return async function mockHandler(req, res, next) {
    // Request signature guards — fall through if any required part doesn't match
    if (
      !matchesGuard(req.params, config.params) ||
      !matchesGuard(req.query, config.query) ||
      !matchesGuard(req.body, getRequestBodyGuard(config))
    ) {
      return next();
    }

    // Simulate network latency
    if (config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Set custom response headers
    if (config.headers) {
      res.set(config.headers);
    }

    // Send response — branch on response payload type
    const { status } = config;
    const response = getResponsePayload(config);
    if (response === null || response === undefined) {
      return res.status(status).end();
    }
    if (typeof response === 'string') {
      return res.status(status).send(response);
    }
    return res.status(status).json(response);
  };
}

module.exports = { registerRoutes };
