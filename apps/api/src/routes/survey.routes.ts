import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";
import { getSurveyConfigBundle, saveSurveyAnswers, completeSurveySession } from "../services/survey";
import { surveyAnswersSchema } from "../services/surveyAnswers.schema";

const completeSchema = z.object({ giftId: z.string().min(1) });

export const surveyRouter = Router();

surveyRouter.use(requireAuth, requireRole("ADMIN", "REGION_MANAGER", "SHOP_MANAGER", "STAFF"));

surveyRouter.get(
  "/survey-config",
  asyncHandler(async (_req, res) => {
    res.json(await getSurveyConfigBundle());
  })
);

surveyRouter.post(
  "/sessions",
  requireCsrf,
  asyncHandler(async (req, res) => {
    if (!req.user!.shopId) {
      throw new AppError(400, "NO_SHOP_ASSIGNED", "Tài khoản của bạn chưa được gán siêu thị.");
    }
    const { versionSnapshot } = await getSurveyConfigBundle();
    const session = await prisma.surveySession.create({
      data: {
        shopId: req.user!.shopId,
        source: "STAFF",
        staffUserId: req.user!.sub,
        questionVersionSnapshot: versionSnapshot,
      },
    });
    res.status(201).json({ sessionId: session.id });
  })
);

surveyRouter.patch(
  "/sessions/:sessionId/answers",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const input = surveyAnswersSchema.parse(req.body);
    const session = await prisma.surveySession.findUnique({ where: { id: req.params.sessionId } });
    if (!session || session.source !== "STAFF" || session.staffUserId !== req.user!.sub) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
    }
    res.json(await saveSurveyAnswers(req.params.sessionId, input));
  })
);

surveyRouter.post(
  "/sessions/:sessionId/complete",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { giftId } = completeSchema.parse(req.body);
    const session = await prisma.surveySession.findUnique({ where: { id: req.params.sessionId } });
    if (!session || session.source !== "STAFF" || session.staffUserId !== req.user!.sub) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
    }
    await completeSurveySession(req.params.sessionId, giftId);
    res.json({ ok: true });
  })
);
