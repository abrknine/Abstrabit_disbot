import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { apiLogger } from "../utils/logger";

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.errorCode, message: err.message, details: err.details },
    });
  }

  apiLogger.error({ err }, "unhandled error");
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: null },
  });
};
