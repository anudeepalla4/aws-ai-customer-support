import { compareModels } from "../services/modelComparison.service.js";

export const compareModelsController = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const results = await compareModels(message.trim());

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Model comparison error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
