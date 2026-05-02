import { Router, Response } from 'express';
import SendListItem from '../models/SendListItem';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const date = req.query.date as string;
  const items = await SendListItem.find({ date }).sort({ order: 1, createdAt: 1 });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { num, date } = req.body;
  const count = await SendListItem.countDocuments({ date });
  const item = await SendListItem.create({ num, date, order: count });
  res.status(201).json(item);
});

router.patch('/reorder', async (req: AuthRequest, res: Response) => {
  const { order } = req.body as { order: { id: string }[] };
  await Promise.all(order.map(({ id }, idx) =>
    SendListItem.findByIdAndUpdate(id, { order: idx })
  ));
  res.json({ ok: true });
});

router.delete('/clear-done', async (req: AuthRequest, res: Response) => {
  const date = req.query.date as string;
  await SendListItem.deleteMany({ date, done: true });
  res.json({ ok: true });
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { done, num } = req.body;
  const update: Record<string, unknown> = {};
  if (done !== undefined) update.done = done;
  if (num !== undefined) update.num = num;
  const item = await SendListItem.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await SendListItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
