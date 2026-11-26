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
      },
    };

    console.log("4. Sending response to Postman");
    return res.status(200).json(response);
  } catch (error) {
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

    res.flushHeaders?.();

    res.write(
      `event: conversation\ndata: ${JSON.stringify({
        conversationId: conversation._id,
      })}\n\n`,
    );

    let fullAnswer = "";
    let usage = null;

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
    }

    // Save completed assistant response
    await saveMessage({
      conversationId: conversation._id,
      role: "assistant",
      content: fullAnswer,
      usage,
    });

    res.write(
      `event: done\ndata: ${JSON.stringify({
        conversationId: conversation._id,
        usage,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("Chat error:", error);

    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: "Unable to complete the conversation",
        })}\n\n`,
      );

      return res.end();
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
