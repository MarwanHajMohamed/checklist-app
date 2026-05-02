"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const AccountantInvoice_1 = __importDefault(require("../models/AccountantInvoice"));
const auth_1 = require("../middleware/auth");
cloudinary_1.v2.config();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520') },
});
function uploadStream(buffer, options) {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.upload_stream(options, (err, result) => {
            if (err || !result)
                return reject(err ?? new Error('Upload failed'));
            resolve(result);
        }).end(buffer);
    });
}
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/', async (_req, res) => {
    const items = await AccountantInvoice_1.default.find().sort({ order: 1, createdAt: -1 });
    res.json(items);
});
router.post('/', async (req, res) => {
    const count = await AccountantInvoice_1.default.countDocuments();
    const item = await AccountantInvoice_1.default.create({ num: req.body.num, order: count });
    res.status(201).json(item);
});
router.patch('/reorder', async (req, res) => {
    const { order } = req.body;
    await Promise.all(order.map(({ id }, idx) => AccountantInvoice_1.default.findByIdAndUpdate(id, { order: idx })));
    res.json({ ok: true });
});
router.patch('/:id', async (req, res) => {
    const { num, sent } = req.body;
    const update = {};
    if (num !== undefined)
        update.num = num;
    if (sent !== undefined)
        update.sent = sent;
    const item = await AccountantInvoice_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
});
router.delete('/:id', async (req, res) => {
    const item = await AccountantInvoice_1.default.findByIdAndDelete(req.params.id);
    if (item) {
        await Promise.all(item.files.map((f) => cloudinary_1.v2.uploader.destroy(f.cloudinaryId, { resource_type: 'raw' }).catch(() => { })));
    }
    res.json({ ok: true });
});
router.post('/:id/files', upload.array('files'), async (req, res) => {
    const item = await AccountantInvoice_1.default.findById(req.params.id);
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const files = req.files;
    const uploaded = await Promise.all(files.map(async (f) => {
        const result = await uploadStream(f.buffer, {
            folder: 'checklist-app',
            resource_type: 'raw',
            public_id: `${req.params.id}_${Date.now()}_${f.originalname}`,
        });
        return {
            cloudinaryId: result.public_id,
            originalName: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            url: result.secure_url,
        };
    }));
    item.files.push(...uploaded);
    await item.save();
    res.json({ files: item.files });
});
router.get('/:id/files/:fileId', async (req, res) => {
    const item = await AccountantInvoice_1.default.findById(req.params.id);
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const file = item.files.find((f) => f._id.toString() === req.params.fileId);
    if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    const lib = file.url.startsWith('https') ? https_1.default : http_1.default;
    lib.get(file.url, (stream) => stream.pipe(res));
});
router.delete('/:id/files/:fileId', async (req, res) => {
    const item = await AccountantInvoice_1.default.findById(req.params.id);
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const file = item.files.find((f) => f._id.toString() === req.params.fileId);
    if (file) {
        await cloudinary_1.v2.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' }).catch(() => { });
        item.files = item.files.filter((f) => f._id.toString() !== req.params.fileId);
        await item.save();
    }
    res.json({ ok: true });
});
exports.default = router;
