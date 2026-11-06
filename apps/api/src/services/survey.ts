import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import type { SurveyAnswersInput } from "./surveyAnswers.schema";

const Q4_QUESTION_BY_FACTOR: Record<string, string> = {
  PRICE: "Q4A",
  PROMOTION: "Q4B",
  BRAND: "Q4C",
  PACKAGE_SIZE: "Q4D",
  PRODUCT_TYPE: "Q4E",
};

export async function getSurveyConfigBundle() {
  const questionKeys = ["Q1", "Q2", "Q3", "Q4A", "Q4B", "Q4C", "Q4D", "Q4E"] as const;

  const questions = await Promise.all(
    questionKeys.map(async (questionKey) => {
      const config = await prisma.surveyQuestionConfig.findFirst({
        where: { questionKey, isActive: true },
        orderBy: { version: "desc" },
        include: { options: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
      });
      return config ? { questionKey, version: config.version, labelText: config.labelText, options: config.options } : null;
    })
  );

  const productGroups = await prisma.productGroup.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      brands: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
      packageSizes: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
      productTypes: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
    },
  });

  const gifts = await prisma.gift.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });

  return {
    questions: questions.filter((q): q is NonNullable<typeof q> => q !== null),
    productGroups,
    gifts,
    versionSnapshot: Object.fromEntries(
      questions.filter((q): q is NonNullable<typeof q> => q !== null).map((q) => [q.questionKey, q.version])
    ),
  };
}

async function loadOptionLabelMap(questionKey: string): Promise<Map<string, string>> {
  const config = await prisma.surveyQuestionConfig.findFirst({
    where: { questionKey: questionKey as never, isActive: true },
    orderBy: { version: "desc" },
    include: { options: { where: { isActive: true } } },
  });
  return new Map((config?.options ?? []).map((o) => [o.optionKey, o.labelText]));
}

/**
 * Validates the full branching structure of a survey submission against the
 * currently active question/catalog configuration, then replaces (idempotently)
 * all stored answers for the session to match it exactly.
 */
