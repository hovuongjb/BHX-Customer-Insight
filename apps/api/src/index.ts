import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./lib/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { publicRouter } from "./routes/public.routes";
import { surveyRouter } from "./routes/survey.routes";
import { shopsRouter } from "./routes/shops.routes";
import { regionsRouter } from "./routes/regions.routes";
import { usersRouter } from "./routes/users.routes";
import { qrRouter } from "./routes/qr.routes";
import { campaignsRouter } from "./routes/campaigns.routes";
import { catalogRouter } from "./routes/catalog.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { adminRouter } from "./routes/admin.routes";
import { questionsRouter } from "./routes/questions.routes";

const app = express();

// The web app (a separate origin/port, in dev and typically in prod too) legitimately
// embeds images served from here (QR codes, posters), so resources must be readable
// cross-origin; Helmet's "same-origin" CORP default would silently block <img> loads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const publicLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });
app.use("/api/public", publicLimiter, publicRouter);

app.use("/api/auth", authRouter);
app.use("/api/survey", surveyRouter);
app.use("/api/shops", shopsRouter);
app.use("/api/regions", regionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/qr", qrRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/questions", questionsRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`BHX Customer Insight API listening on port ${env.port}`);
});
