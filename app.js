const express = require('express');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.POST || 3000

app.use(express.json());

app.get('/baggage/stats/gate-counts', async (req, res) => {
    const sinceMinutes = Math.max(1,parseInt(req.query.sinceMinutes) || 60);

    const query = `
    SELECT destinatioon_gate,
    COUNT(DISTINCT bag_tag_id) AS unique_bag_count 
    FROM bag_scans
    WHERE scanned_at >= NOW() - INTERVAL '${sinceMinutes} minutes'
    GROUP BY destinatioon_gate
    ORDER BY destinatioon_gate;
    `

    try{
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    }catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})