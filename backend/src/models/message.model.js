import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    usage: {
      inputTokens: Number,
      outputTokens: Number,
      totalTokens: Number,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Message", messageSchema);
