const express = require('express');
const { body, param } = require('express-validator');
const ChecklistInstance = require('../models/ChecklistInstance');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

router.use(requireAuth);

// GET /api/checklists
router.get('/', async (req, res) => {
  const instances = await ChecklistInstance.find({ createdBy: req.user.id }).sort({ createdAt: 1 });
  res.json(instances);
});

// POST /api/checklists
router.post(
  '/',
  [
    body('templateId').trim().notEmpty().isLength({ max: 64 }),
    body('invoiceNum').trim().notEmpty().isLength({ max: 128 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { templateId, invoiceNum } = req.body;
      const instance = await ChecklistInstance.create({
        templateId,
        invoiceNum,
        doneItems: [],
        createdBy: req.user.id,
      });
      logger.info({ msg: 'checklist_created', instanceId: instance._id, userId: req.user.id });
      res.status(201).json(instance);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/checklists/:id/toggle
router.patch(
  '/:id/toggle',
  [
    param('id').isMongoId(),
    body('index').isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const instance = await ChecklistInstance.findOne({ _id: req.params.id, createdBy: req.user.id });
      if (!instance) return res.status(404).json({ error: 'Not found' });

      const { index } = req.body;
      const pos = instance.doneItems.indexOf(index);
      if (pos === -1) {
        instance.doneItems.push(index);
      } else {
        instance.doneItems.splice(pos, 1);
      }
      await instance.save();
      res.json(instance);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/checklists/:id/reset
router.patch(
  '/:id/reset',
  [param('id').isMongoId()],
  validate,
  async (req, res) => {
    try {
      const instance = await ChecklistInstance.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user.id },
        { doneItems: [] },
        { new: true }
      );
      if (!instance) return res.status(404).json({ error: 'Not found' });
      res.json(instance);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/checklists/:id
router.delete(
  '/:id',
  [param('id').isMongoId()],
  validate,
  async (req, res) => {
    try {
      const result = await ChecklistInstance.deleteOne({ _id: req.params.id, createdBy: req.user.id });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
      logger.info({ msg: 'checklist_deleted', instanceId: req.params.id, userId: req.user.id });
      res.json({ message: 'Deleted' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