export async function saveSurveyAnswers(sessionId: string, input: SurveyAnswersInput) {
  const session = await prisma.surveySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
  if (session.status === "COMPLETED") {
    throw new AppError(409, "SESSION_ALREADY_COMPLETED", "Phiên khảo sát đã hoàn tất, không thể sửa.");
  }

  const productGroups = await prisma.productGroup.findMany({
    include: { brands: true, packageSizes: true, productTypes: true },
  });
  const groupById = new Map(productGroups.map((g) => [g.id, g]));

  // --- Q1 ---
  if (input.q1.exclusive && input.q1.productGroupIds.length > 0) {
    throw new AppError(400, "INVALID_Q1", "Câu 1: đã chọn 'Không có' nên không thể chọn nhóm hàng khác.");
  }
  if (!input.q1.exclusive && input.q1.productGroupIds.length === 0) {
    throw new AppError(400, "INVALID_Q1", "Câu 1: phải chọn ít nhất một nhóm hàng hoặc 'Không có'.");
  }
  for (const id of input.q1.productGroupIds) {
    if (!groupById.has(id)) throw new AppError(400, "INVALID_Q1", `Câu 1: nhóm hàng không hợp lệ (${id}).`);
  }

  // --- Q2 ---
  const q2 = input.q2 ?? { productGroupIds: [], exclusive: input.q1.exclusive };
  if (!input.q1.exclusive) {
    if (q2.exclusive && q2.productGroupIds.length > 0) {
      throw new AppError(400, "INVALID_Q2", "Câu 2: đã chọn 'Chưa muốn chuyển nhóm nào' nên không thể chọn nhóm khác.");
    }
    for (const id of q2.productGroupIds) {
      if (!input.q1.productGroupIds.includes(id)) {
        throw new AppError(400, "INVALID_Q2", "Câu 2: chỉ được chọn trong các nhóm hàng đã chọn ở Câu 1.");
      }
    }
  }

  // --- Q3 ---
  const q3 = input.q3 ?? {};
  for (const groupId of Object.keys(q3)) {
    if (!q2.productGroupIds.includes(groupId)) {
      throw new AppError(400, "INVALID_Q3", "Câu 3: chỉ được trả lời cho nhóm hàng đã chọn ở Câu 2.");
    }
    const factors = q3[groupId].factors;
    if (factors.includes("NONE") && factors.length > 1) {
      throw new AppError(400, "INVALID_Q3", "Câu 3: 'Không có thay đổi nào' phải là lựa chọn duy nhất trong nhóm hàng.");
    }
    if (factors.length === 0) {
      throw new AppError(400, "INVALID_Q3", "Câu 3: phải chọn ít nhất một yếu tố cho mỗi nhóm hàng đã chọn ở Câu 2.");
    }
  }
  for (const groupId of q2.productGroupIds) {
    if (!q3[groupId]) {
      throw new AppError(400, "INVALID_Q3", "Câu 3: thiếu câu trả lời cho một nhóm hàng đã chọn ở Câu 2.");
    }
  }

  // --- Q4 ---
  const q4 = input.q4 ?? {};
  const detailRows: {
    productGroupId: string;
    detailType: string;
    optionKey: string;
    brandId?: string;
    packageSizeId?: string;
    productTypeId?: string;
    labelSnapshot: string;
  }[] = [];

  for (const [groupId, factorMap] of Object.entries(q4)) {
    const group = groupById.get(groupId);
    if (!group) throw new AppError(400, "INVALID_Q4", `Câu 4: nhóm hàng không hợp lệ (${groupId}).`);
    const allowedFactors = new Set<string>(q3[groupId]?.factors ?? []);

    for (const [factorKey, detail] of Object.entries(factorMap)) {
      if (factorKey === "NONE" || factorKey === "OTHER") {
        throw new AppError(400, "INVALID_Q4", "Câu 4: yếu tố này không có màn hình chi tiết tương ứng.");
      }
      if (!allowedFactors.has(factorKey)) {
        throw new AppError(400, "INVALID_Q4", "Câu 4: yếu tố chưa được chọn ở Câu 3 cho nhóm hàng này.");
      }

      if (factorKey === "PRICE") {
        const valid = await loadOptionLabelMap(Q4_QUESTION_BY_FACTOR.PRICE);
        if (!detail.optionKey || !valid.has(detail.optionKey)) {
          throw new AppError(400, "INVALID_Q4A", "Câu 4A: phải chọn đúng một mức giá hợp lệ.");
        }
        detailRows.push({ productGroupId: groupId, detailType: "PRICE", optionKey: detail.optionKey, labelSnapshot: valid.get(detail.optionKey)! });
      } else if (factorKey === "PROMOTION") {
        const valid = await loadOptionLabelMap(Q4_QUESTION_BY_FACTOR.PROMOTION);
        const keys = detail.optionKeys ?? [];
        if (keys.length === 0 || keys.some((k) => !valid.has(k))) {
          throw new AppError(400, "INVALID_Q4B", "Câu 4B: phải chọn ít nhất một hình thức khuyến mãi hợp lệ.");
        }
        for (const k of keys) {
          detailRows.push({ productGroupId: groupId, detailType: "PROMOTION", optionKey: k, labelSnapshot: valid.get(k)! });
        }
      } else if (factorKey === "BRAND") {
        const selections = detail.brandSelections ?? [];
        const hasExclusive = selections.some((s) => s.optionKey === "NOT_IMPORTANT");
        if (selections.length === 0) {
          throw new AppError(400, "INVALID_Q4C", "Câu 4C: phải chọn ít nhất một nhãn hiệu, 'Nhãn hiệu khác' hoặc 'Không quan trọng'.");
        }
        if (hasExclusive && selections.length > 1) {
          throw new AppError(400, "INVALID_Q4C", "Câu 4C: 'Không quan trọng nhãn hiệu' phải là lựa chọn duy nhất.");
        }
        for (const s of selections) {
          if (s.optionKey === "NOT_IMPORTANT" || s.optionKey === "OTHER") {
            detailRows.push({
              productGroupId: groupId,
              detailType: "BRAND",
              optionKey: s.optionKey,
              labelSnapshot: s.optionKey === "OTHER" ? "Nhãn hiệu khác" : "Không quan trọng nhãn hiệu",
            });
          } else if (s.brandId) {
            const brand = group.brands.find((b) => b.id === s.brandId);
            if (!brand) throw new AppError(400, "INVALID_Q4C", "Câu 4C: nhãn hiệu không hợp lệ cho nhóm hàng này.");
            detailRows.push({ productGroupId: groupId, detailType: "BRAND", optionKey: "BRAND", brandId: brand.id, labelSnapshot: brand.name });
          } else {
            throw new AppError(400, "INVALID_Q4C", "Câu 4C: lựa chọn không hợp lệ.");
          }
        }
      } else if (factorKey === "PACKAGE_SIZE") {
        const ids = detail.packageSizeIds ?? [];
        if (ids.length === 0) throw new AppError(400, "INVALID_Q4D", "Câu 4D: phải chọn ít nhất một quy cách.");
        for (const id of ids) {
          const size = group.packageSizes.find((p) => p.id === id);
          if (!size) throw new AppError(400, "INVALID_Q4D", "Câu 4D: quy cách không hợp lệ cho nhóm hàng này.");
          detailRows.push({ productGroupId: groupId, detailType: "PACKAGE_SIZE", optionKey: "SIZE", packageSizeId: size.id, labelSnapshot: size.label });
        }
      } else if (factorKey === "PRODUCT_TYPE") {
        const ids = detail.productTypeIds ?? [];
        if (ids.length === 0) throw new AppError(400, "INVALID_Q4E", "Câu 4E: phải chọn ít nhất một loại sản phẩm.");
        for (const id of ids) {
          const type = group.productTypes.find((p) => p.id === id);
          if (!type) throw new AppError(400, "INVALID_Q4E", "Câu 4E: loại sản phẩm không hợp lệ cho nhóm hàng này.");
          detailRows.push({ productGroupId: groupId, detailType: "PRODUCT_TYPE", optionKey: "TYPE", productTypeId: type.id, labelSnapshot: type.name });
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.surveyGroupChoice.deleteMany({ where: { sessionId } });
    await tx.surveyChangeFactor.deleteMany({ where: { sessionId } });
    await tx.surveyDetailChoice.deleteMany({ where: { sessionId } });

    if (input.q1.exclusive) {
      await tx.surveyGroupChoice.create({ data: { sessionId, questionKey: "Q1", productGroupId: null, isExclusiveChoice: true } });
    } else {
      for (const id of input.q1.productGroupIds) {
        await tx.surveyGroupChoice.create({ data: { sessionId, questionKey: "Q1", productGroupId: id } });
      }
      if (q2.exclusive) {
        await tx.surveyGroupChoice.create({ data: { sessionId, questionKey: "Q2", productGroupId: null, isExclusiveChoice: true } });
      } else {
        for (const id of q2.productGroupIds) {
          await tx.surveyGroupChoice.create({ data: { sessionId, questionKey: "Q2", productGroupId: id } });
        }
      }
    }

    for (const [groupId, { factors }] of Object.entries(q3)) {
      for (const factorKey of factors) {
        await tx.surveyChangeFactor.create({ data: { sessionId, productGroupId: groupId, factorKey: factorKey as never } });
      }
    }

    for (const row of detailRows) {
      await tx.surveyDetailChoice.create({
        data: {
          sessionId,
          productGroupId: row.productGroupId,
          detailType: row.detailType as never,
          optionKey: row.optionKey,
          brandId: row.brandId,
          packageSizeId: row.packageSizeId,
          productTypeId: row.productTypeId,
          labelSnapshot: row.labelSnapshot,
        },
      });
    }
  });

  return { ok: true };
}

export async function completeSurveySession(sessionId: string, giftId: string, completedAt: Date = new Date()) {
  const session = await prisma.surveySession.findUnique({ where: { id: sessionId }, include: { groupChoices: true } });
  if (!session) throw new AppError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên khảo sát.");
  if (session.groupChoices.length === 0) {
    throw new AppError(400, "SESSION_EMPTY", "Phiên khảo sát chưa có câu trả lời nào.");
  }
  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.isActive) {
    throw new AppError(400, "INVALID_GIFT", "Quà tặng không hợp lệ hoặc đã ngừng áp dụng.");
  }
  return prisma.surveySession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt, giftId: gift.id, giftNameSnapshot: gift.name },
  });
}

export async function checkDuplicateRespondent(shopId: string, campaignId: string | null, phoneHash: string) {
  const existing = await prisma.surveySession.findFirst({
    where: {
      shopId,
      campaignId,
      status: "COMPLETED",
      respondent: { phoneNormalizedHash: phoneHash },
    },
  });
  return Boolean(existing);
}
