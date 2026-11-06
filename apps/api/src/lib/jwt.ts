import jwt from "jsonwebtoken";
import { env } from "./env";
import type { Role } from "@prisma/client";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  shopId: string | null;
  regionId: string | null;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
