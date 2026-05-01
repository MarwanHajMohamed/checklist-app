const mongoose = require('mongoose');

const attachedFileSchema = new mongoose.Schema(
  {
    storedName: { type: String, required: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimetype: { type: String, required: true, maxlength: 128 },
    size: { type: Number, required: true },
  },
  { _id: true }
);

const accountantInvoiceSchema = new mongoose.Schema(
  {
    num: { type: String, required: true, trim: true, maxlength: 128 },
    sent: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    files: { type: [attachedFileSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

accountantInvoiceSchema.index({ createdBy: 1, order: 1 });

module.exports = mongoose.model('AccountantInvoice', accountantInvoiceSchema);
