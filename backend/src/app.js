require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const app = express();

// ── Security headers ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ──
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ── NoSQL injection prevention ──
app.use(mongoSanitize());

// ── Global rate limit ──
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  })
);

// ── Trust proxy for rate limiting behind reverse proxy ──
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/accountant', require('./routes/accountant'));
app.use('/api/send-list', require('./routes/sendList'));

// ── Health check ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ──
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  logger.error(err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

connectDB()
  .then(() => {
    app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB: ' + (err?.message ?? err));
    process.exit(1);
  });

module.exports = app;
