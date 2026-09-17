jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

describe('POST /replacement-assignments', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create replacement vehicle assignment', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '1',
          driver_id: '1',
          vehicle_id: '3',
          started_at: '2026-09-18T10:00:00.000Z',
          ended_at: null
        }
      ]
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 1,
        vehicle_id: 3
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.driver_id).toBe('1');
    expect(response.body.vehicle_id).toBe('3');
    expect(response.body.ended_at).toBeNull();
  });

  test('should return status 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 1
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'driver_id and vehicle_id are required'
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('should return status 400 when driver or vehicle does not exist', async () => {
    pool.query.mockRejectedValue({
      code: '23503'
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 999,
        vehicle_id: 999
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'Driver or vehicle does not exist'
    });
  });
});