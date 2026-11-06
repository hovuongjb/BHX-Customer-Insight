import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole, requireCsrf } from "../middleware/auth";

export const catalogRouter = Router();
catalogRouter.use(requireAuth, requireRole("ADMIN"));

catalogRouter.get(
  "/product-groups",
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.productGroup.findMany({ orderBy: { displayOrder: "asc" } }) });
  })
);

catalogRouter.patch(
  "/product-groups/:id",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string().trim().min(1) }).parse(req.body);
    res.json(await prisma.productGroup.update({ where: { id: req.params.id }, data: { name: body.name } }));
  })
);

const catalogItemSchema = z.object({
  productGroupId: z.string(),
  label: z.string().min(1),
  displayOrder: z.number().int().default(0),
});

function makeCrud<T extends "brand" | "packageSize" | "productType">(model: T, nameField: "name" | "label") {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      // @ts-expect-error -- generic delegate access across the three similar models
      res.json({ data: await prisma[model].findMany({ orderBy: [{ productGroupId: "asc" }, { displayOrder: "asc" }] }) });
    })
  );

  router.post(
    "/",
    requireCsrf,
    asyncHandler(async (req, res) => {
      const body = catalogItemSchema.parse(req.body);
      const data = { productGroupId: body.productGroupId, displayOrder: body.displayOrder, [nameField]: body.label };
      // @ts-expect-error -- generic delegate access across the three similar models
      res.status(201).json(await prisma[model].create({ data }));
    })
  );

  router.patch(
    "/:id",
    requireCsrf,
    asyncHandler(async (req, res) => {
      const body = z.object({ label: z.string().min(1).optional(), displayOrder: z.number().int().optional(), isActive: z.boolean().optional() }).parse(req.body);
      const data: Record<string, unknown> = { displayOrder: body.displayOrder, isActive: body.isActive };
      if (body.label) data[nameField] = body.label;
      // @ts-expect-error -- generic delegate access across the three similar models
      res.json(await prisma[model].update({ where: { id: req.params.id }, data }));
    })
  );

  return router;
}

catalogRouter.use("/brands", makeCrud("brand", "name"));
catalogRouter.use("/package-sizes", makeCrud("packageSize", "label"));
catalogRouter.use("/product-types", makeCrud("productType", "name"));

const giftRouter = Router();

giftRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.gift.findMany({ orderBy: { displayOrder: "asc" } }) });
  })
);

const giftSchema = z.object({
  name: z.string().min(1),
  packageInfo: z.string().min(1),
  priceVnd: z.number().int().nonnegative(),
  note: z.string().optional(),
  imageUrl: z.string().min(1),
  displayOrder: z.number().int().default(0),
});

giftRouter.post(
  "/",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = giftSchema.parse(req.body);
    res.status(201).json(await prisma.gift.create({ data: body }));
  })
);

giftRouter.patch(
  "/:id",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const body = giftSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    res.json(await prisma.gift.update({ where: { id: req.params.id }, data: body }));
  })
);

catalogRouter.use("/gifts", giftRouter);
