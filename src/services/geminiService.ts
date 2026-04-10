
import { GoogleGenAI, Type } from "@google/genai";
import { HallElement } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AISceneAnalysisResult {
  elements: Partial<HallElement>[];
  sunAngle?: number;
  groundScale?: number;
}

export const analyzeSceneWithAI = async (imageBase64: string): Promise<AISceneAnalysisResult> => {
  const prompt = `
    Analyze this drone aerial photograph for a Digital Twin 3D reconstruction.
    
    1. Identify all buildings and structures. For each, provide a detailed polygon footprint (at least 4 points) in relative coordinates (0-1000 for x and y).
    2. Estimate the height of each building in meters.
    3. Identify environmental objects like large trees, cars, and roads.
    4. Estimate the sun direction based on the shadows (0-360 degrees, where 0 is North).
    
    Return the data in a strict JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          elements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "building, tree, car, road" },
                points: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    }
                  }
                },
                h: { type: Type.NUMBER, description: "Estimated height in meters" },
                label: { type: Type.STRING }
              },
              required: ["type", "points", "h"]
            }
          },
          sunAngle: { type: Type.NUMBER },
          groundScale: { type: Type.NUMBER }
        },
        required: ["elements"]
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as AISceneAnalysisResult;
  } catch (error) {
    console.error("AI Analysis parsing error:", error);
    throw new Error("Failed to parse AI analysis result.");
  }
};
