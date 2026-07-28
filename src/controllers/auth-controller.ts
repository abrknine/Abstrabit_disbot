import type { Request, Response } from "express";
import { issueToken, verifyCredentials } from "../services/auth/auth-service";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response";
import { loginSchema } from "../validators/auth.schema";

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid login payload", parsed.error.flatten());
  }

  const { email, password } = parsed.data;
  const user = await verifyCredentials(email, password);
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  ApiResponse.success(res, { token: issueToken(user), email: user.email });
};

export const me = async (req: Request, res: Response) => {
  ApiResponse.success(res, { email: req.admin?.email });
};
