import { GoogleGenAI, Type } from "@google/genai";
import { TripPreferences, TripPlan, StopType, PackingList } from "../types";

const extractJSON = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return text.substring(start, end + 1);
  }
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1) {
    return text.substring(arrayStart, arrayEnd + 1);
  }
  return text;
};

const getApiKey = (): string => {
  // Check process.env (Standard Vite/SDK approach)
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
    return process.env.API_KEY;
  }
  // Check global window as a fallback for specific host environments
  // @ts-ignore
  if (window.API_KEY) return window.API_KEY;
  
  return "";
};

const getLatLng = async (): Promise<{latitude: number, longitude: number} | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
};

export const getPlaceSuggestions = async (input: string): Promise<string[]> => {
  if (!input || input.trim().length < 2) return [];
  
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Gemini API Key missing during Autocomplete call.");
    return [];
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is typing a location for a road trip: "${input}". 
      Provide 5 diverse and real-world location suggestions. 
      Return ONLY a JSON array of strings. 
      Example: ["Central Park, New York, NY", "Grand Canyon, AZ"].`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    
    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(extractJSON(text.trim()));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Autocomplete API Error:", error);
    return [];
  }
};

export const planTripWithAI = async (prefs: TripPreferences): Promise<TripPlan> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing. Please refresh or contact support.");
  
  const ai = new GoogleGenAI({ apiKey });
  const userLoc = await getLatLng();
  
  const destinationList = prefs.destinations.join(' then to ');
  const prompt = `
    ACT AS: A world-class family travel expert and logistical master.
    TASK: Plan a detailed, fun, and safe road trip itinerary using REAL-TIME data.
    ROUTE: Starting from "${prefs.source}" and visiting "${destinationList}".
    
    CONTEXT:
    - Family consists of kids ages: ${prefs.ageGroups.join(', ')}.
    - Must-have stop categories: ${prefs.stopTypes.join(', ')}.
    - Driving constraints: Max ${prefs.dailyDriveLimit} hours of driving per day.
    
    REQUIREMENTS:
    1. Use Google Maps data to verify locations.
    2. Provide precise lat/lng for every stop.
    3. All "time" fields MUST be in HH:MM (24-hour) format.
    4. Estimate realistic durations in minutes.
    
    RETURN FORMAT: You MUST return a single valid JSON object. Do not include any text outside the JSON.
    The JSON structure MUST be:
    {
      "summary": "...",
      "totalDistance": "...",
      "totalDuration": "...",
      "days": [
        {
          "dayNumber": 1,
          "title": "...",
          "daySummary": "...",
          "date": "${prefs.startDate}",
          "startTime": "${prefs.startTime}",
          "weatherSummary": "Sunny",
          "weatherIcon": "☀️",
          "temperatureRange": "75F - 82F",
          "stops": [
            {
              "name": "...",
              "address": "...",
              "lat": 0.0,
              "lng": 0.0,
              "description": "...",
              "time": "HH:MM",
              "duration": 60,
              "rating": 4.5,
              "openingHours": "...",
              "temperature": "78F",
              "weatherIcon": "☀️",
              "weatherSummary": "Sunny",
              "reviewCount": 100,
              "driveTimeToNext": "30 mins"
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        ...(userLoc && {
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: userLoc.latitude,
                longitude: userLoc.longitude
              }
            }
          }
        })
      },
    });

    const text = response.text;
    if (!text) throw new Error("The AI returned an empty response.");
    
    const cleanJson = extractJSON(text.trim());
    const result = JSON.parse(cleanJson);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapSources = groundingChunks
      .filter((c: any) => c.maps)
      .map((c: any) => ({
        title: c.maps.title,
        uri: c.maps.uri
      }));

    if (result.days) {
      result.days = result.days.map((day: any) => ({
        ...day,
        stops: day.stops.map((stop: any) => ({ 
          ...stop, 
          id: stop.id || Math.random().toString(36).substr(2, 9),
          isSelected: true,
          isCompleted: false 
        }))
      }));
    }

    return {
      ...result,
      id: crypto.randomUUID(),
      tripName: `${prefs.source.split(',')[0]} to ${prefs.destinations[prefs.destinations.length - 1].split(',')[0]}`,
      lastUpdated: new Date().toISOString(),
      isActive: false,
      preferences: prefs,
      sources: mapSources
    } as TripPlan;
  } catch (error: any) {
    console.error("Planning API Error:", error);
    throw new Error("API Connection Error: Ensure you have a valid internet connection and try again.");
  }
};

export const generatePackingList = async (plan: TripPlan): Promise<PackingList> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const weatherContext = plan.days.map(d => `Day ${d.dayNumber}: ${d.weatherSummary} (${d.temperatureRange})`).join(', ');
  const ageContext = plan.preferences?.ageGroups.join(', ') || 'General family';

  const prompt = `
    ACT AS: A family travel organization expert.
    TASK: Generate a comprehensive packing list for a road trip.
    TRIP SUMMARY: ${plan.summary}
    WEATHER: ${weatherContext}
    FAMILY: ${ageContext}
    
    CATEGORIES: Clothing, Kids Essentials, Car Gear, Health, Fun.
    Return ONLY a JSON object with a "categories" array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        reason: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    const result = JSON.parse(extractJSON(text.trim()));
    result.categories = result.categories.map((cat: any) => ({
      ...cat,
      items: cat.items.map((item: any) => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        isPacked: false
      }))
    }));

    return result as PackingList;
  } catch (error) {
    console.error("Packing List Error:", error);
    throw error;
  }
};