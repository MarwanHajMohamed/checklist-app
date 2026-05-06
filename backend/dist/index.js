"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const checklists_1 = __importDefault(require("./routes/checklists"));
const accountant_1 = __importDefault(require("./routes/accountant"));
const sendList_1 = __importDefault(require("./routes/sendList"));

const app = (0, express_1.default)();
app.use(
  (0, cors_1.default)({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", auth_1.default);
app.use("/api/checklists", checklists_1.default);
app.use("/api/accountant", accountant_1.default);
app.use("/api/send-list", sendList_1.default);
const PORT = parseInt(process.env.PORT || "4000");
(0, db_1.connectDB)().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
