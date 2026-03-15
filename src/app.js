'use strict';

const express = require('express');
const { loadRoutes } = require('./config/loadRoutes');
const { registerRoutes } = require('./routes/register');
const notFound = require('./middleware/notFound');

/**
 * Creates and configures the Express app.
 * Exported without app.listen() for testability with Supertest.
 *
 * @param {string} routesPath - Absolute path to the mock-routes.json config file
 * @returns {{ app: express.Application, routeCount: number }}
 */
function createApp(routesPath) {
  const app = express();
  app.use(express.json());

  const routes = loadRoutes(routesPath);
  registerRoutes(app, routes);
  app.use(notFound);

  return { app, routeCount: Object.keys(routes).length };
}

module.exports = { createApp };
