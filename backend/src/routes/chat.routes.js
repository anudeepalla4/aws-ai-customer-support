// Define all the routes here

import express from "express";

import {
  chatController,
  streamChatController,
} from "../controllers/chat.controller.js";

import { compareModelsController } from "../controllers/modelComparison.controller.js";

const router = express.Router();

router.post("/", chatController);
router.post("/stream", streamChatController);
router.post("/compare", compareModelsController);

export default router;
