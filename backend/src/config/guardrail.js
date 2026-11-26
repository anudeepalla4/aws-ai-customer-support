export const guardrailConfig = {
  guardrailIdentifier: process.env.BEDROCK_GUARDRAIL_ID,
  guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION,
  trace: "enabled",
};

export const streamGuardrailConfig = {
  ...guardrailConfig,
  streamProcessingMode: "sync",
};

export function validateGuardrailConfig() {
  if (
    !guardrailConfig.guardrailIdentifier ||
    !guardrailConfig.guardrailVersion
  ) {
    throw new Error("Bedrock Guardrail ID and version are required");
  }
}
