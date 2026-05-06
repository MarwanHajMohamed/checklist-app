"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");

const schema = new mongoose_1.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["operations", "accountant"],
      default: "operations",
    },
  },
  { timestamps: true },
);

exports.default = (0, mongoose_1.model)("User", schema);
