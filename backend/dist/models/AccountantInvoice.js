"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const attachedFileSchema = new mongoose_1.Schema({
    cloudinaryId: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
}, { _id: true });
const schema = new mongoose_1.Schema({
    num: { type: String, required: true },
    sent: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    files: { type: [attachedFileSchema], default: [] },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('AccountantInvoice', schema);
