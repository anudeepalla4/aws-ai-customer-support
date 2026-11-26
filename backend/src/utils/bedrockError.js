export function getBedrockError(error) {
  const retryableErrors = [
    "ThrottlingException",
    "ServiceUnavailableException",
    "InternalServerException",
    "ModelTimeoutException",
  ];

  const errorName = error.name || "UnknownError";

  return {
    code: errorName,
    retryable: retryableErrors.includes(errorName),
    message: getSafeMessage(errorName),
  };
}

function getSafeMessage(errorName) {
  switch (errorName) {
    case "ThrottlingException":
      return "The AI service is busy. Please try again shortly.";

    case "ServiceUnavailableException":
      return "The AI service is temporarily unavailable.";

    case "ModelTimeoutException":
      return "The AI response took too long. Please try again.";

    case "AccessDeniedException":
      return "The AI service configuration requires attention.";

    case "ValidationException":
      return "The AI request configuration is invalid.";

    default:
      return "Something went wrong while processing your request.";
  }
}
