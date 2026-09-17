jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

describe('GET /drivers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return drivers with status 200', async () => {
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '1',
          full_name: 'Иван Петров',
          license_number: '77AA123456',
          status: 'ACTIVE'
        }
      ]
    });

    const response = await request(app).get('/drivers');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      {
        id: '1',
        full_name: 'Иван Петров',
        license_number: '77AA123456',
        status: 'ACTIVE'
      }
    ]);

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('should return status 500 when database query fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    pool.query.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/drivers');

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      error: 'Internal server error'
    });

    consoleErrorSpy.mockRestore();
  });
});