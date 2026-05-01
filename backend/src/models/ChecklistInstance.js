const mongoose = require('mongoose');

const checklistInstanceSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, trim: true, maxlength: 64 },
    invoiceNum: { type: String, required: true, trim: true, maxlength: 128 },
    doneItems: { type: [Number], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

checklistInstanceSchema.index({ createdBy: 1, templateId: 1 });

module.exports = mongoose.model('ChecklistInstance', checklistInstanceSchema);
