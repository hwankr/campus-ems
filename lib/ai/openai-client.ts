import "server-only";

import OpenAI from "openai";

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-5.5";
}

export function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
