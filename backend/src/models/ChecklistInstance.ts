import { Schema, model } from 'mongoose';

const schema = new Schema({
  templateId: { type: String, required: true },
  invoiceNum: { type: String, required: true },
  doneItems: { type: [Number], default: [] },
}, { timestamps: true });

export default model('ChecklistInstance', schema);
