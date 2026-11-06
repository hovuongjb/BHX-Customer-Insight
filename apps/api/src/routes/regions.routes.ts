import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";

export const regionsRouter = Router();
regionsRouter.use(requireAuth);

regionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.region.findMany({ orderBy: { name: "asc" } }) });
  })
);

const createRegionSchema = z.object({ code: z.string().min(1), name: z.string().min(1) });

regionsRouter.post(
  "/",
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = createRegionSchema.parse(req.body);
    res.status(201).json(await prisma.region.create({ data: body }));
  })
);
