//	Implement business logic

import {
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

import bedrockClient from "../config/bedrock.js";
import { customerSupportSystemPrompt } from "../prompts/customerSupport.prompt.js";

export const generateAIResponse = async (message) => {
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
  });

  const response = await bedrockClient.send(command);

  const answer = response.output?.message?.content
    ?.map((item) => item.text || "")
    .join("");

  return {
    answer,
    usage: {
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      totalTokens: response.usage?.totalTokens ?? 0,
    },
  };
};

export async function* streamAIResponse(messages) {
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
  });

  const response = await bedrockClient.send(command);

  for await (const event of response.stream) {
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
