const express = require('express');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'FleetControl',
    version: '0.1.0'
  });
});

module.exports = app;