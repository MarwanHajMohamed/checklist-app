"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");

const schema = new mongoose_1.Schema(
  {
    templateId: { type: String, required: true },
    invoiceNum: { type: String, required: true },
    doneItems: { type: [Number], default: [] },
  },
  { timestamps: true },
);

exports.default = (0, mongoose_1.model)("ChecklistInstance", schema);
