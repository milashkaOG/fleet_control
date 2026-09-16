const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  test('should return status 200 and service information', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('FleetControl');
    expect(response.body.version).toBe('0.1.0');
  });
});