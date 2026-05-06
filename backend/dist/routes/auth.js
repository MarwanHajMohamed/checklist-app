"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");
const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000;

function signAccess(userId, role) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonwebtoken_1.default.sign(
    { sub: userId, role },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
    },
  );
}

function signRefresh(userId) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonwebtoken_1.default.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
    },
  );
}

function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MS,
    path: "/",
  });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const existing = await User_1.default.findOne({
      email: email.toLowerCase(),
    });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_ROUNDS);
    const user = await User_1.default.create({
      email: email.toLowerCase(),
      passwordHash,
    });
    const accessToken = signAccess(user._id.toString(), user.role);
    const refreshToken = signRefresh(user._id.toString());
    setRefreshCookie(res, refreshToken);
    res.status(201).json({
      accessToken,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email: email?.toLowerCase() });
    if (
      !user ||
      !(await bcrypt_1.default.compare(password, user.passwordHash))
    ) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const accessToken = signAccess(user._id.toString(), user.role);
    const refreshToken = signRefresh(user._id.toString());
    setRefreshCookie(res, refreshToken);
    res.json({
      accessToken,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ ok: true });
});

router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    const payload = jsonwebtoken_1.default.verify(
      token,
      process.env.JWT_REFRESH_SECRET,
    );
    const user = await User_1.default.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const accessToken = signAccess(user._id.toString(), user.role);
    const newRefresh = signRefresh(user._id.toString());
    setRefreshCookie(res, newRefresh);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jsonwebtoken_1.default.verify(
      authHeader.slice(7),
      process.env.JWT_ACCESS_SECRET,
    );
    const user = await User_1.default.findById(payload.sub);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ user: { id: user._id, email: user.email, role: user.role } });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

exports.default = router;
