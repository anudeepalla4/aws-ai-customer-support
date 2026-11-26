// 	Configure AWS clients
import "dotenv/config";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});

export default bedrockClient;
