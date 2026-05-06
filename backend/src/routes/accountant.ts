import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import AccountantInvoice from '../models/AccountantInvoice';
import { requireAuth, AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520') },
});

const router = Router();
router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const items = await AccountantInvoice.find().sort({ order: 1, createdAt: -1 });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const count = await AccountantInvoice.countDocuments();
  const item = await AccountantInvoice.create({ num: req.body.num, order: count });
  res.status(201).json(item);
});

router.patch('/reorder', async (req: AuthRequest, res: Response) => {
  const { order } = req.body as { order: { id: string }[] };
  await Promise.all(order.map(({ id }, idx) =>
    AccountantInvoice.findByIdAndUpdate(id, { order: idx })
  ));
  res.json({ ok: true });
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { num, sent } = req.body;
  const update: Record<string, unknown> = {};
  if (num !== undefined) update.num = num;
  if (sent !== undefined) update.sent = sent;
  const item = await AccountantInvoice.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findByIdAndDelete(req.params.id);
  if (item) {
    item.files.forEach((f: any) => {
      fs.unlink(path.join(UPLOAD_DIR, f.filename), () => {});
    });
  }
  res.json({ ok: true });
});

router.post('/:id/files', upload.array('files'), async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const files = req.files as Express.Multer.File[];
  const newFiles = files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));
  item.files.push(...newFiles as any);
  await item.save();
  res.json({ files: item.files });
});

router.get('/:id/files/:fileId', async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const file = item.files.find((f: any) => f._id.toString() === req.params.fileId) as any;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  res.setHeader('Content-Type', file.mimetype);
  res.sendFile(path.join(UPLOAD_DIR, file.filename));
});

router.delete('/:id/files/:fileId', async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const file = item.files.find((f: any) => f._id.toString() === req.params.fileId) as any;
  if (file) {
    fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
    item.files = item.files.filter((f: any) => f._id.toString() !== req.params.fileId) as any;
    await item.save();
  }
  res.json({ ok: true });
});

export default router;
