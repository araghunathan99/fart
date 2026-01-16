
export enum AgeGroup {
  BABY = 'Baby (0-2)',
  TODDLER = 'Toddler (3-5)',
  KID = 'Kid (6-12)',
  TEEN = 'Teen (13+)'
}

export enum StopType {
  RESTAURANT = 'Family-Friendly Dining',
  PLAYGROUND = 'Parks & Playgrounds',
  RESTROOM = 'Clean Restroom Stops',
  MUSEUM = 'Kid-Friendly Museums',
  ACTIVITY = 'Active Fun (Zoos, Parks)',
  NECESSITY = 'Supermarkets/Pharmacies',
  HOTEL = 'Kid-Friendly Hotels & Stays',
  GAS_STATION = 'Gas Stations & EV Charging'
}

export interface TripPreferences {
  source: string;
  destinations: string[];
  ageGroups: AgeGroup[];
  stopTypes: StopType[];
  startDate: string;
  startTime: string;
  dailyDriveLimit: number;
  maxLegDuration: number;
}

export interface TripStop {
  id: string;
  name: string;
  type: StopType | string;
  description: string;
  address: string;
  lat?: number;
  lng?: number;
  time?: string;
  duration?: number; // In minutes
  rating?: number;
  reviewCount?: number;
  reviewSnippet?: string;
  isSelected: boolean;
  isCompleted: boolean;
  price?: string;
  openingHours?: string;
  temperature?: string;
  weatherIcon?: string;
  weatherSummary?: string;
  driveTimeToNext?: string;
}

export interface TripDay {
  dayNumber: number;
  title: string;
  daySummary?: string;
  date?: string;
  startTime?: string;
  stops: TripStop[];
  weatherSummary?: string;
  weatherIcon?: string;
  temperatureRange?: string;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  isPacked: boolean;
  reason?: string;
}

export interface PackingList {
  categories: {
    name: string;
    items: PackingItem[];
  }[];
}

export interface TripPlan {
  id: string;
  tripName: string;
  summary: string;
  totalDistance?: string;
  totalDuration?: string;
  days: TripDay[];
  lastUpdated?: string;
  isActive: boolean;
  packingList?: PackingList;
  preferences?: TripPreferences;
  sources?: { title: string; uri: string }[];
}
