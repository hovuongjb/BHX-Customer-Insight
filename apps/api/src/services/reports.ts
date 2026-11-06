import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface ReportFilters {
  from?: Date;
  to?: Date;
  regionId?: string;
  shopId?: string;
  shopCode?: string;
  source?: "QR" | "STAFF";
  campaignId?: string;
}

export const DEFAULT_FACTOR_LABELS: Record<string, string> = {
  PRICE: "Giá bán tốt hơn",
  PROMOTION: "Khuyến mãi hấp dẫn hơn",
  BRAND: "Có nhãn hiệu quen dùng",
  PACKAGE_SIZE: "Có dung tích/quy cách phù hợp",
  PRODUCT_TYPE: "Có đúng loại sản phẩm cần mua",
  OTHER: "Yếu tố khác",
  NONE: "Không có thay đổi nào khiến tôi chuyển sang BHX",
};

const DETAIL_TYPE_LABELS: Record<string, string> = {
  PRICE: "Giá bán",
  PROMOTION: "Khuyến mãi",
  BRAND: "Nhãn hiệu",
  PACKAGE_SIZE: "Quy cách",
  PRODUCT_TYPE: "Loại sản phẩm",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Hoàn tất",
  IN_PROGRESS: "Đang làm",
  ABANDONED: "Bỏ dở",
};

async function factorLabelMap(): Promise<Record<string, string>> {
  const config = await prisma.surveyQuestionConfig.findFirst({
    where: { questionKey: "Q3", isActive: true },
    orderBy: { version: "desc" },
    include: { options: true },
  });
  const map = { ...DEFAULT_FACTOR_LABELS };
  for (const o of config?.options ?? []) map[o.optionKey] = o.labelText;
  return map;
}

async function buildWhere(filters: ReportFilters): Promise<Prisma.SurveySessionWhereInput> {
  const where: Prisma.SurveySessionWhereInput = {};

  if (filters.from || filters.to) {
    where.startedAt = {};
    if (filters.from) where.startedAt.gte = filters.from;
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      where.startedAt.lte = end;
    }
  }
  if (filters.source) where.source = filters.source;
  if (filters.campaignId) where.campaignId = filters.campaignId;

  const shopWhere: Prisma.ShopWhereInput = {};
  if (filters.regionId) shopWhere.regionId = filters.regionId;
  if (filters.shopId) shopWhere.id = filters.shopId;
  if (filters.shopCode) shopWhere.code = filters.shopCode;
  if (Object.keys(shopWhere).length > 0) where.shop = shopWhere;

  return where;
}

function ratio(count: number, sample: number): number {
  return sample > 0 ? Math.round((count / sample) * 1000) / 10 : 0;
}

