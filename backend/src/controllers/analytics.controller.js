import {
  getModelUsageDetails,
  getUsageDashboard,
} from "../services/modelUsage.service.js";

function getUserId(req) {
  // Demo fallback only. Replace with req.user.sub after Cognito middleware is added.
  return req.user?.sub || req.user?.id || req.header("x-user-id");
}

export async function getUsageDashboardController(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User identity is required" });
    }

    const period = ["7d", "30d", "90d", "all"].includes(req.query.period)
      ? req.query.period
      : "30d";
    const data = await getUsageDashboard({ userId, period });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getModelUsageDetailsController(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User identity is required" });
    }

    const period = ["7d", "30d", "90d", "all"].includes(req.query.period)
      ? req.query.period
      : "30d";
    const data = await getModelUsageDetails({
      userId,
      modelId: req.params.modelId,
      period,
    });

    if (!data) {
      return res.status(404).json({ success: false, message: "No usage found for this model" });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
