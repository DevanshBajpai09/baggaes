const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /baggage/scan
router.post('/scan', async (req, res) => {
    console.log('📦 POST /baggage/scan route hit');

  const { bag_tag_id, destination_gate, location_scanned } = req.body;
  const query = `
    INSERT INTO bag_scans (bag_tag_id, destination_gate, location_scanned)
    VALUES ($1, $2, $3)
    RETURNING scan_id
  `;
  try {
    const result = await pool.query(query, [bag_tag_id, destination_gate, location_scanned]);
    res.status(201).json({ scan_internal_id: result.rows[0].scan_id, status: 'logged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

// GET /baggage/scans/bag/:bag_tag_id
router.get('/scans/bag/:bag_tag_id', async (req, res) => {
  const { bag_tag_id } = req.params;
  const latestOnly = req.query.latest === 'true';

  const query = latestOnly
    ? `SELECT * FROM bag_scans WHERE bag_tag_id = $1 ORDER BY scanned_at DESC LIMIT 1`
    : `SELECT * FROM bag_scans WHERE bag_tag_id = $1 ORDER BY scanned_at DESC`;

  try {
    const result = await pool.query(query, [bag_tag_id]);
    if (latestOnly && result.rows.length === 0) return res.status(404).json({ message: 'No scan found' });
    res.status(200).json(latestOnly ? result.rows[0] : result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scan(s)' });
  }
});

// GET /baggage/scans/gate/:destination_gate
router.get('/scans/gate/:destination_gate', async (req, res) => {
  const { destination_gate } = req.params;
  const query = `SELECT * FROM bag_scans WHERE destination_gate = $1 ORDER BY scanned_at DESC`;
  try {
    const result = await pool.query(query, [destination_gate]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gate scans' });
  }
});

// GET /baggage/active/gate/:destination_gate?since_minutes=N
router.get('/active/gate/:destination_gate', async (req, res) => {
  const { destination_gate } = req.params;
  const since_minutes = parseInt(req.query.since_minutes) || 60;

  const query = `
    SELECT DISTINCT ON (bag_tag_id) bag_tag_id, scanned_at AS last_scan_at, location_scanned AS last_location
    FROM bag_scans
    WHERE destination_gate = $1 AND scanned_at >= NOW() - INTERVAL '${since_minutes} minutes'
    ORDER BY bag_tag_id, scanned_at DESC
  `;
  try {
    const result = await pool.query(query, [destination_gate]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active bags' });
  }
});

// GET /baggage/stats/gate-counts?since_minutes=N
router.get('/stats/gate-counts', async (req, res) => {
  const sinceMinutes = Math.max(1, parseInt(req.query.since_minutes) || 60);

  const query = `
    SELECT destination_gate, COUNT(DISTINCT bag_tag_id) AS unique_bag_count
    FROM bag_scans
    WHERE scanned_at >= NOW() - INTERVAL '${sinceMinutes} minutes'
    GROUP BY destination_gate
    ORDER BY destination_gate;
  `;

  try {
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
