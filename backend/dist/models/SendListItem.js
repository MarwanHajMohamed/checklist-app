"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");

const schema = new mongoose_1.Schema(
  {
    num: { type: String, required: true },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    date: { type: String, required: true },
  },
  { timestamps: true },
);

exports.default = (0, mongoose_1.model)("SendListItem", schema);
