// 	Configure AWS clients
import "dotenv/config";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  // Initial request + up to 2 retries
  maxAttempts: 3,
  // Retry transient failures and throttling
  retryMode: "standard",
});

export default bedrockClient;
