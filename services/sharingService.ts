
import { TripPlan } from "../types";

/**
 * Encodes a TripPlan object into a base64 string for URL sharing.
 * Uses a basic approach for demonstration; for production, LZ-string compression is recommended.
 */
export const encodeTripForSharing = (plan: TripPlan): string => {
  try {
    const json = JSON.stringify(plan);
    // Use btoa with encodeURIComponent to handle non-ASCII characters
    return btoa(unescape(encodeURIComponent(json)));
  } catch (e) {
    console.error("Failed to encode trip", e);
    return "";
  }
};

/**
 * Decodes a base64 string back into a TripPlan object.
 */
export const decodeTripFromSharing = (encoded: string): TripPlan | null => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json) as TripPlan;
  } catch (e) {
    console.error("Failed to decode trip", e);
    return null;
  }
};

/**
 * Generates the full shareable URL.
 */
export const getShareableUrl = (plan: TripPlan): string => {
  const encoded = encodeTripForSharing(plan);
  const url = new URL(window.location.href);
  url.searchParams.set("share", encoded);
  return url.toString();
};
