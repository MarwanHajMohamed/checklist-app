import { Router, Response } from 'express';
import ChecklistInstance from '../models/ChecklistInstance';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const items = await ChecklistInstance.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { templateId, invoiceNum } = req.body;
  const item = await ChecklistInstance.create({ templateId, invoiceNum, doneItems: [] });
  res.status(201).json(item);
});

router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  const { index } = req.body;
  const item = await ChecklistInstance.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  const set = new Set(item.get('doneItems') as number[]);
  if (set.has(index)) set.delete(index); else set.add(index);
  item.set('doneItems', Array.from(set));
  await item.save();
  res.json(item);
});

router.patch('/:id/reset', async (req: AuthRequest, res: Response) => {
  const item = await ChecklistInstance.findById(req.params.id);
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  item.set('doneItems', []);
  await item.save();
  res.json(item);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await ChecklistInstance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
