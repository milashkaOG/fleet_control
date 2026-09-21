jest.mock('../src/db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

describe('POST /replacement-assignments', () => {
  let client;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool.connect.mockResolvedValue(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create assignment and mark vehicle as IN_USE', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'COMMIT') {
        return {};
      }

      if (query.includes('SELECT id, availability_status')) {
        return {
          rows: [
            {
              id: '3',
              availability_status: 'AVAILABLE'
            }
          ]
        };
      }

      if (query.includes('SELECT id, status FROM drivers')) {
        return {
          rows: [
            {
              id: '1',
              status: 'ACTIVE'
            }
          ]
        };
      }

      if (query.includes('INSERT INTO replacement_vehicle_assignments')) {
        return {
          rows: [
            {
              id: '1',
              driver_id: '1',
              vehicle_id: '3',
              started_at: '2026-09-18T10:00:00.000Z',
              ended_at: null
            }
          ]
        };
      }

      if (query.includes('UPDATE vehicles')) {
        return {
          rowCount: 1
        };
      }

      return {};
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

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehicles'),
      [3]
    );

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('should return 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 1
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      error: 'driver_id and vehicle_id are required'
    });

    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('should return 400 when vehicle does not exist', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (query.includes('SELECT id, availability_status')) {
        return {
          rows: []
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 1,
        vehicle_id: 999
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      error: 'Vehicle does not exist'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('should return 409 when vehicle is not available', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (query.includes('SELECT id, availability_status')) {
        return {
          rows: [
            {
              id: '2',
              availability_status: 'IN_USE'
            }
          ]
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 1,
        vehicle_id: 2
      });

    expect(response.statusCode).toBe(409);

    expect(response.body).toEqual({
      error: 'Vehicle is not available'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('should return 400 when driver does not exist', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (query.includes('SELECT id, availability_status')) {
        return {
          rows: [
            {
              id: '3',
              availability_status: 'AVAILABLE'
            }
          ]
        };
      }

      if (query.includes('SELECT id, status FROM drivers')) {
        return {
          rows: []
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 999,
        vehicle_id: 3
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      error: 'Driver does not exist'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('should return 409 when driver is inactive', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (query.includes('SELECT id, availability_status')) {
        return {
          rows: [
            {
              id: '1',
              availability_status: 'AVAILABLE'
            }
          ]
        };
      }

      if (query.includes('SELECT id, status FROM drivers')) {
        return {
          rows: [
            {
              id: '3',
              status: 'INACTIVE'
            }
          ]
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments')
      .send({
        driver_id: 3,
        vehicle_id: 1
      });

    expect(response.statusCode).toBe(409);

    expect(response.body).toEqual({
      error: 'Driver is not active'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO replacement_vehicle_assignments'
      ),
      expect.anything()
    );

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehicles'),
      expect.anything()
    );
  });

  test.each([
    {
      body: {
        driver_id: 1,
        vehicle_id: 'abc'
      },
      caseName: 'string vehicle_id'
    },
    {
      body: {
        driver_id: 'abc',
        vehicle_id: 1
      },
      caseName: 'string driver_id'
    },
    {
      body: {
        driver_id: 1,
        vehicle_id: 1.5
      },
      caseName: 'fractional vehicle_id'
    }
  ])('should return 400 for $caseName', async ({ body }) => {
    const response = await request(app)
      .post('/replacement-assignments')
      .send(body);

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      error: 'driver_id and vehicle_id must be positive integers'
    });

    expect(pool.connect).not.toHaveBeenCalled();
  });
});

describe('POST /replacement-assignments/:id/return', () => {
  let client;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool.connect.mockResolvedValue(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should complete assignment and mark vehicle as AVAILABLE', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'COMMIT') {
        return {};
      }

      if (
        query.includes('SELECT') &&
        query.includes('FROM replacement_vehicle_assignments')
      ) {
        return {
          rows: [
            {
              id: '12',
              driver_id: '1',
              vehicle_id: '3',
              started_at: '2026-09-20T10:00:00.000Z',
              ended_at: null
            }
          ]
        };
      }

      if (
        query.includes('UPDATE replacement_vehicle_assignments')
      ) {
        return {
          rows: [
            {
              id: '12',
              driver_id: '1',
              vehicle_id: '3',
              started_at: '2026-09-20T10:00:00.000Z',
              ended_at: '2026-09-21T10:00:00.000Z'
            }
          ]
        };
      }

      if (query.includes('UPDATE vehicles')) {
        return {
          rowCount: 1
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments/12/return');

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      id: '12',
      driver_id: '1',
      vehicle_id: '3',
      started_at: '2026-09-20T10:00:00.000Z',
      ended_at: '2026-09-21T10:00:00.000Z'
    });

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE replacement_vehicle_assignments'
      ),
      [12]
    );

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehicles'),
      ['3']
    );

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test.each([
    'abc',
    '0',
    '-1',
    '1.5'
  ])('should return 400 for invalid assignment id %s', async (id) => {
    const response = await request(app)
      .post(`/replacement-assignments/${id}/return`);

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      error: 'assignment id must be a positive integer'
    });

    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('should return 404 when assignment does not exist', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (
        query.includes('SELECT') &&
        query.includes('FROM replacement_vehicle_assignments')
      ) {
        return {
          rows: []
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments/999/return');

    expect(response.statusCode).toBe(404);

    expect(response.body).toEqual({
      error: 'Replacement assignment does not exist'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('should return 409 when assignment is already completed', async () => {
    client.query.mockImplementation(async (query) => {
      if (query === 'BEGIN' || query === 'ROLLBACK') {
        return {};
      }

      if (
        query.includes('SELECT') &&
        query.includes('FROM replacement_vehicle_assignments')
      ) {
        return {
          rows: [
            {
              id: '12',
              driver_id: '1',
              vehicle_id: '3',
              started_at: '2026-09-20T10:00:00.000Z',
              ended_at: '2026-09-21T08:00:00.000Z'
            }
          ]
        };
      }

      return {};
    });

    const response = await request(app)
      .post('/replacement-assignments/12/return');

    expect(response.statusCode).toBe(409);

    expect(response.body).toEqual({
      error: 'Replacement assignment is already completed'
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE replacement_vehicle_assignments'
      ),
      expect.anything()
    );

    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehicles'),
      expect.anything()
    );
  });
});