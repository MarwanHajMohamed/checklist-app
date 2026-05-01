const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function signAccess(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
}

async function signRefresh(userId) {
  const expiresIn = process.env.JWT_REFRESH_EXPIRY || '7d';
  const token = jwt.sign({ sub: userId.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
  const ms = parseDuration(expiresIn);
  await RefreshToken.create({ token, userId, expiresAt: new Date(Date.now() + ms) });
  return token;
}

function parseDuration(str) {
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000;
  return parseInt(match[1], 10) * map[match[2]];
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseDuration(process.env.JWT_REFRESH_EXPIRY || '7d'),
    path: '/api/auth',
  });
}

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 10 })
      .withMessage('Password must be at least 10 characters')
      .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
      .matches(/[0-9]/).withMessage('Password needs a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await User.create({ email, passwordHash });
      logger.info({ msg: 'user_registered', userId: user._id });

      const accessToken = signAccess(user);
      const refreshToken = await signRefresh(user._id);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ accessToken, user: { id: user._id, email: user.email, role: user.role } });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select(
        '+passwordHash +failedLoginAttempts +lockedUntil'
      );
      if (!user) {
        await bcrypt.hash(password, BCRYPT_ROUNDS); // timing-safe dummy
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.isLocked()) {
        return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
      }
      const match = await user.comparePassword(password);
      if (!match) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= LOCK_THRESHOLD) {
          user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
          user.failedLoginAttempts = 0;
          logger.warn({ msg: 'account_locked', userId: user._id });
        }
        await user.save();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date();
      await user.save();

      logger.info({ msg: 'user_login', userId: user._id });
      const accessToken = signAccess(user);
      const refreshToken = await signRefresh(user._id);
      setRefreshCookie(res, refreshToken);
      res.json({ accessToken, user: { id: user._id, email: user.email, role: user.role } });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const stored = await RefreshToken.findOne({ token });
    if (!stored) return res.status(401).json({ error: 'Refresh token revoked' });

    // Rotate refresh token
    await RefreshToken.deleteOne({ token });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newAccess = signAccess(user);
    const newRefresh = await signRefresh(user._id);
    setRefreshCookie(res, newRefresh);
    res.json({ accessToken: newAccess });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) await RefreshToken.deleteOne({ token });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user._id, email: user.email, role: user.role } });
});

module.exports = router;
