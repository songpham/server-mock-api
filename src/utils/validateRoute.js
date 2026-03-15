'use strict';

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
  return true;
}

module.exports = { validateRoute };
