/** Gemini AI integration for tool recognition. */

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getCurrentUser } from "./auth";

export interface IdentifiedTool {
  name: string;
  category: string;
  description: string;
  confidence: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IdentifyToolsResult {
  ok: true;
  tools: IdentifiedTool[];
}

export interface IdentifyToolsError {
  ok: false;
  error: string;
}

export const identifyTools = createServerFn({ method: "POST" })
  .inputValidator((data: { image_base64: string }) => {
    if (!data.image_base64) throw new Error("Image required");
    return data;
  })
  .handler(
    async ({
      data,
    }): Promise<IdentifyToolsResult | IdentifyToolsError> => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const apiKey = (env as Record<string, string>).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const prompt = `You are a tool identification expert. Analyze this image of tools and identify each individual tool visible.

For each tool, provide:
- name: The common name of the tool (e.g., "Circular Saw", "Claw Hammer")
- category: One of: Power Tools, Hand Tools, Garden Tools, Measuring, Safety, Fastening, Plumbing, Electrical, Painting, Woodworking, Automotive, Other
- description: A brief description (1-2 sentences)
- confidence: Your confidence level from 0.0 to 1.0
- bounding_box: Approximate location in the image as percentages (0-100) with x, y (top-left corner), width, height

Respond with ONLY a JSON array of objects. No markdown, no explanation. Example:
[{"name":"Circular Saw","category":"Power Tools","description":"A 7.25 inch corded circular saw.","confidence":0.95,"bounding_box":{"x":10,"y":20,"width":30,"height":25}}]

If you cannot identify any tools, return an empty array: []`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: data.image_base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
              },
            }),
          },
        );

        if (!res.ok) {
          const body = await res.text();
          console.error("Gemini API error:", res.status, body);
          if (res.status === 429) {
            return {
              ok: false,
              error:
                "AI quota exceeded — please try again later or contact the admin to upgrade the API plan",
            };
          }
          return { ok: false, error: "AI service temporarily unavailable" };
        }

        const json = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          return { ok: false, error: "No response from AI" };
        }

        // Parse JSON from response (strip any markdown code fences)
        const cleaned = text
          .replace(/^```json?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const tools: IdentifiedTool[] = JSON.parse(cleaned);

        if (!Array.isArray(tools)) {
          return { ok: false, error: "Unexpected AI response format" };
        }

        return { ok: true, tools };
      } catch (err) {
        console.error("Gemini identification failed:", err);
        return {
          ok: false,
          error: "AI couldn't identify tools — add them manually",
        };
      }
    },
  );

/** Identify a single tool from a photo (for individual add). */
export const identifySingleTool = createServerFn({ method: "POST" })
  .inputValidator((data: { image_base64: string }) => {
    if (!data.image_base64) throw new Error("Image required");
    return data;
  })
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; name: string; category: string; description: string }
      | { ok: false; error: string }
    > => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const apiKey = (env as Record<string, string>).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const prompt = `Identify the main tool in this photo. Respond with ONLY a JSON object:
{"name":"Tool Name","category":"Category","description":"Brief description."}

Categories: Power Tools, Hand Tools, Garden Tools, Measuring, Safety, Fastening, Plumbing, Electrical, Painting, Woodworking, Automotive, Other`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: data.image_base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
              },
            }),
          },
        );

        if (!res.ok) {
          const body = await res.text();
          console.error("Gemini API error:", res.status, body);
          if (res.status === 429) {
            return {
              ok: false,
              error:
                "AI quota exceeded — please try again later or contact the admin to upgrade the API plan",
            };
          }
          return { ok: false, error: "AI service temporarily unavailable" };
        }

        const json = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          return { ok: false, error: "No response from AI" };
        }

        const cleaned = text
          .replace(/^```json?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const result = JSON.parse(cleaned);

        return {
          ok: true,
          name: result.name || "Unknown Tool",
          category: result.category || "Other",
          description: result.description || "",
        };
      } catch {
        return {
          ok: false,
          error: "AI couldn't identify this tool",
        };
      }
    },
  );
