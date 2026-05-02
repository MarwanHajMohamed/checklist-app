import { Schema, model } from 'mongoose';

const attachedFileSchema = new Schema({
  cloudinaryId: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
}, { _id: true });

const schema = new Schema({
  num: { type: String, required: true },
  sent: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  files: { type: [attachedFileSchema], default: [] },
}, { timestamps: true });

export default model('AccountantInvoice', schema);
