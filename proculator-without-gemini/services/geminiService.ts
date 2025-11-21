import { GoogleGenAI, Type } from "@google/genai";

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client && process.env.API_KEY) {
    client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return client;
};

export const getLocationFromPincode = async (pincode: string): Promise<{ city: string; state: string } | null> => {
  const ai = getClient();
  if (!ai) {
    console.warn("Gemini API Key not found. Returning null for location lookup.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Identify the primary city and state/province for the postal code/pincode "${pincode}". If the pincode is invalid or not found, return null values.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING, nullable: true },
            state: { type: Type.STRING, nullable: true },
            found: { type: Type.BOOLEAN },
          },
          required: ["found"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (data.found && data.city) {
      return { city: data.city, state: data.state || "" };
    }
    return null;

  } catch (error) {
    console.error("Error fetching location from Gemini:", error);
    return null;
  }
};