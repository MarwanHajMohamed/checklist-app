const express = require('express');
const { body, param } = require('express-validator');
const path = require('path');
const fs = require('fs');
const AccountantInvoice = require('../models/AccountantInvoice');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { encryptFile, decryptFileStream } = require('../utils/crypto');
const logger = require('../utils/logger');

const router = express.Router();

router.use(requireAuth);

// GET /api/accountant
router.get('/', async (req, res) => {
  const invoices = await AccountantInvoice.find({ createdBy: req.user.id }).sort({ order: 1, createdAt: 1 });
  // Strip storedName from response
  const safe = invoices.map((inv) => ({
    _id: inv._id,
    num: inv.num,
    sent: inv.sent,
    order: inv.order,
    files: (inv.files || []).map((f) => ({
      _id: f._id,
      originalName: f.originalName,
      mimetype: f.mimetype,
      size: f.size,
    })),
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }));
  res.json(safe);
});

// POST /api/accountant
router.post(
  '/',
  [body('num').trim().notEmpty().isLength({ max: 128 })],
  validate,
  async (req, res) => {
    try {
      const count = await AccountantInvoice.countDocuments({ createdBy: req.user.id });
      const inv = await AccountantInvoice.create({
        num: req.body.num,
        order: count,
        createdBy: req.user.id,
      });
      res.status(201).json({ _id: inv._id, num: inv.num, sent: inv.sent, order: inv.order, files: [] });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/accountant/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('num').optional().trim().notEmpty().isLength({ max: 128 }),
    body('sent').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const update = {};
      if (req.body.num !== undefined) update.num = req.body.num;
      if (req.body.sent !== undefined) update.sent = req.body.sent;
      const inv = await AccountantInvoice.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user.id },
        update,
        { new: true }
      );
      if (!inv) return res.status(404).json({ error: 'Not found' });
      res.json({ _id: inv._id, num: inv.num, sent: inv.sent, order: inv.order, files: inv.files.map((f) => ({ _id: f._id, originalName: f.originalName, mimetype: f.mimetype, size: f.size })) });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/accountant/reorder — bulk order update
router.patch('/reorder', [body('order').isArray()], validate, async (req, res) => {
  try {
    const ops = (req.body.order || []).map((item, idx) =>
      AccountantInvoice.updateOne(
        { _id: item.id, createdBy: req.user.id },
        { order: idx }
      )
    );
    await Promise.all(ops);
    res.json({ message: 'Reordered' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/accountant/:id
router.delete('/:id', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const inv = await AccountantInvoice.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    // Delete attached encrypted files
    for (const f of inv.files || []) {
      const encPath = path.join(UPLOAD_DIR, f.storedName + '.enc');
      if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    }
    await inv.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/accountant/:id/files/:fileId
router.delete('/:id/files/:fileId', [param('id').isMongoId(), param('fileId').isMongoId()], validate, async (req, res) => {
  try {
    const inv = await AccountantInvoice.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const fileEntry = inv.files.id(req.params.fileId);
    if (!fileEntry) return res.status(404).json({ error: 'File not found' });

    const encPath = path.join(UPLOAD_DIR, fileEntry.storedName + '.enc');
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    inv.files.pull(req.params.fileId);
    await inv.save();
    res.json({ message: 'File removed' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/accountant/:id/files — upload files
router.post('/:id/files', [param('id').isMongoId()], validate, upload.array('files', 10), async (req, res) => {
  try {
    const inv = await AccountantInvoice.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!inv) {
      // Clean up uploaded temp files
      for (const f of req.files || []) fs.unlinkSync(f.path);
      return res.status(404).json({ error: 'Not found' });
    }
    const added = [];
    for (const file of req.files || []) {
      const encPath = file.path + '.enc';
      await encryptFile(file.path, encPath);
      fs.unlinkSync(file.path); // Remove unencrypted temp file
      const entry = {
        storedName: path.basename(file.path),
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
      inv.files.push(entry);
      added.push(entry);
    }
    await inv.save();
    logger.info({ msg: 'files_uploaded', invoiceId: inv._id, count: added.length, userId: req.user.id });
    const safeFiles = inv.files.map((f) => ({ _id: f._id, originalName: f.originalName, mimetype: f.mimetype, size: f.size }));
    res.status(201).json({ files: safeFiles });
  } catch (err) {
    for (const f of req.files || []) { try { fs.unlinkSync(f.path); } catch {} }
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/accountant/:id/files/:fileId — download encrypted file
router.get('/:id/files/:fileId', [param('id').isMongoId(), param('fileId').isMongoId()], validate, async (req, res) => {
  try {
    const inv = await AccountantInvoice.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const fileEntry = inv.files.id(req.params.fileId);
    if (!fileEntry) return res.status(404).json({ error: 'File not found' });
    const encPath = path.join(UPLOAD_DIR, fileEntry.storedName + '.enc');
    if (!fs.existsSync(encPath)) return res.status(404).json({ error: 'File missing from storage' });

    res.setHeader('Content-Type', fileEntry.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileEntry.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    await decryptFileStream(encPath, res);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
