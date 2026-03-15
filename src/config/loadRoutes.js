'use strict';

const fs = require('fs');
const { validateRoute } = require('../utils/validateRoute');

/**
 * Reads, parses, and validates mock-routes.json.
 * Calls process.exit(1) on any error with a clear console.error message.
 * Prints [MOCK] per-route startup table on success.
 * Returns the validated route map object (keyed by route name).
 */
function loadRoutes(filePath) {
  // Read file
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[MOCK] Error: Cannot read config file: ${filePath}`);
    console.error(err.message);
    process.exit(1);
  }

  // Parse JSON
  let routes;
  try {
    routes = JSON.parse(raw);
  } catch (err) {
    console.error(`[MOCK] Error: mock-routes.json contains invalid JSON`);
    console.error(err.message);
    process.exit(1);
  }

  // Validate each entry
  for (const [name, config] of Object.entries(routes)) {
    try {
      validateRoute(name, config);
    } catch (err) {
      console.error(`[MOCK] Config validation error: ${err.message}`);
      process.exit(1);
    }
  }

  // Duplicate detection: method + path + serialised query signature
  const seen = new Map();
  for (const [name, config] of Object.entries(routes)) {
    const key = `${config.method.toUpperCase()}:${config.path}:${JSON.stringify(config.query || {})}`;
    if (seen.has(key)) {
      console.error(`[MOCK] Duplicate route signature detected: ${key}`);
      console.error(`  First defined as: "${seen.get(key)}"`);
      console.error(`  Duplicate:        "${name}"`);
      process.exit(1);
    }
    seen.set(key, name);
  }

  // Print per-route startup log
  for (const [name, config] of Object.entries(routes)) {
    const method = config.method.toUpperCase().padEnd(6);
    const p = config.path.padEnd(35);
    console.log(`[MOCK] ${method} ${p} → ${name}`);
  }

  return routes;
}

module.exports = { loadRoutes };
