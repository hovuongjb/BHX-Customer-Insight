import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth, requireRole("ADMIN"));

campaignsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.surveyCampaign.findMany({ orderBy: { createdAt: "desc" } }) });
  })
);

const createCampaignSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

campaignsRouter.post(
  "/",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = createCampaignSchema.parse(req.body);
    const campaign = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.surveyCampaign.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      return tx.surveyCampaign.create({ data: { ...body, createdById: req.user!.sub } });
    });
    res.status(201).json(campaign);
  })
);
