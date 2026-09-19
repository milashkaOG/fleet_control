const express = require('express');

const app = express();

const pool = require('./db');

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'FleetControl',
    version: '0.2.0'
  });
});

app.get('/vehicles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        brand,
        model,
        registration_number,
        production_year,
        availability_status
      FROM vehicles
      ORDER BY id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to get vehicles:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/drivers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        license_number,
        status
      FROM drivers
      ORDER BY id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to get drivers:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.post('/replacement-assignments', async (req, res) => {
  const { driver_id, vehicle_id } = req.body;

  if (driver_id === undefined || vehicle_id === undefined) {
    return res.status(400).json({
      error: 'driver_id and vehicle_id are required'
    });
  }

  if (
    !Number.isInteger(driver_id) ||
    !Number.isInteger(vehicle_id) ||
    driver_id <= 0 ||
    vehicle_id <= 0
  ) {
    return res.status(400).json({
      error: 'driver_id and vehicle_id must be positive integers'
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    const vehicleResult = await client.query(
      `
        SELECT id, availability_status
        FROM vehicles
        WHERE id = $1
        FOR UPDATE
      `,
      [vehicle_id]
    );

    if (vehicleResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'Vehicle does not exist'
      });
    }

    const vehicle = vehicleResult.rows[0];

    if (vehicle.availability_status !== 'AVAILABLE') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'Vehicle is not available'
      });
    }

    const assignmentResult = await client.query(
      `
        INSERT INTO replacement_vehicle_assignments (
          driver_id,
          vehicle_id
        )
        VALUES ($1, $2)
        RETURNING
          id,
          driver_id,
          vehicle_id,
          started_at,
          ended_at
      `,
      [driver_id, vehicle_id]
    );

    await client.query(
      `
        UPDATE vehicles
        SET availability_status = 'IN_USE'
        WHERE id = $1
      `,
      [vehicle_id]
    );

    await client.query('COMMIT');

    return res.status(201).json(assignmentResult.rows[0]);
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Driver or vehicle does not exist'
      });
    }

    console.error('Failed to create replacement assignment:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = app;