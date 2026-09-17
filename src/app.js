const express = require('express');

const app = express();

const pool = require('./db');

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'FleetControl',
    version: '0.1.0'
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

  if (!driver_id || !vehicle_id) {
    return res.status(400).json({
      error: 'driver_id and vehicle_id are required'
    });
  }

  try {
    const result = await pool.query(
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

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Driver or vehicle does not exist'
      });
    }

    console.error('Failed to create replacement assignment:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = app;