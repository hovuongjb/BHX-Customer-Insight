import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, email: true, fullName: true, role: true, shopId: true, regionId: true, isActive: true },
    });
    res.json({ data: users });
  })
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(["ADMIN", "REGION_MANAGER", "SHOP_MANAGER", "STAFF"]),
  shopId: z.string().optional(),
  regionId: z.string().optional(),
});

usersRouter.post(
  "/",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        role: body.role,
        shopId: body.shopId,
        regionId: body.regionId,
      },
    });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
  })
);