export async function getReportSummary(filters: ReportFilters) {
  const where = await buildWhere(filters);
  const sessions = await prisma.surveySession.findMany({
    where,
    select: {
      id: true,
      source: true,
      status: true,
      isDuplicate: true,
      startedAt: true,
      completedAt: true,
      giftNameSnapshot: true,
      shop: { select: { regionId: true, region: { select: { name: true } } } },
    },
  });

  const valid = sessions.filter((s) => s.status === "COMPLETED" && !s.isDuplicate);
  const validIds = valid.map((s) => s.id);
  const sampleSize = valid.length;
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;

  const durations = valid.filter((s) => s.completedAt).map((s) => (s.completedAt!.getTime() - s.startedAt.getTime()) / 1000);
  const avgDurationSeconds = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const [groupChoices, factors, details, factorLabels] = await Promise.all([
    prisma.surveyGroupChoice.findMany({ where: { sessionId: { in: validIds } }, include: { productGroup: true } }),
    prisma.surveyChangeFactor.findMany({ where: { sessionId: { in: validIds } }, include: { productGroup: true } }),
    prisma.surveyDetailChoice.findMany({ where: { sessionId: { in: validIds } }, include: { productGroup: true } }),
    factorLabelMap(),
  ]);

  const countBy = (labels: string[]) => {
    const map = new Map<string, number>();
    for (const l of labels) map.set(l, (map.get(l) ?? 0) + 1);
    return [...map.entries()]
      .map(([label, count]) => ({ label, count, ratio: ratio(count, sampleSize) }))
      .sort((a, b) => b.count - a.count);
  };

  const q1 = groupChoices.filter((c) => c.questionKey === "Q1");
  const q2 = groupChoices.filter((c) => c.questionKey === "Q2");
  const detailLabels = (type: string) => details.filter((d) => d.detailType === type).map((d) => d.labelSnapshot);

  const opportunityMap = new Map<string, { group: string; factor: string; count: number }>();
  for (const f of factors) {
    if (f.factorKey === "NONE") continue;
    const key = `${f.productGroupId}:${f.factorKey}`;
    const entry = opportunityMap.get(key) ?? { group: f.productGroup.name, factor: factorLabels[f.factorKey] ?? f.factorKey, count: 0 };
    entry.count += 1;
    opportunityMap.set(key, entry);
  }

  const regionMap = new Map<string, { regionName: string; total: number; valid: number; completed: number }>();
  for (const s of sessions) {
    const r = regionMap.get(s.shop.regionId) ?? { regionName: s.shop.region.name, total: 0, valid: 0, completed: 0 };
    r.total += 1;
    if (s.status === "COMPLETED") r.completed += 1;
    if (s.status === "COMPLETED" && !s.isDuplicate) r.valid += 1;
    regionMap.set(s.shop.regionId, r);
  }

  const dayMap = new Map<string, { total: number; valid: number }>();
  for (const s of sessions) {
    const day = s.startedAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const d = dayMap.get(day) ?? { total: 0, valid: 0 };
    d.total += 1;
    if (s.status === "COMPLETED" && !s.isDuplicate) d.valid += 1;
    dayMap.set(day, d);
  }

  return {
    sampleSize,
    totalSessions: sessions.length,
    completedCount,
    validCount: sampleSize,
    duplicateCount: sessions.filter((s) => s.isDuplicate).length,
    inProgressCount: sessions.filter((s) => s.status !== "COMPLETED").length,
    qrCount: sessions.filter((s) => s.source === "QR").length,
    staffCount: sessions.filter((s) => s.source === "STAFF").length,
    completionRate: sessions.length ? ratio(completedCount, sessions.length) : 0,
    avgDurationSeconds,
    allAtBhxCount: q1.filter((c) => c.isExclusiveChoice).length,
    noSwitchCount: q2.filter((c) => c.isExclusiveChoice).length,
    buyOutsideByGroup: countBy(q1.filter((c) => c.productGroup).map((c) => c.productGroup!.name)),
    wantImprovementByGroup: countBy(q2.filter((c) => c.productGroup).map((c) => c.productGroup!.name)),
    topFactors: countBy(factors.map((f) => factorLabels[f.factorKey] ?? f.factorKey)),
    topOpportunities: [...opportunityMap.values()]
      .map((o) => ({ ...o, ratio: ratio(o.count, sampleSize) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    priceExpectations: countBy(detailLabels("PRICE")),
    topPromotions: countBy(detailLabels("PROMOTION")),
    topBrands: countBy(detailLabels("BRAND")),
    topPackageSizes: countBy(detailLabels("PACKAGE_SIZE")),
    topProductTypes: countBy(detailLabels("PRODUCT_TYPE")),
    gifts: countBy(valid.filter((s) => s.giftNameSnapshot).map((s) => s.giftNameSnapshot!)),
    byRegion: [...regionMap.entries()]
      .map(([regionId, r]) => ({ regionId, ...r, completionRate: ratio(r.completed, r.total) }))
      .sort((a, b) => b.valid - a.valid),
    byDay: [...dayMap.entries()].map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

const sessionListInclude = {
  shop: { include: { region: true } },
  respondent: { select: { fullName: true, phoneLast4: true } },
  groupChoices: { include: { productGroup: true } },
} satisfies Prisma.SurveySessionInclude;

export async function listSessions(filters: ReportFilters, page: number, pageSize: number) {
  const where = await buildWhere(filters);
  const [total, rows] = await Promise.all([
    prisma.surveySession.count({ where }),
    prisma.surveySession.findMany({
      where,
      include: sessionListInclude,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    data: rows.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      status: s.status,
      statusLabel: STATUS_LABELS[s.status],
      source: s.source,
      isDuplicate: s.isDuplicate,
      shopCode: s.shop.code,
      shopName: s.shop.name,
      qltpName: s.shop.region.name,
      respondentName: s.respondent?.fullName ?? null,
      phoneLast4: s.respondent?.phoneLast4 ?? null,
      giftName: s.giftNameSnapshot,
      buyOutside: s.groupChoices.filter((c) => c.questionKey === "Q1" && c.productGroup).map((c) => c.productGroup!.name),
      wantImprovement: s.groupChoices.filter((c) => c.questionKey === "Q2" && c.productGroup).map((c) => c.productGroup!.name),
    })),
  };
}

export async function getSessionDetail(id: string) {
  const s = await prisma.surveySession.findUnique({
    where: { id },
    include: {
      shop: { include: { region: true } },
      respondent: { select: { fullName: true, phoneLast4: true } },
      groupChoices: { include: { productGroup: true } },
      changeFactors: { include: { productGroup: true } },
      detailChoices: { include: { productGroup: true } },
    },
  });
  if (!s) return null;

  const factorLabels = await factorLabelMap();
  const q1 = s.groupChoices.filter((c) => c.questionKey === "Q1");
  const q2 = s.groupChoices.filter((c) => c.questionKey === "Q2");

  const groupIds = [...new Set([...s.changeFactors.map((f) => f.productGroupId), ...s.detailChoices.map((d) => d.productGroupId)])];
  const perGroup = groupIds.map((groupId) => {
    const groupName = (s.changeFactors.find((f) => f.productGroupId === groupId) ?? s.detailChoices.find((d) => d.productGroupId === groupId))!.productGroup.name;
    return {
      group: groupName,
      factors: s.changeFactors.filter((f) => f.productGroupId === groupId).map((f) => factorLabels[f.factorKey] ?? f.factorKey),
      details: s.detailChoices
        .filter((d) => d.productGroupId === groupId)
        .map((d) => ({ type: DETAIL_TYPE_LABELS[d.detailType] ?? d.detailType, label: d.labelSnapshot })),
    };
  });

  return {
    id: s.id,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    status: s.status,
    statusLabel: STATUS_LABELS[s.status],
    source: s.source,
    isDuplicate: s.isDuplicate,
    shopCode: s.shop.code,
    shopName: s.shop.name,
    qltpName: s.shop.region.name,
    respondentName: s.respondent?.fullName ?? null,
    phoneLast4: s.respondent?.phoneLast4 ?? null,
    giftName: s.giftNameSnapshot,
    q1: { allAtBhx: q1.some((c) => c.isExclusiveChoice), groups: q1.filter((c) => c.productGroup).map((c) => c.productGroup!.name) },
    q2: { noSwitch: q2.some((c) => c.isExclusiveChoice), groups: q2.filter((c) => c.productGroup).map((c) => c.productGroup!.name) },
    perGroup,
  };
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of the filtered sessions. Deliberately excludes respondent name/phone (no PII in exports). */
export async function exportSessionsCsv(filters: ReportFilters): Promise<string> {
  const where = await buildWhere(filters);
  const [sessions, factorLabels] = await Promise.all([
    prisma.surveySession.findMany({
      where,
      include: {
        shop: { include: { region: true } },
        groupChoices: { include: { productGroup: true } },
        changeFactors: { include: { productGroup: true } },
        detailChoices: { include: { productGroup: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 50000,
    }),
    factorLabelMap(),
  ]);

  const fmt = (d: Date | null) => (d ? d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");
  const header = [
    "Bắt đầu",
    "Hoàn tất",
    "Mã ST",
    "Siêu thị",
    "QLTP",
    "Nguồn",
    "Trạng thái",
    "Trùng",
    "Mua ở nơi khác",
    "Muốn BHX cải thiện",
    "Yếu tố cần thay đổi",
    "Mong muốn cụ thể",
    "Quà đã chọn",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const s of sessions) {
    const q1 = s.groupChoices.filter((c) => c.questionKey === "Q1");
    const q2 = s.groupChoices.filter((c) => c.questionKey === "Q2");
    const buyOutside = q1.some((c) => c.isExclusiveChoice) ? "Mua cả 4 nhóm tại BHX" : q1.map((c) => c.productGroup?.name).filter(Boolean).join("; ");
    const wantImprove = q2.some((c) => c.isExclusiveChoice) ? "Chưa muốn chuyển nhóm nào" : q2.map((c) => c.productGroup?.name).filter(Boolean).join("; ");
    const factors = s.changeFactors.map((f) => `${f.productGroup.name}: ${factorLabels[f.factorKey] ?? f.factorKey}`).join("; ");
    const detailText = s.detailChoices.map((d) => `${d.productGroup.name} - ${DETAIL_TYPE_LABELS[d.detailType]}: ${d.labelSnapshot}`).join("; ");

    lines.push(
      [
        fmt(s.startedAt),
        fmt(s.completedAt),
        s.shop.code,
        s.shop.name,
        s.shop.region.name,
        s.source === "QR" ? "QR" : "Nhân viên",
        STATUS_LABELS[s.status],
        s.isDuplicate ? "Có" : "",
        buyOutside,
        wantImprove,
        factors,
        detailText,
        s.giftNameSnapshot ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return "﻿" + lines.join("\r\n");
}
