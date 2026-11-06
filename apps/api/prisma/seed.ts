import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { hashPhone, last4 } from "../src/lib/phone";
import { generateQrToken } from "../src/lib/qrToken";
import { saveSurveyAnswers, completeSurveySession } from "../src/services/survey";
import type { SurveyAnswersInput } from "../src/services/surveyAnswers.schema";
import shopData from "./data/shops.json";

const SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Đặng", "Bùi", "Đỗ"];
const GIVEN_NAMES = ["Văn An", "Thị Bình", "Minh Châu", "Thanh Hà", "Gia Huy", "Ngọc Lan", "Hữu Nam", "Thu Trang", "Quốc Việt", "Mỹ Duyên"];
const PHONE_PREFIXES = ["090", "093", "097", "098", "086", "088", "032", "035", "070", "079"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const n = Math.min(arr.length, Math.max(min, Math.floor(Math.random() * (max - min + 1)) + min));
  return shuffled.slice(0, n);
}
function randomPhone(): string {
  const prefix = randomItem(PHONE_PREFIXES);
  const rest = Math.floor(1_000_000 + Math.random() * 9_000_000).toString();
  return `${prefix}${rest}`;
}
function randomName(): string {
  return `${randomItem(SURNAMES)} ${randomItem(GIVEN_NAMES)}`;
}

