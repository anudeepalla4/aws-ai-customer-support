import { randomUUID } from "node:crypto";
import ModelUsage from "../models/ModelUsage.js";

const toNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/**
 * Persist one completed Bedrock model invocation.
 * Call this once per successful model invocation (including each model in a comparison).
 * Pass the usage and cost returned/calculated by the existing Bedrock service.
 */
export async function recordModelUsage({
  userId,
  conversationId = null,
  modelId,
  modelName,
  usage = {},
  cost = null,
  operation = "chat",
  requestId = randomUUID(),
}) {
  if (!userId || !modelId) {
    throw new Error("userId and modelId are required to record model usage");
  }

  const inputTokens = toNonNegativeNumber(usage.inputTokens);
  const outputTokens = toNonNegativeNumber(usage.outputTokens);
  const totalTokens = toNonNegativeNumber(
    usage.totalTokens ?? inputTokens + outputTokens
  );
  const costKnown = Boolean(cost && Number.isFinite(Number(cost.totalCost)));

  return ModelUsage.create({
    userId: String(userId),
    conversationId: conversationId || null,
    modelId,
    modelName: modelName || modelId,
    operation: operation === "comparison" ? "comparison" : "chat",
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost: costKnown ? toNonNegativeNumber(cost.inputCost) : 0,
    outputCost: costKnown ? toNonNegativeNumber(cost.outputCost) : 0,
    totalCost: costKnown ? toNonNegativeNumber(cost.totalCost) : 0,
    costKnown,
    requestId,
  });
}

export function getPeriodStart(period = "30d") {
  if (period === "all") return null;
  const daysByPeriod = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysByPeriod[period] || 30;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

function baseMatch(userId, startDate) {
  const match = { userId: String(userId) };
  if (startDate) match.createdAt = { $gte: startDate };
  return match;
}

const sumFields = {
  inputTokens: { $sum: "$inputTokens" },
  outputTokens: { $sum: "$outputTokens" },
  totalTokens: { $sum: "$totalTokens" },
  totalCost: { $sum: "$totalCost" },
  totalRequests: { $sum: 1 },
  costKnownRequests: { $sum: { $cond: ["$costKnown", 1, 0] } },
};

export async function getUsageDashboard({ userId, period = "30d" }) {
  const startDate = getPeriodStart(period);
  const match = baseMatch(userId, startDate);

  const [summaryRows, modelBreakdown, dailyTrend] = await Promise.all([
    ModelUsage.aggregate([
      { $match: match },
      { $group: { _id: null, ...sumFields } },
    ]),
    ModelUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: { modelId: "$modelId", modelName: "$modelName" },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$totalCost" },
          totalRequests: { $sum: 1 },
          costKnownRequests: { $sum: { $cond: ["$costKnown", 1, 0] } },
        },
      },
      { $sort: { totalCost: -1, totalTokens: -1 } },
      {
        $project: {
          _id: 0,
          modelId: "$_id.modelId",
          modelName: "$_id.modelName",
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 1,
          totalCost: 1,
          totalRequests: 1,
          costKnownRequests: 1,
        },
      },
    ]),
    ModelUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$totalCost" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 1,
          totalCost: 1,
        },
      },
    ]),
  ]);

  const summary = summaryRows[0] || {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
    costKnownRequests: 0,
  };

  return {
    period,
    currency: "USD",
    summary: {
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      totalTokens: summary.totalTokens,
      totalCost: summary.totalCost,
      totalRequests: summary.totalRequests,
      modelsUsed: modelBreakdown.length,
      costKnownRequests: summary.costKnownRequests,
      costCoveragePercent: summary.totalRequests
        ? Number(((summary.costKnownRequests / summary.totalRequests) * 100).toFixed(1))
        : 100,
    },
    modelBreakdown: modelBreakdown.map((model) => ({
      ...model,
      costCoveragePercent: model.totalRequests
        ? Number(((model.costKnownRequests / model.totalRequests) * 100).toFixed(1))
        : 100,
    })),
    dailyTrend,
  };
}

export async function getModelUsageDetails({ userId, modelId, period = "30d" }) {
  const startDate = getPeriodStart(period);
  const match = { ...baseMatch(userId, startDate), modelId };
  const [rows, dailyTrend] = await Promise.all([
    ModelUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          modelName: { $last: "$modelName" },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$totalCost" },
          totalRequests: { $sum: 1 },
          costKnownRequests: { $sum: { $cond: ["$costKnown", 1, 0] } },
        },
      },
    ]),
    ModelUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$totalCost" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", inputTokens: 1, outputTokens: 1, totalTokens: 1, totalCost: 1 } },
    ]),
  ]);

  if (!rows.length) return null;
  const row = rows[0];
  return {
    period,
    currency: "USD",
    modelId,
    modelName: row.modelName || modelId,
    summary: {
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalTokens: row.totalTokens,
      totalCost: row.totalCost,
      totalRequests: row.totalRequests,
      costCoveragePercent: row.totalRequests
        ? Number(((row.costKnownRequests / row.totalRequests) * 100).toFixed(1))
        : 100,
    },
    dailyTrend,
  };
}
