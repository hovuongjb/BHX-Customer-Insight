import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAuthToken, type AuthTokenPayload } from "../lib/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Chưa đăng nhập." } });
  }
  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." } });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Không có quyền thực hiện hành động này." } });
    }
    next();
  };
}

/** Double-submit CSRF check for cookie-authenticated mutating requests. */
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.header("x-csrf-token");
  const cookieToken = req.cookies?.csrfToken;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: { code: "CSRF_INVALID", message: "Thiếu hoặc sai CSRF token." } });
  }
  next();
}
