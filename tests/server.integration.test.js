'use strict';

const request = require('supertest');
const path = require('path');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'test-routes.json');
const PRODUCTION_PATH = path.join(__dirname, '..', 'mock-routes.json');

let app;
let productionApp;

beforeAll(() => {
  // Suppress startup log output in test runs
  jest.spyOn(console, 'log').mockImplementation(() => {});
  // Import app AFTER suppressing console to keep test output clean
  const { createApp } = require('../src/app');
  ({ app } = createApp(FIXTURE_PATH));
  ({ app: productionApp } = createApp(PRODUCTION_PATH));
});

afterAll(() => jest.restoreAllMocks());

describe('Mock API server', () => {
  describe('route matching', () => {
    test('POST matched route returns configured status and response when body guard matches', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Alice' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: true });
    });

    test('POST body guard can demultiplex routes on the same method and path', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Admin', role: 'admin' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: true, role: 'admin' });
    });

    test('POST falls through when body guard does not match any route', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Unknown' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Route not found' });
    });

    test('path params — GET /api/users/1 returns body for id=1', async () => {
      const res = await request(app).get('/api/users/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, name: 'Alice', email: 'alice@example.com' });
    });

    test('path params — GET /api/users/2 returns body for id=2', async () => {
      const res = await request(app).get('/api/users/2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 2, name: 'Bob', email: 'bob@example.com' });
    });

    test('query params — matches queryConstrained entry when page=2', async () => {
      const res = await request(app).get('/api/users?page=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        users: [{ id: 3, name: 'John' }],
        metadata: { page: '2' },
      });
    });

    test('wildcard route matches a path not claimed by any specific route', async () => {
      const res = await request(app).get('/api/completely-unknown-path');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ message: 'wildcard matched' });
    });
  });

  describe('response engine', () => {
    test('json response — returns configured object payload with correct Content-Type', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('string response — returns configured string payload via res.send()', async () => {
      const res = await request(app).get('/api/text');
      expect(res.status).toBe(200);
      expect(res.text).toBe('plain text response');
    });

    test('empty response — returns no body when response is null (204 No Content)', async () => {
      const res = await request(app).delete('/api/users/1');
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    test('delay — response time is >= configured delay ms', async () => {
      const start = Date.now();
      await request(app).get('/api/slow');
      const elapsed = Date.now() - start;
      // Fixture delay is 100ms; allow 10ms tolerance for scheduling jitter
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    test('headers — custom response headers are present in response', async () => {
      const res = await request(app).get('/api/headers');
      expect(res.status).toBe(200);
      // HTTP headers are lowercased by Node.js http module
      expect(res.headers['x-custom-header']).toBe('test-value');
    });

    test('404 — unmatched route returns 404 with error message', async () => {
      const res = await request(app).get('/not-found-at-all');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Route not found' });
    });
  });

  describe('production mock-routes coverage', () => {
    test('GET /api/users returns the default users list', async () => {
      const res = await request(productionApp).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });
    });

    test('GET /api/users?page=2 returns the query-constrained response', async () => {
      const res = await request(productionApp).get('/api/users?page=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        users: [{ id: 3, name: 'John' }],
        metadata: { page: '2' },
      });
    });

    test('GET /api/users/1 returns the first user response', async () => {
      const res = await request(productionApp).get('/api/users/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, name: 'Alice', email: 'alice@example.com' });
    });

    test('GET /api/users/2 returns the second user response', async () => {
      const res = await request(productionApp).get('/api/users/2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 2, name: 'Bob', email: 'bob@example.com' });
    });

    test('POST /api/users returns the configured create response and headers', async () => {
      const res = await request(productionApp)
        .post('/api/users')
        .send({ name: 'New User' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 3, name: 'New User' });
      expect(res.headers['x-request-id']).toBe('mock-001');
    });

    test('PUT /api/users/4 returns the configured update response and headers', async () => {
      const res = await request(productionApp)
        .put('/api/users/4')
        .send({ name: 'New Users' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 4, name: 'New Users' });
      expect(res.headers['x-request-id']).toBe('mock-001');
    });

    test('DELETE /api/users/1 returns the configured delete response', async () => {
      const res = await request(productionApp).delete('/api/users/1');
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'delete sucessfully' });
    });

    test('GET /api/reports returns the slow endpoint response', async () => {
      const start = Date.now();
      const res = await request(productionApp).get('/api/reports');
      const elapsed = Date.now() - start;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ report: 'data' });
      expect(elapsed).toBeGreaterThanOrEqual(750);
    });
  });
});
