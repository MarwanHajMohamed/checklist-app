const express = require('express');
const { body, param, query } = require('express-validator');
const SendListItem = require('../models/SendListItem');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

router.use(requireAuth);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/send-list?date=YYYY-MM-DD
router.get(
  '/',
  [query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/)],
  validate,
  async (req, res) => {
    const date = req.query.date || todayStr();
    const items = await SendListItem.find({ createdBy: req.user.id, date }).sort({ order: 1 });
    res.json(items);
  }
);

// POST /api/send-list
router.post(
  '/',
  [
    body('num').trim().notEmpty().isLength({ max: 128 }),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validate,
  async (req, res) => {
    try {
      const date = req.body.date || todayStr();
      const count = await SendListItem.countDocuments({ createdBy: req.user.id, date });
      const item = await SendListItem.create({
        num: req.body.num,
        date,
        order: count,
        createdBy: req.user.id,
      });
      res.status(201).json(item);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/send-list/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('done').optional().isBoolean(),
    body('num').optional().trim().notEmpty().isLength({ max: 128 }),
  ],
  validate,
  async (req, res) => {
    try {
      const update = {};
      if (req.body.done !== undefined) update.done = req.body.done;
      if (req.body.num !== undefined) update.num = req.body.num;
      const item = await SendListItem.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user.id },
        update,
        { new: true }
      );
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/send-list/reorder
router.patch('/reorder', [body('order').isArray()], validate, async (req, res) => {
  try {
    const ops = (req.body.order || []).map((item, idx) =>
      SendListItem.updateOne({ _id: item.id, createdBy: req.user.id }, { order: idx })
    );
    await Promise.all(ops);
    res.json({ message: 'Reordered' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/send-list/:id
router.delete('/:id', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const result = await SendListItem.deleteOne({ _id: req.params.id, createdBy: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/send-list/clear-done?date=YYYY-MM-DD
router.delete('/clear-done', async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    await SendListItem.deleteMany({ createdBy: req.user.id, date, done: true });
    res.json({ message: 'Cleared' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
