const express = require('express');
const baggageRoutes = require('./routes/baggage.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/baggage', baggageRoutes);

app.get('/', (req, res) => {
  res.send('🧳 Baggage Tracking API Running');
});

app.listen(PORT, () => {
  console.log(`✨ Server running at http://localhost:${PORT}`);
});