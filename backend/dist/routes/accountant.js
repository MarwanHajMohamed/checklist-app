"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const AccountantInvoice_1 = __importDefault(
  require("../models/AccountantInvoice"),
);
const auth_1 = require("../middleware/auth");

const UPLOAD_DIR = path_1.default.resolve(process.env.UPLOAD_DIR || "uploads");

const upload = (0, multer_1.default)({
  storage: multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
      fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path_1.default.extname(file.originalname);
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || "20971520") },
});

const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);

router.get("/", async (_req, res) => {
  const items = await AccountantInvoice_1.default
    .find()
    .sort({ order: 1, createdAt: -1 });
  res.json(items);
});

router.post("/", async (req, res) => {
  const count = await AccountantInvoice_1.default.countDocuments();
  const item = await AccountantInvoice_1.default.create({
    num: req.body.num,
    order: count,
  });
  res.status(201).json(item);
});

router.patch("/reorder", async (req, res) => {
  const { order } = req.body;
  await Promise.all(
    order.map(({ id }, idx) =>
      AccountantInvoice_1.default.findByIdAndUpdate(id, { order: idx }),
    ),
  );
  res.json({ ok: true });
});

router.patch("/:id", async (req, res) => {
  const { num, sent } = req.body;
  const update = {};
  if (num !== undefined) update.num = num;
  if (sent !== undefined) update.sent = sent;
  const item = await AccountantInvoice_1.default.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true },
  );
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  const item = await AccountantInvoice_1.default.findByIdAndDelete(
    req.params.id,
  );
  if (item) {
    item.files.forEach((f) => {
      fs_1.default.unlink(path_1.default.join(UPLOAD_DIR, f.filename), () => {});
    });
  }
  res.json({ ok: true });
});

router.post("/:id/files", upload.array("files"), async (req, res) => {
  const item = await AccountantInvoice_1.default.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const files = req.files;
  const newFiles = files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));
  item.files.push(...newFiles);
  await item.save();
  res.json({ files: item.files });
});

router.get("/:id/files/:fileId", async (req, res) => {
  const item = await AccountantInvoice_1.default.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const file = item.files.find((f) => f._id.toString() === req.params.fileId);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${file.originalName}"`,
  );
  res.setHeader("Content-Type", file.mimetype);
  res.sendFile(path_1.default.join(UPLOAD_DIR, file.filename));
});

router.delete("/:id/files/:fileId", async (req, res) => {
  const item = await AccountantInvoice_1.default.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const file = item.files.find((f) => f._id.toString() === req.params.fileId);
  if (file) {
    fs_1.default.unlink(path_1.default.join(UPLOAD_DIR, file.filename), () => {});
    item.files = item.files.filter(
      (f) => f._id.toString() !== req.params.fileId,
    );
    await item.save();
  }
  res.json({ ok: true });
});

exports.default = router;
