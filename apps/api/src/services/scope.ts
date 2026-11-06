import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import type { AuthTokenPayload } from "../lib/jwt";

/** Throws 403 if the user's role/scope does not cover the given shop. */
export async function assertShopInScope(user: AuthTokenPayload, shopId: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "SHOP_MANAGER" || user.role === "STAFF") {
    if (user.shopId !== shopId) {
      throw new AppError(403, "FORBIDDEN", "Siêu thị này ngoài phạm vi phân quyền của bạn.");
    }
    return;
  }
  if (user.role === "REGION_MANAGER") {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.regionId !== user.regionId) {
      throw new AppError(403, "FORBIDDEN", "Siêu thị này ngoài khu vực phân quyền của bạn.");
    }
    return;
  }
  throw new AppError(403, "FORBIDDEN", "Không có quyền thực hiện hành động này.");
}

export async function assertRegionInScope(user: AuthTokenPayload, regionId: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "REGION_MANAGER" && user.regionId === regionId) return;
  throw new AppError(403, "FORBIDDEN", "Khu vực này ngoài phạm vi phân quyền của bạn.");
}
