import { Router } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";
import { assertShopInScope } from "../services/scope";
import { generateQrToken } from "../lib/qrToken";
import { env } from "../lib/env";

export const qrRouter = Router();
qrRouter.use(requireAuth, requireRole("ADMIN", "REGION_MANAGER", "SHOP_MANAGER"));

function surveyUrl(token: string) {
  return `${env.publicSurveyBaseUrl}/s/${token}`;
}

const checkShopSchema = z.object({ shopCode: z.string().min(1) });

qrRouter.post(
  "/check-shop",
  asyncHandler(async (req, res) => {
    const { shopCode } = checkShopSchema.parse(req.body);
    const shop = await prisma.shop.findUnique({ where: { code: shopCode }, include: { region: true } });
    if (!shop || !shop.isActive) {
      throw new AppError(404, "SHOP_NOT_FOUND", "Mã siêu thị không tồn tại.");
    }
    await assertShopInScope(req.user!, shop.id);
    res.json({ shopId: shop.id, shopCode: shop.code, shopName: shop.name, qltpName: shop.region.name });
  })
);

qrRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const scopeWhere =
      user.role === "ADMIN"
        ? {}
        : user.role === "REGION_MANAGER"
          ? { shop: { regionId: user.regionId ?? "__none__" } }
          : { shopId: user.shopId ?? "__none__" };
    const search = typeof req.query.shopCode === "string" ? req.query.shopCode.trim() : "";
    const where = search ? { ...scopeWhere, shop: { ...(scopeWhere as { shop?: object }).shop, code: { contains: search } } } : scopeWhere;
    // With 300+ shops now in scope for ADMIN, default to the most-recent slice
    // rather than returning every QR code at once; a shopCode search narrows it.
    const take = Math.min(Number(req.query.limit) || 20, 100);
    const qrCodes = await prisma.shopQrCode.findMany({ where, include: { shop: true }, orderBy: { createdAt: "desc" }, take });
    res.json({ data: qrCodes.map((q) => ({ ...q, surveyUrl: surveyUrl(q.token) })) });
  })
);

qrRouter.post(
  "/",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { shopCode } = checkShopSchema.parse(req.body);
    const shop = await prisma.shop.findUnique({ where: { code: shopCode } });
    if (!shop || !shop.isActive) throw new AppError(404, "SHOP_NOT_FOUND", "Mã siêu thị không tồn tại.");
    await assertShopInScope(req.user!, shop.id);

    const qr = await prisma.$transaction(async (tx) => {
      await tx.shopQrCode.updateMany({ where: { shopId: shop.id, isActive: true }, data: { isActive: false, revokedAt: new Date() } });
      return tx.shopQrCode.create({
        data: { shopId: shop.id, token: generateQrToken(), createdById: req.user!.sub },
      });
    });
    res.status(201).json({ ...qr, surveyUrl: surveyUrl(qr.token) });
  })
);

qrRouter.patch(
  "/:id/revoke",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const qr = await prisma.shopQrCode.findUnique({ where: { id: req.params.id } });
    if (!qr) throw new AppError(404, "QR_NOT_FOUND", "Không tìm thấy mã QR.");
    await assertShopInScope(req.user!, qr.shopId);
    res.json(await prisma.shopQrCode.update({ where: { id: qr.id }, data: { isActive: false, revokedAt: new Date() } }));
  })
);

qrRouter.get(
  "/:id/export",
  asyncHandler(async (req, res) => {
    const qr = await prisma.shopQrCode.findUnique({ where: { id: req.params.id }, include: { shop: true } });
    if (!qr) throw new AppError(404, "QR_NOT_FOUND", "Không tìm thấy mã QR.");
    await assertShopInScope(req.user!, qr.shopId);

    const url = surveyUrl(qr.token);
    const format = (req.query.format as string) ?? "png";

    if (format === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 400 });
      res.type("image/svg+xml").send(svg);
      return;
    }
    if (format === "poster") {
      const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, width: 420 });
      const inner = qrSvg.replace(/<\?xml[^>]*\?>/, "");
      const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842">
        <rect width="595" height="842" fill="#ffffff" />
        <rect width="595" height="140" fill="#1a7a3c" />
        <text x="297" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">BÁCH HÓA XANH</text>
        <text x="297" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#ffe14d">KHẢO SÁT Ý KIẾN KHÁCH HÀNG</text>
        <text x="297" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#333333">${qr.shop.name}</text>
        <g transform="translate(87, 230)">${inner}</g>
        <text x="297" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#1a7a3c">Quét mã QR để chia sẻ ý kiến</text>
        <text x="297" y="735" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#555555">"Lắng nghe khách hàng – Thay đổi để được lựa chọn."</text>
      </svg>`;
      res.type("image/svg+xml").send(poster);
      return;
    }

    const pngBuffer = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 600 });
    res.type("image/png").send(pngBuffer);
  })
);
