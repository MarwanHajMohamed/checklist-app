import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";

const router = Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");
const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000;

function signAccess(userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || "15m") as any,
  });
}

function signRefresh(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || "7d") as any,
  });
}

function setRefreshCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MS,
    path: "/",
  });
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
    });
    const accessToken = signAccess(user._id.toString(), user.role);
    const refreshToken = signRefresh(user._id.toString());
    setRefreshCookie(res, refreshToken);
    res
      .status(201)
      .json({
        accessToken,
        user: { id: user._id, email: user.email, role: user.role },
      });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
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

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ ok: true });
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
      sub: string;
    };
    const user = await User.findById(payload.sub);
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

router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_ACCESS_SECRET!,
    ) as { sub: string; role: string };
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ user: { id: user._id, email: user.email, role: user.role } });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
