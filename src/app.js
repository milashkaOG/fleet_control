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

module.exports = app;