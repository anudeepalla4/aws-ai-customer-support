import { Router } from "express";
import {
  getModelUsageDetailsController,
  getUsageDashboardController,
} from "../controllers/analytics.controller.js";

const router = Router();

// GET /api/analytics/usage?period=7d|30d|90d|all
router.get("/usage", getUsageDashboardController);

// GET /api/analytics/usage/:modelId?period=7d|30d|90d|all
router.get("/usage/:modelId", getModelUsageDetailsController);

export default router;
