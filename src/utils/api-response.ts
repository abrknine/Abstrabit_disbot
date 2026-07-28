import type { Response } from "express";

export class ApiResponse {
  static success<T>(res: Response, data: T, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
