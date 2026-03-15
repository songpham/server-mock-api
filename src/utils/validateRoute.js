'use strict';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates a single route config entry.
 * Throws Error with a clear message if any required field is missing or invalid.
 * Returns true for a valid entry.
 */
function validateRoute(name, config) {
  const required = ['method', 'path', 'status'];
  for (const field of required) {
    if (config[field] === undefined || config[field] === null) {
      throw new Error(`Route "${name}" is missing required field: "${field}"`);
    }
  }
  if (typeof config.status !== 'number') {
    throw new Error(`Route "${name}": "status" must be a number, got ${typeof config.status}`);
  }
  if (config.query !== undefined && !isPlainObject(config.query)) {
    throw new Error(`Route "${name}": "query" must be an object`);
  }
  if (config.params !== undefined && !isPlainObject(config.params)) {
    throw new Error(`Route "${name}": "params" must be an object`);
  }
  if (config.headers !== undefined && !isPlainObject(config.headers)) {
    throw new Error(`Route "${name}": "headers" must be an object`);
  }
  if (config.delay !== undefined && (!Number.isFinite(config.delay) || config.delay < 0)) {
    throw new Error(`Route "${name}": "delay" must be a non-negative number`);
  }
  return true;
}

module.exports = { validateRoute };
