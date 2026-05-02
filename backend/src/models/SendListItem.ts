import { Schema, model } from 'mongoose';

const schema = new Schema({
  num: { type: String, required: true },
  done: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  date: { type: String, required: true },
}, { timestamps: true });

export default model('SendListItem', schema);
