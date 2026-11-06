import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { QuestionKey } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";

export const questionsRouter = Router();
questionsRouter.use(requireAuth, requireRole("ADMIN"));

const QUESTION_KEYS = ["Q1", "Q2", "Q3", "Q4A", "Q4B", "Q4C", "Q4D", "Q4E"] as const;

/**
 * Fixed-key questions: the option *keys* are wired into survey logic (factors, exclusive
 * choices…), so admins may only reword their labels. `null` = free list (add/remove/reorder).
 */
const FIXED_OPTION_KEYS: Record<(typeof QUESTION_KEYS)[number], string[] | null> = {
  Q1: ["NONE"],
  Q2: ["NONE"],
  Q3: ["PRICE", "PROMOTION", "BRAND", "PACKAGE_SIZE", "PRODUCT_TYPE", "OTHER", "NONE"],
  Q4A: null,
  Q4B: null,
  Q4C: ["OTHER", "NOT_IMPORTANT"],
  Q4D: [],
  Q4E: [],
};

const EXCLUSIVE_KEYS = new Set(["NONE", "NOT_IMPORTANT"]);

questionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await Promise.all(
      QUESTION_KEYS.map(async (questionKey) => {
        const versions = await prisma.surveyQuestionConfig.findMany({
          where: { questionKey },
          orderBy: { version: "desc" },
          include: { options: { orderBy: { displayOrder: "asc" } } },
        });
        const current = versions[0];
        return {
          questionKey,
          editableOptionList: FIXED_OPTION_KEYS[questionKey] === null,
          version: current?.version ?? 0,
          labelText: current?.labelText ?? "",
          options: (current?.options ?? []).map((o) => ({
            optionKey: o.optionKey,
            labelText: o.labelText,
            isExclusive: o.isExclusive,
          })),
          history: versions.map((v) => ({ version: v.version, labelText: v.labelText, createdAt: v.createdAt })),
        };
      })
    );
    res.json({ data: result });
  })
);

const newVersionSchema = z.object({
  labelText: z.string().trim().min(1, "Nội dung câu hỏi không được để trống."),
  options: z
    .array(z.object({ optionKey: z.string().optional(), labelText: z.string().trim().min(1, "Nhãn đáp án không được để trống.") }))
    .default([]),
});

questionsRouter.post(
  "/:questionKey/versions",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const questionKey = req.params.questionKey as QuestionKey;
    if (!QUESTION_KEYS.includes(questionKey as (typeof QUESTION_KEYS)[number])) {
      throw new AppError(404, "QUESTION_NOT_FOUND", "Không có câu hỏi này.");
    }
    const body = newVersionSchema.parse(req.body);
    const fixed = FIXED_OPTION_KEYS[questionKey as (typeof QUESTION_KEYS)[number]];

    let options: { optionKey: string; labelText: string }[];
    if (fixed) {
      // Same key set as before, only labels change.
      const byKey = new Map(body.options.map((o) => [o.optionKey, o.labelText]));
      const sameSet = byKey.size === fixed.length && fixed.every((k) => byKey.has(k));
      if (!sameSet) throw new AppError(400, "INVALID_OPTIONS", "Câu hỏi này có danh sách đáp án cố định, chỉ được sửa nội dung từng đáp án.");
      options = fixed.map((k) => ({ optionKey: k, labelText: byKey.get(k)! }));
    } else {
      if (body.options.length === 0) throw new AppError(400, "INVALID_OPTIONS", "Cần có ít nhất một đáp án.");
      const seen = new Set<string>();
      options = body.options.map((o) => {
        const optionKey = o.optionKey || `OPT_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        if (seen.has(optionKey)) throw new AppError(400, "INVALID_OPTIONS", "Mã đáp án bị trùng.");
        seen.add(optionKey);
        return { optionKey, labelText: o.labelText };
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const latest = await tx.surveyQuestionConfig.findFirst({ where: { questionKey }, orderBy: { version: "desc" } });
      await tx.surveyQuestionConfig.updateMany({ where: { questionKey }, data: { isActive: false } });
      return tx.surveyQuestionConfig.create({
        data: {
          questionKey,
          version: (latest?.version ?? 0) + 1,
          labelText: body.labelText,
          createdById: req.user!.sub,
          options: {
            create: options.map((o, i) => ({
              optionKey: o.optionKey,
              labelText: o.labelText,
              displayOrder: i,
              isExclusive: EXCLUSIVE_KEYS.has(o.optionKey),
            })),
          },
        },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      });
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "UPDATE_QUESTION", entityType: "SurveyQuestionConfig", entityId: created.id, metadata: { questionKey, version: created.version } },
    });

    res.status(201).json({
      questionKey,
      version: created.version,
      labelText: created.labelText,
      options: created.options.map((o) => ({ optionKey: o.optionKey, labelText: o.labelText, isExclusive: o.isExclusive })),
    });
  })
);
