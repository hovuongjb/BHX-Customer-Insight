import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { assertShopInScope } from "../services/scope";
import { asyncHandler } from "../middleware/errorHandler";
import { getShopSummary } from "../services/analytics";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole("ADMIN", "REGION_MANAGER", "SHOP_MANAGER"));

analyticsRouter.get(
  "/shop/:shopId/summary",
  asyncHandler(async (req, res) => {
    await assertShopInScope(req.user!, req.params.shopId);
    res.json(await getShopSummary(req.params.shopId));
  })
);
