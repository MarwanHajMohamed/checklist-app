"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SendListItem_1 = __importDefault(require("../models/SendListItem"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/', async (req, res) => {
    const date = req.query.date;
    const items = await SendListItem_1.default.find({ date }).sort({ order: 1, createdAt: 1 });
    res.json(items);
});
router.post('/', async (req, res) => {
    const { num, date } = req.body;
    const count = await SendListItem_1.default.countDocuments({ date });
    const item = await SendListItem_1.default.create({ num, date, order: count });
    res.status(201).json(item);
});
router.patch('/reorder', async (req, res) => {
    const { order } = req.body;
    await Promise.all(order.map(({ id }, idx) => SendListItem_1.default.findByIdAndUpdate(id, { order: idx })));
    res.json({ ok: true });
});
router.delete('/clear-done', async (req, res) => {
    const date = req.query.date;
    await SendListItem_1.default.deleteMany({ date, done: true });
    res.json({ ok: true });
});
router.patch('/:id', async (req, res) => {
    const { done, num } = req.body;
    const update = {};
    if (done !== undefined)
        update.done = done;
    if (num !== undefined)
        update.num = num;
    const item = await SendListItem_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
});
router.delete('/:id', async (req, res) => {
    await SendListItem_1.default.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
});
exports.default = router;
