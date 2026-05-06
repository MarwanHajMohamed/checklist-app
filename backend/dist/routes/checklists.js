"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChecklistInstance_1 = __importDefault(
  require("../models/ChecklistInstance"),
);
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);

router.get("/", async (_req, res) => {
  const items = await ChecklistInstance_1.default
    .find()
    .sort({ createdAt: -1 });
  res.json(items);
});

router.post("/", async (req, res) => {
  const { templateId, invoiceNum } = req.body;
  const item = await ChecklistInstance_1.default.create({
    templateId,
    invoiceNum,
    doneItems: [],
  });
  res.status(201).json(item);
});

router.patch("/:id/toggle", async (req, res) => {
  const { index } = req.body;
  const item = await ChecklistInstance_1.default.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const set = new Set(item.get("doneItems"));
  if (set.has(index)) set.delete(index);
  else set.add(index);
  item.set("doneItems", Array.from(set));
  await item.save();
  res.json(item);
});

router.patch("/:id/reset", async (req, res) => {
  const item = await ChecklistInstance_1.default.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  item.set("doneItems", []);
  await item.save();
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  await ChecklistInstance_1.default.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

exports.default = router;
