// End-to-end smoke test against a RUNNING API (default http://localhost:4000) with SEEDED data.
// Usage: node scripts/smoke-test.mjs [apiBase]
// Needs Node >= 18 (global fetch). Writes a few rows of test data (one respondent/session pair).
const API = process.argv[2] ?? "http://localhost:4000/api";
const PASSWORD = "Password123!"; // demo password set by prisma/seed.ts

let passed = 0;
let failed = 0;
const check = (name, ok, extra = "") => {
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${extra}`}`);
};

class Client {
  cookies = {};
  async req(method, path, body, { csrf = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) headers.Cookie = cookie;
    if (csrf && this.cookies.csrfToken && method !== "GET") headers["x-csrf-token"] = this.cookies.csrfToken;
    const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies[pair.slice(0, i)] = pair.slice(i + 1);
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* csv etc. */
    }
    return { status: res.status, json, text };
  }
  login = (email, password = PASSWORD) => this.req("POST", "/auth/login", { email, password });
}

const randomPhone = () => "093" + String(Math.floor(1_000_000 + Math.random() * 9_000_000));

const anon = new Client();
const admin = new Client();
const manager = new Client();
const staff = new Client();

check("health", (await anon.req("GET", "/health")).status === 200);

// --- Authentication & RBAC ---
check("login wrong password -> 401", (await new Client().login("admin@bhx.local", "wrong")).status === 401);
check("admin login", (await admin.login("admin@bhx.local")).status === 200);
check("manager login", (await manager.login("manager.30051@bhx.local")).status === 200);
check("staff login", (await staff.login("staff.30051@bhx.local")).status === 200);
check("no login -> /admin/reports/summary 401", (await anon.req("GET", "/admin/reports/summary")).status === 401);
check("manager -> /admin/reports/summary 403", (await manager.req("GET", "/admin/reports/summary")).status === 403);
check("manager -> /questions 403", (await manager.req("GET", "/questions")).status === 403);
check("staff -> /qr 403", (await staff.req("GET", "/qr")).status === 403);
check("admin -> /admin/reports/summary 200", (await admin.req("GET", "/admin/reports/summary")).status === 200);
check("manager QR check-shop outside scope -> 403", (await manager.req("POST", "/qr/check-shop", { shopCode: "30189" })).status === 403);
check("manager QR check-shop own shop -> 200 + QLTP", (await manager.req("POST", "/qr/check-shop", { shopCode: "30051" })).json?.qltpName === "Anh Tuấn");
check("CSRF missing on mutating staff call -> 403", (await staff.req("POST", "/survey/sessions", {}, { csrf: false })).status === 403);

// --- Public QR lookup ---
const lookup = await anon.req("GET", "/public/shop-qr/30051");
check("public shop-qr valid -> 200", lookup.status === 200 && lookup.json?.shopName === "Cao Xá");
check("public shop-qr unknown -> 404", (await anon.req("GET", "/public/shop-qr/99999")).status === 404);
const token = lookup.json?.surveyUrl?.split("/s/")[1];
const info = await anon.req("GET", `/public/qr/${token}`);
check("public qr info has shop, no QLTP leak", info.status === 200 && info.json?.shopCode === "30051" && !("regionName" in info.json) && !("qltpName" in info.json));
check("invalid qr token -> 404", (await anon.req("GET", "/public/qr/not-a-real-token")).status === 404);

// --- Customer survey flow ---
const phone = randomPhone();
const cfg = (await anon.req("GET", "/public/survey-config")).json;
const [rice, noodle] = cfg.productGroups;
const gift = cfg.gifts[0];
check("survey-config has 8 questions, 4 groups, 6 gifts", cfg.questions.length === 8 && cfg.productGroups.length === 4 && cfg.gifts.length === 6);

