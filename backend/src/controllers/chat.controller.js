// 	Handle HTTP requests

import {
  generateAIResponse,
  streamAIResponse,
} from "../services/bedrock.service.js";

import {
  getOrCreateConversation,
  getConversationHistory,
  saveMessage,
} from "../services/conversation.service.js";
import { getBedrockError } from "../utils/bedrockError.js";
import { calculateTokenCost } from "../utils/tokenCost.js";

export const chatController = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const result = await generateAIResponse(message.trim());
    const response = {
      success: true,
      data: {
        answer: result.answer,
        usage: result.usage,
        cost: calculateTokenCost({
          inputTokens: result.usage?.inputTokens || 0,
          outputTokens: result.usage?.outputTokens || 0,
          // Illustrative rates only, not actual AWS pricing
          inputPricePerMillion: 0.35,
          outputPricePerMillion: 2.95,
        }),
        latencyMs: result.usage?.latencyMs || null,
        stopReason: result.stopReason,
        guardrailTrace: result.guardrailTrace,
        blocked: result.blocked,
      },
    };

    console.log("4. Sending response to Postman");
    return res.status(200).json(response);
  } catch (error) {
    const result = getBedrockError(error);

    if (!res.headersSent) {
      return res.status(result.retryable ? 503 : 500).json({
        success: false,
        error: result.message,
        code: result.code,
      });
    }

    res.end();
    next(error);
  }
};

export const streamChatController = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Demo identity only. Replace with authenticated user ID later.
    const userId = req.user?.id || req.header("x-user-id");

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User identity is required",
      });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const conversation = await getOrCreateConversation(
      userId,
      conversationId,
      message.trim(),
    );

    const history = await getConversationHistory(conversation._id);

    // Save current user message
    await saveMessage({
      conversationId: conversation._id,
      role: "user",
      content: message.trim(),
    });

    // Convert MongoDB history into Bedrock message format
    const messages = history.map((item) => ({
      role: item.role,
      content: [{ text: item.content }],
    }));

    messages.push({
      role: "user",
      content: [{ text: message.trim() }],
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Flush headers to ensure the client starts receiving events immediately
    res.flushHeaders?.();

    res.write(
      `event: conversation\ndata: ${JSON.stringify({
        conversationId: conversation._id,
      })}\n\n`,
    );

    let fullAnswer = "";
    let usage = null;
    let blocked = false;

    for await (const event of streamAIResponse(messages)) {
      if (event.type === "text") {
        fullAnswer += event.text;

        res.write(
          `event: token\ndata: ${JSON.stringify({
            text: event.text,
          })}\n\n`,
        );
      }

      if (event.type === "usage") {
        usage = event.usage;
      }

      if (event.type === "stop") {
        blocked = event.blocked;

        res.write(
          `event: stop\ndata: ${JSON.stringify({
            stopReason: event.stopReason,
            blocked,
          })}\n\n`,
        );
      }

      if (event.type === "guardrail") {
        // Keep detailed traces in server logs.
        console.log("Bedrock Guardrail assessment:", event.trace);
      }
    }

    const result = calculateTokenCost({
      inputTokens: usage?.inputTokens || 0,
      outputTokens: usage?.outputTokens || 0,

      // Illustrative rates only, not actual AWS pricing
      inputPricePerMillion: 0.35,
      outputPricePerMillion: 2.95,
    });

    // Save completed assistant response
    await saveMessage({
      conversationId: conversation._id,
      role: "assistant",
      content: fullAnswer,
      usage,
      cost: {
        inputCost: result.inputCost,
        outputCost: result.outputCost,
        totalCost: result.totalCost,
      },
      latencyMs: usage?.latencyMs || null,
    });

    res.write(
      `event: done\ndata: ${JSON.stringify({
        conversationId,
        usage,
        blocked,
        cost: {
          inputCost: result.inputCost,
          outputCost: result.outputCost,
          totalCost: result.totalCost,
        },
        latencyMs: usage?.latencyMs || null,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    const result = getBedrockError(error);

    if (!res.headersSent) {
      return res.status(result.retryable ? 503 : 500).json({
        success: false,
        error: result.message,
        code: result.code,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
