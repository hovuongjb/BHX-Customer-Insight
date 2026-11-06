export type Role = "ADMIN" | "REGION_MANAGER" | "SHOP_MANAGER" | "STAFF";

export interface CurrentUser {
  id: string;
  fullName: string;
  role: Role;
  shopId: string | null;
  regionId: string | null;
}

export interface CatalogItem {
  id: string;
  name?: string;
  label?: string;
  displayOrder: number;
}

export interface ProductGroupConfig {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  brands: CatalogItem[];
  packageSizes: CatalogItem[];
  productTypes: CatalogItem[];
}

export interface QuestionOption {
  id: string;
  optionKey: string;
  labelText: string;
  displayOrder: number;
  isExclusive: boolean;
}

export interface QuestionConfig {
  questionKey: string;
  version: number;
  labelText: string;
  options: QuestionOption[];
}

export interface GiftOption {
  id: string;
  name: string;
  packageInfo: string;
  priceVnd: number;
  note: string | null;
  imageUrl: string;
  displayOrder: number;
}

export interface SurveyConfigBundle {
  questions: QuestionConfig[];
  productGroups: ProductGroupConfig[];
  gifts: GiftOption[];
  versionSnapshot: Record<string, number>;
}

export type FactorKey = "PRICE" | "PROMOTION" | "BRAND" | "PACKAGE_SIZE" | "PRODUCT_TYPE" | "OTHER" | "NONE";

export const FACTOR_LABELS: Record<FactorKey, string> = {
  PRICE: "Giá bán tốt hơn",
  PROMOTION: "Khuyến mãi hấp dẫn hơn",
  BRAND: "Có nhãn hiệu quen dùng",
  PACKAGE_SIZE: "Có dung tích/quy cách phù hợp",
  PRODUCT_TYPE: "Có đúng loại sản phẩm cần mua",
  OTHER: "Yếu tố khác",
  NONE: "Không có thay đổi nào khiến tôi chuyển sang BHX",
};

export interface BrandSelection {
  brandId?: string;
  optionKey?: "OTHER" | "NOT_IMPORTANT";
}

export interface Q4Detail {
  optionKey?: string;
  optionKeys?: string[];
  brandSelections?: BrandSelection[];
  packageSizeIds?: string[];
  productTypeIds?: string[];
}

export interface SurveyAnswersPayload {
  q1: { productGroupIds: string[]; exclusive: boolean };
  q2?: { productGroupIds: string[]; exclusive: boolean };
  q3?: Record<string, { factors: FactorKey[] }>;
  q4?: Record<string, Record<string, Q4Detail>>;
}
