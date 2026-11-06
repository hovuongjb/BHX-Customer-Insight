import { z } from "zod";

export const factorKeySchema = z.enum(["PRICE", "PROMOTION", "BRAND", "PACKAGE_SIZE", "PRODUCT_TYPE", "OTHER", "NONE"]);

export const q4DetailSchema = z.object({
  optionKey: z.string().optional(),
  optionKeys: z.array(z.string()).optional(),
  brandSelections: z
    .array(z.object({ brandId: z.string().optional(), optionKey: z.string().optional() }))
    .optional(),
  packageSizeIds: z.array(z.string()).optional(),
  productTypeIds: z.array(z.string()).optional(),
});

export const surveyAnswersSchema = z.object({
  q1: z.object({
    productGroupIds: z.array(z.string()),
    exclusive: z.boolean(),
  }),
  q2: z
    .object({
      productGroupIds: z.array(z.string()),
      exclusive: z.boolean(),
    })
    .optional(),
  q3: z.record(z.string(), z.object({ factors: z.array(factorKeySchema) })).optional(),
  q4: z.record(z.string(), z.record(z.string(), q4DetailSchema)).optional(),
});

export type SurveyAnswersInput = z.infer<typeof surveyAnswersSchema>;
