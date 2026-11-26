import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

export const getOrCreateConversation = async (
  userId,
  conversationId,
  firstMessage,
) => {
  if (conversationId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return conversation;
  }

  return Conversation.create({
    userId,
    title: firstMessage.substring(0, 60),
  });
};

export const saveMessage = async (data) => {
  return Message.create(data);
};

export const getConversationHistory = async (conversationId) => {
  const messages = await Message.find({
    conversationId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return messages.reverse();
};
