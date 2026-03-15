'use strict';

require('dotenv').config();
const path = require('path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 4002;
const ROUTES_FILE = process.env.ROUTES_FILE ||
  path.resolve(__dirname, '..', 'mock-routes.json');

const { app, routeCount } = createApp(ROUTES_FILE);

app.listen(PORT, () => {
  console.log(`Mock API listening on port ${PORT} — ${routeCount} routes loaded`);
});
