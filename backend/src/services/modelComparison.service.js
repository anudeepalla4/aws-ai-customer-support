import { performance } from "node:perf_hooks";

import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

import bedrockClient from "../config/bedrock.js";

import { customerSupportSystemPrompt } from "../prompts/customerSupport.prompt.js";

const getRate = (key) => {
  const value = process.env[key];

  if (!value) return null;

  const rate = Number(value);

  return Number.isFinite(rate) && rate >= 0 ? rate : null;
};

const calculateCost = (usage, inputRate, outputRate) => {
  if (inputRate === null || outputRate === null || !usage) {
    return null;
  }

  return (
    (usage.inputTokens * inputRate + usage.outputTokens * outputRate) /
    1_000_000
  );
};

const invokeModel = async ({
  modelId,
  modelName,
  message,
  inputRate,
  outputRate,
}) => {
  const startTime = performance.now();

  const command = new ConverseCommand({
    modelId,

    system: [
      {
        text: customerSupportSystemPrompt,
      },
    ],

    messages: [
      {
        role: "user",
        content: [
          {
            text: message,
          },
        ],
      },
    ],

    inferenceConfig: {
      maxTokens: 500,
      temperature: 0.3,
    },
  });

  const response = await bedrockClient.send(command);

  const latencyMs = Math.round(performance.now() - startTime);

  const answer =
    response.output?.message?.content
      ?.map((item) => item.text ?? "")
      .join("") ?? "";

  const usage = response.usage;

  return {
    model: modelName,
    answer,
    latencyMs,
    usage,
    estimatedCostUSD: calculateCost(usage, inputRate, outputRate),
  };
};

export const compareModels = async (message) => {
  const models = [
    {
      modelName: "Amazon Nova 2 Lite",
      modelId: process.env.BEDROCK_MODEL_ID,
      inputRate: getRate("NOVA_INPUT_USD_PER_1M"),
      outputRate: getRate("NOVA_OUTPUT_USD_PER_1M"),
    },
    {
      modelName: "Gemma 3 4B IT",
      modelId: process.env.BEDROCK_GEMMA_MODEL_ID,
      inputRate: getRate("GEMMA_INPUT_USD_PER_1M"),
      outputRate: getRate("GEMMA_OUTPUT_USD_PER_1M"),
    },
  ];

  const results = await Promise.allSettled(
    models.map((model) => {
      if (!model.modelId) {
        throw new Error(`${model.modelName} model ID is missing`);
      }

      return invokeModel({
        ...model,
        message,
      });
    }),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return {
        success: true,
        ...result.value,
      };
    }

    return {
      success: false,
      model: models[index].modelName,
      error: result.reason?.message ?? "Model invocation failed",
    };
  });
};
