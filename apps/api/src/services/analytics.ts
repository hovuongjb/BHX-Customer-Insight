import { getReportSummary } from "./reports";

export function getShopSummary(shopId: string) {
  return getReportSummary({ shopId });
}
