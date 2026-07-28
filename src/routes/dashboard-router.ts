import { Router } from "express";
import {
  getStats,
  listConfig,
  listInteractions,
  updateConfig,
} from "../controllers/dashboard-controller";
import { adminAuth } from "../middlewares/admin-auth";
import { asyncHandler } from "../utils/async-handler";

export const dashboardRouter = Router();

dashboardRouter.use(adminAuth);
dashboardRouter.get("/interactions", asyncHandler(listInteractions));
dashboardRouter.get("/stats", asyncHandler(getStats));
dashboardRouter.get("/config", asyncHandler(listConfig));
dashboardRouter.put("/config/:command", asyncHandler(updateConfig));