async function main() {
  console.log("Seeding BHX Customer Insight demo data...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Real shop list + QLTP (direct area supervisor) assignment, imported from
  // "DS shop.xlsx" on 2026-11-06. Each QLTP maps 1:1 to a Region so the existing
  // RBAC/dashboard-by-region model applies to real QLTP groupings without a schema
  // change — Region.name is literally the QLTP's name (see 07-ke-hoach-trien-khai.md
  // assumptions).
  await prisma.region.createMany({ data: shopData.regions });
  const regions = await prisma.region.findMany();
  const regionIdByName = new Map(regions.map((r) => [r.name, r.id]));

  await prisma.shop.createMany({
    data: shopData.shops.map((s) => ({
      code: s.code,
      name: s.name,
      regionId: regionIdByName.get(s.qltp)!,
    })),
  });
  const shops = await prisma.shop.findMany();
  const shopByCode = new Map(shops.map((s) => [s.code, s]));

  const admin = await prisma.user.create({
    data: { email: "admin@bhx.local", passwordHash, fullName: "Quản trị Pilot", role: "ADMIN" },
  });

  // One REGION_MANAGER demo account per QLTP, named after that QLTP for clarity.
  for (const region of regions) {
    const emailSlug = region.code.replace("QLTP-", "").toLowerCase();
    await prisma.user.create({
      data: { email: `qltp.${emailSlug}@bhx.local`, passwordHash, fullName: `QLTP ${region.name}`, role: "REGION_MANAGER", regionId: region.id },
    });
  }

  // A handful of demo SHOP_MANAGER/STAFF accounts spread across different QLTP groups,
  // using real shop codes, for testing the staff survey flow and shop-scoped QR/dashboard.
  const demoShopCodes = ["30051", "30264", "28260", "30037", "30053"];
  for (const code of demoShopCodes) {
    const shop = shopByCode.get(code);
    if (!shop) continue;
    await prisma.user.create({
      data: { email: `manager.${code}@bhx.local`, passwordHash, fullName: `Quản lý ${shop.name}`, role: "SHOP_MANAGER", shopId: shop.id },
    });
    await prisma.user.create({
      data: { email: `staff.${code}@bhx.local`, passwordHash, fullName: `Nhân viên ${shop.name}`, role: "STAFF", shopId: shop.id },
    });
  }

  const groupDefs = [
    { code: "RICE", name: "Gạo", displayOrder: 1, brands: ["A An", "Vua Gạo", "Lộc Trời", "Ông Cua", "Cỏ May"], sizes: ["2kg", "5kg", "10kg", "25kg", "Khác"], types: ["Gạo dẻo thơm", "Gạo mềm", "Gạo khô/xốp", "Gạo lứt", "Gạo cao cấp", "Gạo giá tiết kiệm"] },
    { code: "NOODLE", name: "Mì ăn liền", displayOrder: 2, brands: ["Hảo Hảo", "Omachi", "3 Miền", "Kokomi", "Cung Đình"], sizes: ["Gói lẻ", "Lốc", "Thùng", "Ly/tô", "Khác"], types: ["Mì tôm chua cay", "Mì không cay", "Mì trộn", "Mì khoai tây", "Mì ly/tô", "Mì cao cấp"] },
    { code: "OIL", name: "Dầu ăn", displayOrder: 3, brands: ["Neptune", "Simply", "Tường An", "Meizan", "Cái Lân"], sizes: ["400–500ml", "1 lít", "2 lít", "5 lít", "Khác"], types: ["Dầu đậu nành", "Dầu hướng dương", "Dầu gạo", "Dầu ô liu", "Dầu thực vật pha trộn"] },
    { code: "FISH_SAUCE", name: "Nước mắm", displayOrder: 4, brands: ["Nam Ngư", "CHIN-SU", "Đệ Nhị", "Liên Thành", "Hạnh Phúc"], sizes: ["500ml", "750–900ml", "1 lít", "Trên 1 lít", "Khác"], types: ["Nước mắm truyền thống", "Nước mắm pha chế", "Nước mắm độ đạm cao", "Nước mắm ít mặn", "Nước mắm phổ thông giá tốt"] },
  ];

  const productGroups = [];
  for (const def of groupDefs) {
    const group = await prisma.productGroup.create({ data: { code: def.code, name: def.name, displayOrder: def.displayOrder } });
    const brands = [];
    for (const [i, name] of def.brands.entries()) brands.push(await prisma.brand.create({ data: { productGroupId: group.id, name, displayOrder: i } }));
    const sizes = [];
    for (const [i, label] of def.sizes.entries()) sizes.push(await prisma.packageSize.create({ data: { productGroupId: group.id, label, displayOrder: i } }));
    const types = [];
    for (const [i, name] of def.types.entries()) types.push(await prisma.productType.create({ data: { productGroupId: group.id, name, displayOrder: i } }));
    productGroups.push({ group, brands, sizes, types });
  }

  const questionLabels: Record<string, string> = {
    Q1: "Trong 4 nhóm hàng sau, nhóm nào anh/chị thường mua ở nơi khác thay vì BHX?",
    Q2: "Trong những nhóm hàng vừa chọn, anh/chị muốn BHX cải thiện nhóm nào để chuyển sang mua tại đây?",
    Q3: "BHX cần thay đổi những điều gì để anh/chị chuyển sang mua nhóm hàng này tại BHX?",
    Q4A: "Giá tại BHX cần như thế nào so với nơi anh/chị đang mua?",
    Q4B: "Anh/chị thích hình thức khuyến mãi nào?",
    Q4C: "Anh/chị muốn BHX có thêm hoặc luôn có sẵn những nhãn hiệu nào?",
    Q4D: "Gói/chai/bao có quy cách nào phù hợp với anh/chị?",
    Q4E: "Anh/chị muốn BHX có thêm loại sản phẩm nào?",
  };
  for (const [questionKey, labelText] of Object.entries(questionLabels)) {
    await prisma.surveyQuestionConfig.create({
      data: { questionKey: questionKey as never, version: 1, labelText, createdById: admin.id },
    });
  }
  const q4aConfig = await prisma.surveyQuestionConfig.findFirstOrThrow({ where: { questionKey: "Q4A" } });
  const q4aOptions = [
    ["SAME", "Bằng giá nơi đang mua"],
    ["LOWER_5", "Thấp hơn dưới 5%"],
    ["LOWER_5_10", "Thấp hơn 5–10%"],
    ["LOWER_10", "Thấp hơn trên 10%"],
    ["UNKNOWN", "Không rõ"],
  ];
  for (const [i, [optionKey, labelText]] of q4aOptions.entries()) {
    await prisma.surveyOptionConfig.create({ data: { questionConfigId: q4aConfig.id, optionKey, labelText, displayOrder: i } });
  }
  const q4bConfig = await prisma.surveyQuestionConfig.findFirstOrThrow({ where: { questionKey: "Q4B" } });
  const q4bOptions = [
    ["DIRECT_DISCOUNT", "Giảm giá trực tiếp"],
    ["BUY_MORE_DISCOUNT", "Mua nhiều giảm giá"],
    ["BUY_GET", "Mua hàng tặng hàng"],
    ["VOUCHER", "Tặng voucher"],
    ["LOYALTY_POINTS", "Tích điểm/đổi quà"],
  ];
  for (const [i, [optionKey, labelText]] of q4bOptions.entries()) {
    await prisma.surveyOptionConfig.create({ data: { questionConfigId: q4bConfig.id, optionKey, labelText, displayOrder: i } });
  }

  // Fixed-key options: labels are admin-editable, keys are wired into survey logic.
  const fixedOptions: Record<string, [string, string, boolean][]> = {
    Q1: [["NONE", "Không có – tôi thường mua cả 4 nhóm tại BHX", true]],
    Q2: [["NONE", "Chưa muốn chuyển nhóm nào", true]],
    Q3: [
      ["PRICE", "Giá bán tốt hơn", false],
      ["PROMOTION", "Khuyến mãi hấp dẫn hơn", false],
      ["BRAND", "Có nhãn hiệu quen dùng", false],
      ["PACKAGE_SIZE", "Có dung tích/quy cách phù hợp", false],
      ["PRODUCT_TYPE", "Có đúng loại sản phẩm cần mua", false],
      ["OTHER", "Yếu tố khác", false],
      ["NONE", "Không có thay đổi nào khiến tôi chuyển sang BHX", true],
    ],
    Q4C: [
      ["OTHER", "Nhãn hiệu khác", false],
      ["NOT_IMPORTANT", "Không quan trọng nhãn hiệu", true],
    ],
  };
  for (const [questionKey, opts] of Object.entries(fixedOptions)) {
    const config = await prisma.surveyQuestionConfig.findFirstOrThrow({ where: { questionKey: questionKey as never } });
    for (const [i, [optionKey, labelText, isExclusive]] of opts.entries()) {
      await prisma.surveyOptionConfig.create({ data: { questionConfigId: config.id, optionKey, labelText, displayOrder: i, isExclusive } });
    }
  }

  const giftDefs = [
    { name: "Bột canh Natafoods 250g", packageInfo: "Gói 250g", priceVnd: 5300, imageUrl: "/gifts/bot-canh-natafoods-250g.jpg" },
    { name: "Bột canh I-ốt Vifon 200g", packageInfo: "Gói 200g", priceVnd: 6600, imageUrl: "/gifts/bot-canh-i-ot-vifon-200g.jpg" },
    { name: "Bột canh tôm Vifon 200g", packageInfo: "Gói 200g", priceVnd: 6600, imageUrl: "/gifts/bot-canh-tom-vifon-200g.jpg" },
    { name: "Gia vị cá kho Knorr 28g", packageInfo: "Gói 28g", priceVnd: 7400, note: "4 Tặng 1 Giá Trị Nhỏ Nhất", imageUrl: "/gifts/gia-vi-ca-kho-knorr-28g.jpg" },
    { name: "Gia vị thịt kho Knorr 28g", packageInfo: "Gói 28g", priceVnd: 7400, note: "4 Tặng 1 Giá Trị Nhỏ Nhất", imageUrl: "/gifts/gia-vi-thit-kho-knorr-28g.jpg" },
    { name: "Gia vị nấu canh chua Knorr 30g", packageInfo: "Gói 30g", priceVnd: 7400, note: "4 Tặng 1 Giá Trị Nhỏ Nhất", imageUrl: "/gifts/gia-vi-nau-canh-chua-knorr-30g.jpg" },
  ];
  await prisma.gift.createMany({ data: giftDefs.map((g, i) => ({ ...g, displayOrder: i })) });
  const gifts = await prisma.gift.findMany({ orderBy: { displayOrder: "asc" } });

  const campaign = await prisma.surveyCampaign.create({
    data: { name: "Chiến dịch Pilot Q4/2026", startDate: new Date("2026-10-01"), isActive: true, createdById: admin.id },
  });

  await prisma.shopQrCode.createMany({
    data: shops.map((shop) => ({ shopId: shop.id, token: generateQrToken(), createdById: admin.id })),
  });

  const factorPool = ["PRICE", "PROMOTION", "BRAND", "PACKAGE_SIZE", "PRODUCT_TYPE", "OTHER"] as const;

  function buildRandomAnswers(): SurveyAnswersInput {
    if (Math.random() < 0.12) {
      return { q1: { productGroupIds: [], exclusive: true } };
    }
    const q1Groups = randomSubset(productGroups, 1, 3);
    if (Math.random() < 0.08) {
      return { q1: { productGroupIds: q1Groups.map((g) => g.group.id), exclusive: false }, q2: { productGroupIds: [], exclusive: true } };
    }
    const q2Groups = randomSubset(q1Groups, 1, q1Groups.length);
    const q3: SurveyAnswersInput["q3"] = {};
    const q4: SurveyAnswersInput["q4"] = {};

    for (const g of q2Groups) {
      const none = Math.random() < 0.1;
      const factors = none ? ["NONE" as const] : randomSubset([...factorPool], 1, 3);
      q3![g.group.id] = { factors };
      if (none) continue;

      q4![g.group.id] = {};
      for (const factor of factors) {
        if (factor === "NONE" || factor === "OTHER") continue;
        if (factor === "PRICE") {
          q4![g.group.id]!.PRICE = { optionKey: randomItem(q4aOptions)[0] };
        } else if (factor === "PROMOTION") {
          q4![g.group.id]!.PROMOTION = { optionKeys: randomSubset(q4bOptions.map((o) => o[0]), 1, 3) };
        } else if (factor === "BRAND") {
          const roll = Math.random();
          q4![g.group.id]!.BRAND =
            roll < 0.1
              ? { brandSelections: [{ optionKey: "NOT_IMPORTANT" }] }
              : roll < 0.2
                ? { brandSelections: [{ optionKey: "OTHER" }] }
                : { brandSelections: randomSubset(g.brands, 1, 2).map((b) => ({ brandId: b.id })) };
        } else if (factor === "PACKAGE_SIZE") {
          q4![g.group.id]!.PACKAGE_SIZE = { packageSizeIds: randomSubset(g.sizes, 1, 2).map((s) => s.id) };
        } else if (factor === "PRODUCT_TYPE") {
          q4![g.group.id]!.PRODUCT_TYPE = { productTypeIds: randomSubset(g.types, 1, 2).map((t) => t.id) };
        }
      }
    }
    return { q1: { productGroupIds: q1Groups.map((g) => g.group.id), exclusive: false }, q2: { productGroupIds: q2Groups.map((g) => g.group.id), exclusive: false }, q3, q4 };
  }

  const staffUsers = await prisma.user.findMany({ where: { role: "STAFF" } });
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const demoShops = demoShopCodes.map((code) => shopByCode.get(code)!).filter(Boolean);
  // Concentrate synthetic activity on a random subset of real shops (plus the demo
  // ones) rather than spreading 180 sessions across all 364 — keeps per-shop demo
  // dashboard numbers meaningful instead of ~0-1 session each.
  const qrShopPool = [...new Set([...demoShops, ...randomSubset(shops, 35, 35)])];

  for (let i = 0; i < 180; i++) {
    const isQr = Math.random() < 0.7;
    // STAFF-sourced sessions must use a shop that actually has a staff account,
    // and that account must belong to the same shop (the real flow derives shopId
    // from the logged-in staff user, never picks it independently).
    const staffUser = isQr ? undefined : randomItem(staffUsers);
    const shop = isQr ? randomItem(qrShopPool) : shopById.get(staffUser!.shopId!)!;
    const willComplete = Math.random() < 0.85;

    let respondentId: string | undefined;
    let isDuplicate = false;
    if (isQr) {
      const phone = Math.random() < 0.05 ? "0901234567" : randomPhone();
      const normalized = phone;
      const phoneHash = hashPhone(normalized);
      isDuplicate = await prisma.surveySession
        .findFirst({ where: { shopId: shop.id, campaignId: campaign.id, status: "COMPLETED", respondent: { phoneNormalizedHash: phoneHash } } })
        .then(Boolean);
      const respondent = await prisma.surveyRespondent.create({
        data: { fullName: randomName(), phoneNormalizedHash: phoneHash, phoneLast4: last4(normalized) },
      });
      await prisma.privacyConsent.create({ data: { respondentId: respondent.id, consentGiven: true, consentTextVersion: "v1-2026-11-06" } });
      respondentId = respondent.id;
    }

    const startedAt = new Date(Date.now() - Math.floor(Math.random() * 20) * 86_400_000);
    const session = await prisma.surveySession.create({
      data: {
        shopId: shop.id,
        campaignId: campaign.id,
        source: isQr ? "QR" : "STAFF",
        respondentId,
        staffUserId: isQr ? undefined : staffUser!.id,
        isDuplicate,
        startedAt,
      },
    });

    try {
      await saveSurveyAnswers(session.id, buildRandomAnswers());
      if (willComplete) {
        const completedAt = new Date(startedAt.getTime() + (60 + Math.random() * 240) * 1000);
        await completeSurveySession(session.id, randomItem(gifts).id, completedAt);
      } else if (Math.random() < 0.5) {
        await prisma.surveySession.update({ where: { id: session.id }, data: { status: "ABANDONED" } });
      }
    } catch (err) {
      console.warn("Skip one synthetic session due to validation:", (err as Error).message);
    }
  }

  console.log("Seed hoàn tất:", shops.length, "siêu thị thực tế,", regions.length, "QLTP.");
  console.log("Đăng nhập demo (mật khẩu Password123!):");
  console.log("  admin@bhx.local — ADMIN");
  console.log("  qltp.<ten-qltp>@bhx.local — REGION_MANAGER (vd: qltp.anhtuan@bhx.local)");
  console.log(`  manager.<ma-st>@bhx.local / staff.<ma-st>@bhx.local — vd: manager.${demoShopCodes[0]}@bhx.local`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
