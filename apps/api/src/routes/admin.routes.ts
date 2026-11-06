import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { exportSessionsCsv, getReportSummary, getSessionDetail, listSessions, type ReportFilters } from "../services/reports";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

const filterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  regionId: z.string().min(1).optional(),
  shopCode: z.string().min(1).optional(),
  source: z.enum(["QR", "STAFF"]).optional(),
  campaignId: z.string().min(1).optional(),
});

const toJson = (value: unknown) => JSON.parse(JSON.stringify(value));

function parseFilters(query: unknown): ReportFilters {
  // Empty strings from the UI mean "no filter".
  const cleaned = Object.fromEntries(Object.entries(query as Record<string, unknown>).filter(([, v]) => v !== "" && v != null));
  return filterSchema.parse(cleaned);
}

adminRouter.get(
  "/report-filters",
  asyncHandler(async (_req, res) => {
    const [regions, campaigns] = await Promise.all([
      prisma.region.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.surveyCampaign.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    ]);
    res.json({ regions, campaigns });
  })
);

adminRouter.get(
  "/reports/summary",
  asyncHandler(async (req, res) => {
    res.json(await getReportSummary(parseFilters(req.query)));
  })
);

adminRouter.get(
  "/reports/sessions",
  asyncHandler(async (req, res) => {
    const filters = parseFilters(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const result = await listSessions(filters, page, pageSize);

    // The list exposes respondent names / phone last-4: record the access.
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "VIEW_SESSION_LIST", entityType: "SurveySession", metadata: toJson({ filters, page, returned: result.data.length }) },
    });
    res.json(result);
  })
);

adminRouter.get(
  "/reports/sessions/:id",
  asyncHandler(async (req, res) => {
    const detail = await getSessionDetail(req.params.id);
    if (!detail) throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phản hồi.");
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "VIEW_SESSION_DETAIL", entityType: "SurveySession", entityId: detail.id },
    });
    res.json(detail);
  })
);

adminRouter.get(
  "/reports/export.csv",
  asyncHandler(async (req, res) => {
    const filters = parseFilters(req.query);
    const csv = await exportSessionsCsv(filters);
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "EXPORT_SESSIONS_CSV", entityType: "SurveySession", metadata: toJson({ filters }) },
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="bhx-khao-sat.csv"');
    res.send(csv);
  })
);
