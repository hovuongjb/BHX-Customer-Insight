import path from "node:path";
import dotenv from "dotenv";

// In docker, env vars are injected directly and take precedence over the .env file.
// process.cwd() is the apps/api directory whether run via npm scripts or Docker.
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  phoneHashSecret: required("PHONE_HASH_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  publicSurveyBaseUrl: process.env.PUBLIC_SURVEY_BASE_URL ?? "http://localhost:5173",
};
