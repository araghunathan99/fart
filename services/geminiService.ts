
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

export const getPlaceSuggestions = async (input: string): Promise<string[]> => {
  if (!input || input.trim().length < 2) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is typing a location for a road trip planner: "${input}". 
      Provide 5 diverse and real-world location suggestions. 
      Include a mix of specific street addresses, famous landmarks, parks, and city names. 
      Return ONLY a JSON array of strings. 
      Example format: ["Central Park, New York, NY", "1600 Pennsylvania Avenue NW, Washington, DC", "Disneyland Park, Anaheim, CA"].`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const destinationList = prefs.destinations.join(' then to ');
  const prompt = `
    ACT AS: A world-class family travel expert and logistical master.
    TASK: Plan a detailed, fun, and safe road trip itinerary.
    ROUTE: Starting from "${prefs.source}" and visiting "${destinationList}".
    
    CONTEXT:
    - START DATE: ${prefs.startDate}.
    - START TIME: ${prefs.startTime}.
    - Family consists of kids in these age groups: ${prefs.ageGroups.join(', ')}.
    - Must-have stop categories: ${prefs.stopTypes.join(', ')}.
    - Driving constraints: Max ${prefs.dailyDriveLimit} hours of driving per day.
    - Rest frequency: Mandatory stop every ${prefs.maxLegDuration} hours.
    
    LOGIC FOR CHOOSING STOPS (STRICT ORDER):
    1. OPERATING HOURS: Only select stops verified to be OPEN during suggested window.
    2. QUALITY & POPULARITY: Prioritize stops with the highest Weighted Review Score.
    3. DRIVING TIMES: Estimate driving time to the NEXT stop.
    4. GEOLOCATION: You MUST provide precise latitude and longitude for EVERY stop.
    5. TIME FORMATTING: All "time" fields for stops MUST be in HH:MM (24-hour) format (e.g., 09:15, 14:30).
    6. DURATION: For each stop, estimate a realistic "duration" in minutes.
    
    WEATHER REQUIREMENTS (CRITICAL):
    - Provide accurate High/Low temperatures for each Day.
    - FOR EVERY INDIVIDUAL STOP: Provide a specific temperature estimate for that time of day, a matching emoji weatherIcon (e.g. ☀️, ⛅, 🌧️, ☁️, 🌦️, 🌩️), and a specific weatherSummary (e.g. "Sunny", "Partly Cloudy", "Passing Showers"). 
    - Don't just repeat the same weather for every stop on a day; make it feel dynamic and localized.
    
    Return the plan as a valid JSON object matching the requested schema.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      totalDistance: { type: Type.STRING },
      totalDuration: { type: Type.STRING },
      days: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            daySummary: { type: Type.STRING },
            date: { type: Type.STRING },
            startTime: { type: Type.STRING },
            weatherSummary: { type: Type.STRING },
            weatherIcon: { type: Type.STRING },
            temperatureRange: { type: Type.STRING },
            stops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  address: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  time: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  rating: { type: Type.NUMBER },
                  reviewCount: { type: Type.INTEGER },
                  reviewSnippet: { type: Type.STRING },
                  openingHours: { type: Type.STRING },
                  temperature: { type: Type.STRING },
                  weatherSummary: { type: Type.STRING },
                  weatherIcon: { type: Type.STRING },
                  driveTimeToNext: { type: Type.STRING }
                },
                required: ["name", "address", "lat", "lng", "description", "time", "duration", "rating", "openingHours", "temperature", "weatherIcon", "weatherSummary", "reviewCount", "driveTimeToNext"]
              }
            }
          },
          required: ["dayNumber", "title", "daySummary", "stops", "date", "startTime", "temperatureRange", "weatherIcon", "weatherSummary"]
        }
      }
    },
    required: ["summary", "days", "totalDistance", "totalDuration"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    const text = response.text;
    if (!text) throw new Error("The AI returned an empty response. Please try again.");
    
    const result = JSON.parse(extractJSON(text.trim()));
    
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
      preferences: prefs
    } as TripPlan;
  } catch (error: any) {
    console.error("Planning API Error:", error);
    throw new Error("We hit a roadblock while planning your trip. Please check your locations and try again.");
  }
};

export const generatePackingList = async (plan: TripPlan): Promise<PackingList> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const weatherContext = plan.days.map(d => `Day ${d.dayNumber}: ${d.weatherSummary} (${d.temperatureRange})`).join(', ');
  const ageContext = plan.preferences?.ageGroups.join(', ') || 'General family';

  const prompt = `
    ACT AS: A family travel organization expert.
    TASK: Generate a comprehensive packing list for a road trip.
    TRIP SUMMARY: ${plan.summary}
    WEATHER FORECAST: ${weatherContext}
    FAMILY AGES: ${ageContext}
    
    CATEGORIES: Clothing, Kids Essentials, Car Gear, Health & Hygiene, Fun & Entertainment.
    Return ONLY a JSON object with a "categories" array.
  `;

  const schema = {
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
                },
                required: ["id", "name"]
              }
            }
          },
          required: ["name", "items"]
        }
      }
    },
    required: ["categories"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
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
    console.error("Packing List Generation Error:", error);
    throw error;
  }
};
