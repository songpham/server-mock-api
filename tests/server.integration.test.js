'use strict';

const request = require('supertest');
const path = require('path');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'test-routes.json');

let app;

beforeAll(() => {
  // Suppress startup log output in test runs
  jest.spyOn(console, 'log').mockImplementation(() => {});
  // Import app AFTER suppressing console to keep test output clean
  const { createApp } = require('../src/app');
  ({ app } = createApp(FIXTURE_PATH));
});

afterAll(() => jest.restoreAllMocks());

describe('Mock API server', () => {
  describe('route matching', () => {
    test('POST matched route returns configured status and body', async () => {
      const res = await request(app).post('/api/users');
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: true });
    });

    test('URL params — GET /api/users/:id returns configured body', async () => {
      const res = await request(app).get('/api/users/42');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Alice' });
    });

    test('query params — matches queryConstrained entry when page=2', async () => {
      const res = await request(app).get('/api/users?page=2');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 2 });
    });

    test('wildcard route matches a path not claimed by any specific route', async () => {
      const res = await request(app).get('/api/completely-unknown-path');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ message: 'wildcard matched' });
    });
  });

  describe('response engine', () => {
    test('json body — returns configured object body with correct Content-Type', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('string body — returns configured string body via res.send()', async () => {
      const res = await request(app).get('/api/text');
      expect(res.status).toBe(200);
      expect(res.text).toBe('plain text response');
    });

    test('empty body — returns no body when body is null (204 No Content)', async () => {
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
});
