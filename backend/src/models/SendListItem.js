const mongoose = require('mongoose');

const sendListItemSchema = new mongoose.Schema(
  {
    num: { type: String, required: true, trim: true, maxlength: 128 },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sendListItemSchema.index({ createdBy: 1, date: 1, order: 1 });

module.exports = mongoose.model('SendListItem', sendListItemSchema);
