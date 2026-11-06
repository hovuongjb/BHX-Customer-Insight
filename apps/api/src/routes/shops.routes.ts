import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";
import { assertRegionInScope } from "../services/scope";

export const shopsRouter = Router();
shopsRouter.use(requireAuth);

shopsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const where =
      user.role === "ADMIN"
        ? {}
        : user.role === "REGION_MANAGER"
          ? { regionId: user.regionId ?? "__none__" }
          : { id: user.shopId ?? "__none__" };
    res.json({ data: await prisma.shop.findMany({ where, include: { region: true }, orderBy: { name: "asc" } }) });
  })
);

const createShopSchema = z.object({ code: z.string().min(1), name: z.string().min(1), regionId: z.string(), address: z.string().optional() });

shopsRouter.post(
  "/",
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = createShopSchema.parse(req.body);
    res.status(201).json(await prisma.shop.create({ data: body }));
  })
);

const updateShopSchema = z.object({ name: z.string().min(1).optional(), address: z.string().optional(), isActive: z.boolean().optional() });

shopsRouter.patch(
  "/:id",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!shop) throw new AppError(404, "SHOP_NOT_FOUND", "Không tìm thấy siêu thị.");
    if (req.user!.role === "ADMIN") {
      // full access
    } else if (req.user!.role === "REGION_MANAGER") {
      await assertRegionInScope(req.user!, shop.regionId);
    } else {
      throw new AppError(403, "FORBIDDEN", "Không có quyền sửa siêu thị.");
    }
    const body = updateShopSchema.parse(req.body);
    res.json(await prisma.shop.update({ where: { id: req.params.id }, data: body }));
  })
);
