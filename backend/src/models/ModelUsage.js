import mongoose from "mongoose";

const modelUsageSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    modelId: { type: String, required: true },
    modelName: { type: String, required: true },
    operation: {
      type: String,
      enum: ["chat", "comparison"],
      default: "chat",
    },
    inputTokens: { type: Number, min: 0, default: 0 },
    outputTokens: { type: Number, min: 0, default: 0 },
    totalTokens: { type: Number, min: 0, default: 0 },
    inputCost: { type: Number, min: 0, default: 0 },
    outputCost: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    costKnown: { type: Boolean, default: false },
    requestId: { type: String, default: null },
  },
  { timestamps: true }
);

modelUsageSchema.index({ userId: 1, createdAt: -1 });
modelUsageSchema.index({ userId: 1, modelId: 1, createdAt: -1 });
modelUsageSchema.index(
  { requestId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("ModelUsage", modelUsageSchema);
