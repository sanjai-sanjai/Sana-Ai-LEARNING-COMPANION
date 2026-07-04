import { createGroq } from "@ai-sdk/groq";

export function getGroqModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  const groq = createGroq({ apiKey });
  return groq("llama-3.3-70b-versatile");
}
