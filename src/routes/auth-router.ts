import { Router } from "express";
import { login, me } from "../controllers/auth-controller";
import { adminAuth } from "../middlewares/admin-auth";
import { asyncHandler } from "../utils/async-handler";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", adminAuth, asyncHandler(me));
