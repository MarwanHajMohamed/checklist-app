import { Router, Response } from 'express';
import https from 'https';
import http from 'http';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import AccountantInvoice from '../models/AccountantInvoice';
import { requireAuth, AuthRequest } from '../middleware/auth';

cloudinary.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520') },
});

function uploadStream(buffer: Buffer, options: object): Promise<{ public_id: string; secure_url: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) return reject(err ?? new Error('Upload failed'));
      resolve(result as { public_id: string; secure_url: string });
    }).end(buffer);
  });
}

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
    await Promise.all(item.files.map((f: any) =>
      cloudinary.uploader.destroy(f.cloudinaryId, { resource_type: 'raw' }).catch(() => {})
    ));
  }
  res.json({ ok: true });
});

router.post('/:id/files', upload.array('files'), async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const files = req.files as Express.Multer.File[];
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
  item.files.push(...uploaded as any);
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
  const lib = file.url.startsWith('https') ? https : http;
  lib.get(file.url, (stream) => stream.pipe(res));
});

router.delete('/:id/files/:fileId', async (req: AuthRequest, res: Response) => {
  const item = await AccountantInvoice.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const file = item.files.find((f: any) => f._id.toString() === req.params.fileId) as any;
  if (file) {
    await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' }).catch(() => {});
    item.files = item.files.filter((f: any) => f._id.toString() !== req.params.fileId) as any;
    await item.save();
  }
  res.json({ ok: true });
});

export default router;
