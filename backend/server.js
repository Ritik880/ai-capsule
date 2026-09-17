const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const db = require('./db'); // eslint-disable-line no-unused-vars
const capsulesRouter = require('./capsules');
const authRouter = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Public health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OAuth login / callback / me / logout
app.use('/auth', authRouter);

// Capsules API — protected inside the router by JWT middleware
app.use('/api/capsules', capsulesRouter);

// In production, serve the built React app from this same Express server.
// This is a single-service deploy: one public URL, no cross-origin cookies.
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.use((req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
