import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signAuthToken } from "../lib/jwt";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { env } from "../lib/env";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = {
  httpOnly: true as const,
  secure: env.nodeEnv === "production",
  sameSite: "strict" as const,
  maxAge: 12 * 60 * 60 * 1000,
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    }

    const token = signAuthToken({ sub: user.id, role: user.role, shopId: user.shopId, regionId: user.regionId });
    const csrfToken = crypto.randomBytes(16).toString("hex");

    res.cookie("token", token, cookieOpts);
    res.cookie("csrfToken", csrfToken, { ...cookieOpts, httpOnly: false });

    res.json({
      user: { id: user.id, fullName: user.fullName, role: user.role, shopId: user.shopId, regionId: user.regionId },
    });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.clearCookie("csrfToken");
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError(401, "UNAUTHENTICATED", "Chưa đăng nhập.");
    res.json({ user: { id: user.id, fullName: user.fullName, role: user.role, shopId: user.shopId, regionId: user.regionId } });
  })
);
