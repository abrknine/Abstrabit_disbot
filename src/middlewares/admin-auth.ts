import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth/auth-service";
import { ApiError } from "../utils/api-error";

export const adminAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized("Missing bearer token"));

  try {
    req.admin = { email: verifyToken(token).sub };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
};
