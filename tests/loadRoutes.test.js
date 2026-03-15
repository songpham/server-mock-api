'use strict';
// Unit tests for src/config/loadRoutes.js
// Stubs created by plan 01-01 Wave 0. Real implementations added by plan 01-02.

const os = require('os');
const fs = require('fs');
const path = require('path');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'test-routes.json');

// Helper: write a temp JSON file and return its path
function writeTempJson(obj) {
  const tmpFile = path.join(os.tmpdir(), `test-routes-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(obj), 'utf8');
  return tmpFile;
}

// Helper: write a temp file with raw string content
function writeTempRaw(content) {
  const tmpFile = path.join(os.tmpdir(), `test-routes-raw-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, content, 'utf8');
  return tmpFile;
}

describe('loadRoutes', () => {
  let exitSpy;
  let errorSpy;

  beforeEach(() => {
    // Intercept process.exit so it throws instead of killing the test process
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    // Suppress console.error output in tests
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Suppress console.log (startup route table) in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  // Re-require loadRoutes inside each test to avoid module cache issues
  function getLoadRoutes() {
    jest.resetModules();
    return require('../src/config/loadRoutes').loadRoutes;
  }

  test('loads valid config and returns route map', () => {
    const loadRoutes = getLoadRoutes();
    const routes = loadRoutes(FIXTURE_PATH);
    expect(routes).toHaveProperty('getUsers');
    expect(routes).toHaveProperty('getUserById');
    expect(routes.getUsers.method).toBe('GET');
    expect(routes.getUsers.status).toBe(200);
  });

  test('exits with code 1 when mock-routes.json is missing', () => {
    const loadRoutes = getLoadRoutes();
    expect(() => loadRoutes('/nonexistent/does/not/exist.json')).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when file contains invalid JSON', () => {
    const loadRoutes = getLoadRoutes();
    const tmpFile = writeTempRaw('{invalid json here');
    expect(() => loadRoutes(tmpFile)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when a route entry is missing required field: method', () => {
    const loadRoutes = getLoadRoutes();
    const tmpFile = writeTempJson({ badRoute: { path: '/api/x', status: 200 } });
    expect(() => loadRoutes(tmpFile)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when a route entry is missing required field: path', () => {
    const loadRoutes = getLoadRoutes();
    const tmpFile = writeTempJson({ badRoute: { method: 'GET', status: 200 } });
    expect(() => loadRoutes(tmpFile)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when a route entry is missing required field: status', () => {
    const loadRoutes = getLoadRoutes();
    const tmpFile = writeTempJson({ badRoute: { method: 'GET', path: '/api/x' } });
    expect(() => loadRoutes(tmpFile)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when duplicate method+path+query signature detected', () => {
    const loadRoutes = getLoadRoutes();
    const tmpFile = writeTempJson({
      first:  { method: 'GET', path: '/api/dup', status: 200, body: {} },
      second: { method: 'GET', path: '/api/dup', status: 200, body: { other: true } },
    });
    expect(() => loadRoutes(tmpFile)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('accepts routes with same method+path but different query constraints (not a duplicate)', () => {
    const loadRoutes = getLoadRoutes();
    // queryConstrained and getUsers share GET /api/users but have different query signatures
    const routes = loadRoutes(FIXTURE_PATH);
    expect(routes).toHaveProperty('queryConstrained');
    expect(routes).toHaveProperty('getUsers');
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