check("invalid phone -> 400", (await anon.req("POST", "/public/sessions", { qrToken: token, respondent: { fullName: "Test", phone: "12345" }, consent: { given: true } })).status === 400);
const s1 = await anon.req("POST", "/public/sessions", { qrToken: token, respondent: { fullName: "Smoke Test", phone }, consent: { given: true } });
check("valid respondent -> 201, not duplicate", s1.status === 201 && s1.json?.isDuplicate === false);
const sid = s1.json?.sessionId;

check("Q2 group not chosen in Q1 -> 400", (await anon.req("PATCH", `/public/sessions/${sid}/answers`, { q1: { productGroupIds: [rice.id], exclusive: false }, q2: { productGroupIds: [noodle.id], exclusive: false } })).status === 400);
check("Q1 exclusive + groups together -> 400", (await anon.req("PATCH", `/public/sessions/${sid}/answers`, { q1: { productGroupIds: [rice.id], exclusive: true } })).status === 400);
const priceOpt = cfg.questions.find((q) => q.questionKey === "Q4A").options[0].optionKey;
const goodAnswers = {
  q1: { productGroupIds: [rice.id, noodle.id], exclusive: false },
  q2: { productGroupIds: [rice.id], exclusive: false },
  q3: { [rice.id]: { factors: ["PRICE"] } },
  q4: { [rice.id]: { PRICE: { optionKey: priceOpt } } },
};
check("Q4 for factor not chosen in Q3 -> 400", (await anon.req("PATCH", `/public/sessions/${sid}/answers`, { ...goodAnswers, q4: { [rice.id]: { PROMOTION: { optionKeys: ["x"] } } } })).status === 400);
check("valid answers -> 200 (idempotent, twice)", (await anon.req("PATCH", `/public/sessions/${sid}/answers`, goodAnswers)).status === 200 && (await anon.req("PATCH", `/public/sessions/${sid}/answers`, goodAnswers)).status === 200);
check("complete without gift -> 400", (await anon.req("POST", `/public/sessions/${sid}/complete`, {})).status === 400);
check("complete with bogus gift -> 400", (await anon.req("POST", `/public/sessions/${sid}/complete`, { giftId: "nope" })).status === 400);
check("complete with gift -> 200", (await anon.req("POST", `/public/sessions/${sid}/complete`, { giftId: gift.id })).status === 200);
check("edit after completion -> 409", (await anon.req("PATCH", `/public/sessions/${sid}/answers`, goodAnswers)).status === 409);

const s2 = await anon.req("POST", "/public/sessions", { qrToken: token, respondent: { fullName: "Smoke Test 2", phone }, consent: { given: true } });
check("same phone, same shop+campaign -> flagged duplicate", s2.status === 201 && s2.json?.isDuplicate === true);

// --- Admin reporting & questions ---
const summary = (await admin.req("GET", "/admin/reports/summary?shopCode=30051")).json;
check("admin summary filtered by shop returns data + Vietnamese labels", summary?.totalSessions >= 1 && summary.topFactors.every((f) => !/^[A-Z_]+$/.test(f.label)));
const list = await admin.req("GET", "/admin/reports/sessions?page=1&pageSize=5");
check("admin session list paginated", list.status === 200 && list.json.data.length === 5 && list.json.total >= 1);
const csv = await admin.req("GET", "/admin/reports/export.csv");
check("CSV export is UTF-8 text without the test phone number", csv.status === 200 && csv.text.includes("Mã ST") && !csv.text.includes(phone));
const q3 = (await admin.req("GET", "/questions")).json.data.find((q) => q.questionKey === "Q3");
check("Q3 with wrong fixed option set -> 400", (await admin.req("POST", "/questions/Q3/versions", { labelText: q3.labelText, options: [{ optionKey: "PRICE", labelText: "x" }] })).status === 400);
check("question edit without CSRF header -> 403", (await admin.req("POST", "/questions/Q4A/versions", { labelText: "x", options: [{ labelText: "a" }] }, { csrf: false })).status === 403);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
