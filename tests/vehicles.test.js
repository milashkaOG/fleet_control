jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

describe('GET /vehicles', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return vehicles with status 200', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '1',
          brand: 'Kia',
          model: 'K5',
          registration_number: 'A123BC77',
          production_year: 2022,
          availability_status: 'AVAILABLE'
        }
      ]
    });

    const response = await request(app).get('/vehicles');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      {
        id: '1',
        brand: 'Kia',
        model: 'K5',
        registration_number: 'A123BC77',
        production_year: 2022,
        availability_status: 'AVAILABLE'
      }
    ]);

    expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('should return status 500 when database query fails', async () => {
    const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

    pool.query.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/vehicles');

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
        error: 'Internal server error'
    });

    consoleErrorSpy.mockRestore();
    });
});

