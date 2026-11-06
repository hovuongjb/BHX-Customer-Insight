import { Router } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { getSurveyConfigBundle, saveSurveyAnswers, completeSurveySession, checkDuplicateRespondent } from "../services/survey";
import { normalizeVnPhone, hashPhone, last4, encryptPhone } from "../lib/phone";
import { surveyAnswersSchema } from "../services/surveyAnswers.schema";
import { env } from "../lib/env";

export const publicRouter = Router();

// v2: short "thank-you gift" notice, no explicit checkbox (product decision 2026-11-06,
// supersedes the full privacy-notice + active-consent flow — see CLAUDE.md §7 note).
const CONSENT_TEXT_VERSION = "v2-2026-11-06-qua-cam-on";

async function findActiveQrForShopCode(shopCode: string) {
  const shop = await prisma.shop.findUnique({ where: { code: shopCode }, include: { qrCodes: { where: { isActive: true }, take: 1 } } });
  if (!shop || !shop.isActive) {
    throw new AppError(404, "SHOP_NOT_FOUND", "Mã siêu thị không tồn tại.");
  }
  const qr = shop.qrCodes[0];
  if (!qr) {
    throw new AppError(404, "QR_NOT_FOUND", "Siêu thị này chưa có mã QR đang hoạt động. Vui lòng liên hệ quản trị viên.");
  }
  return { shop, qr };
}

/**
 * Read-only, no-login lookup so any staff member can pull up their shop's
 * already-provisioned QR by typing the shop code — creating/revoking QR codes
 * stays admin/shop-manager-gated in qr.routes.ts, this never creates one.
 */
publicRouter.get(
  "/shop-qr/:shopCode",
  asyncHandler(async (req, res) => {
    const { shop, qr } = await findActiveQrForShopCode(req.params.shopCode);
    res.json({
      shopId: shop.id,
      shopCode: shop.code,
      shopName: shop.name,
      surveyUrl: `${env.publicSurveyBaseUrl}/s/${qr.token}`,
    });
  })
);

publicRouter.get(
  "/shop-qr/:shopCode/image",
  asyncHandler(async (req, res) => {
    const { qr } = await findActiveQrForShopCode(req.params.shopCode);
    const url = `${env.publicSurveyBaseUrl}/s/${qr.token}`;
    const format = (req.query.format as string) ?? "png";

    if (format === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 400 });
      res.type("image/svg+xml").send(svg);
      return;
    }
    const pngBuffer = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 600 });
    res.type("image/png").send(pngBuffer);
  })
);

publicRouter.get(
  "/qr/:token",
  asyncHandler(async (req, res) => {
    const qr = await prisma.shopQrCode.findUnique({
      where: { token: req.params.token },
      include: { shop: true },
    });
    if (!qr || !qr.isActive || !qr.shop.isActive) {
      throw new AppError(404, "QR_NOT_FOUND", "Mã QR không hợp lệ hoặc đã bị vô hiệu hoá.");
    }
    const campaign = await prisma.surveyCampaign.findFirst({ where: { isActive: true } });
    res.json({
      shopId: qr.shop.id,
      shopCode: qr.shop.code,
      shopName: qr.shop.name,
      // Note: internal QLTP/region name is intentionally not exposed on this public,
      // unauthenticated endpoint — customers only need to confirm the shop itself.
      campaignId: campaign?.id ?? null,
    });
  })
);

publicRouter.get(
  "/survey-config",
  asyncHandler(async (_req, res) => {
    res.json(await getSurveyConfigBundle());
  })
);

const createSessionSchema = z.object({
  qrToken: z.string(),
  respondent: z.object({ fullName: z.string().min(1), phone: z.string().min(1) }),
  consent: z.object({ given: z.literal(true) }),
});

publicRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const body = createSessionSchema.parse(req.body);

    const qr = await prisma.shopQrCode.findUnique({ where: { token: body.qrToken }, include: { shop: true } });
    if (!qr || !qr.isActive || !qr.shop.isActive) {
      throw new AppError(404, "QR_NOT_FOUND", "Mã QR không hợp lệ hoặc đã bị vô hiệu hoá.");
    }

    const normalizedPhone = normalizeVnPhone(body.respondent.phone);
    if (!normalizedPhone) {
      throw new AppError(400, "INVALID_PHONE", "Số điện thoại không đúng định dạng Việt Nam.");
    }
    const phoneHash = hashPhone(normalizedPhone);

    const campaign = await prisma.surveyCampaign.findFirst({ where: { isActive: true } });

    const isDuplicate = await checkDuplicateRespondent(qr.shop.id, campaign?.id ?? null, phoneHash);

    const respondent = await prisma.surveyRespondent.create({
      data: { fullName: body.respondent.fullName, phoneNormalizedHash: phoneHash, phoneLast4: last4(normalizedPhone), phoneEncrypted: encryptPhone(normalizedPhone) },
    });
    await prisma.privacyConsent.create({
      data: { respondentId: respondent.id, consentGiven: true, consentTextVersion: CONSENT_TEXT_VERSION },
    });

    const { versionSnapshot } = await getSurveyConfigBundle();

    const session = await prisma.surveySession.create({
      data: {
        shopId: qr.shop.id,
        campaignId: campaign?.id ?? null,
        source: "QR",
        respondentId: respondent.id,
        isDuplicate,
        questionVersionSnapshot: versionSnapshot,
      },
    });

    res.status(201).json({ sessionId: session.id, isDuplicate });
  })
);

publicRouter.patch(
  "/sessions/:sessionId/answers",
  asyncHandler(async (req, res) => {
    const input = surveyAnswersSchema.parse(req.body);
    const session = await prisma.surveySession.findUnique({ where: { id: req.params.sessionId } });
    if (!session || session.source !== "QR") throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
    res.json(await saveSurveyAnswers(req.params.sessionId, input));
  })
);

const completeSchema = z.object({ giftId: z.string().min(1) });

publicRouter.post(
  "/sessions/:sessionId/complete",
  asyncHandler(async (req, res) => {
    const { giftId } = completeSchema.parse(req.body);
    const session = await prisma.surveySession.findUnique({ where: { id: req.params.sessionId } });
    if (!session || session.source !== "QR") throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
    await completeSurveySession(req.params.sessionId, giftId);
    res.json({ ok: true });
  })
);
