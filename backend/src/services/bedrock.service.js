//	Implement business logic

import {
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

import bedrockClient from "../config/bedrock.js";
import { customerSupportSystemPrompt } from "../prompts/customerSupport.prompt.js";
import {
  guardrailConfig,
  streamGuardrailConfig,
  validateGuardrailConfig,
} from "../config/guardrail.js";

export const generateAIResponse = async (message) => {
  validateGuardrailConfig();
  const command = new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID,

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
      maxTokens: 300,
      temperature: 0.3,
      topP: 0.9,
    },
    guardrailConfig,
  });

  const response = await bedrockClient.send(command);

  const answer = response.output?.message?.content
    ?.map((item) => item.text || "")
    .join("");

  return {
    answer,
    stopReason: response.stopReason,
    usage: response.usage,
    guardrailTrace: response.trace?.guardrail,
    blocked: response.stopReason === "guardrail_intervened",
  };
};

export async function* streamAIResponse(messages) {
  validateGuardrailConfig();
  const command = new ConverseStreamCommand({
    modelId: process.env.BEDROCK_MODEL_ID,
    system: [
      {
        text: customerSupportSystemPrompt,
      },
    ],
    messages,
    inferenceConfig: {
      maxTokens: 500,
      temperature: 0.3,
      topP: 0.9,
    },
    guardrailConfig: streamGuardrailConfig,
  });

  const response = await bedrockClient.send(command);

  for await (const event of response.stream) {
    if (event.messageStop) {
      yield {
        type: "stop",
        stopReason: event.messageStop.stopReason,
        blocked: event.messageStop.stopReason === "guardrail_intervened",
      };
    }

    if (event.metadata?.trace?.guardrail) {
      yield {
        type: "guardrail",
        trace: event.metadata.trace.guardrail,
      };
    }

    if (event.contentBlockDelta?.delta?.text) {
      yield {
        type: "text",
        text: event.contentBlockDelta.delta.text,
      };
    }

    if (event.metadata?.usage) {
      yield {
        type: "usage",
        usage: event.metadata.usage,
      };
    }
  }
}
