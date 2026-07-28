export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: unknown;

  constructor(statusCode: number, message: string, errorCode = "INTERNAL_ERROR", details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized access") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }
}
