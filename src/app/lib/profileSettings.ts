// Lightweight persistence for profile + notification preferences.
// Pages read/write these via the helpers below; everything is stored in
// localStorage so it survives reloads.

const PROFILE_KEY = 'saerobus.profile.v1';
const PLACES_KEY = 'saerobus.places.v1';
const NOTIFY_KEY = 'saerobus.notify.v1';
const FAV_ROUTES_KEY = 'saerobus.favRoutes.v1';
const FAV_STOPS_KEY = 'saerobus.favStops.v1';

export interface ProfileData {
  nickname: string;
}

export interface FavoritePlace {
  address: string;
  lat?: number;
  lng?: number;
}

export interface PlacesData {
  home: FavoritePlace | null;
  frequent: FavoritePlace | null;
}

export interface NotifySettings {
  arrival: boolean;
  departure: boolean;
  leadMinutes: number; // minutes before arrival to alert
}

export interface FavoriteRoute {
  id: string;
  routeNo: string;
  label?: string;
}

export interface FavoriteStop {
  id: string;
  name: string;
  stopId?: string;
}

export const DEFAULT_NOTIFY: NotifySettings = {
  arrival: true,
  departure: true,
  leadMinutes: 5,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): ProfileData {
  return safeParse<ProfileData>(localStorage.getItem(PROFILE_KEY), { nickname: '' });
}

export function saveProfile(p: ProfileData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function loadPlaces(): PlacesData {
  return safeParse<PlacesData>(localStorage.getItem(PLACES_KEY), { home: null, frequent: null });
}

export function savePlaces(p: PlacesData) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(p));
}

export function loadNotify(): NotifySettings {
  return { ...DEFAULT_NOTIFY, ...safeParse<Partial<NotifySettings>>(localStorage.getItem(NOTIFY_KEY), {}) };
}

export function saveNotify(n: NotifySettings) {
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(n));
}

export function loadFavoriteRoutes(): FavoriteRoute[] {
  return safeParse<FavoriteRoute[]>(localStorage.getItem(FAV_ROUTES_KEY), []);
}

export function saveFavoriteRoutes(routes: FavoriteRoute[]) {
  localStorage.setItem(FAV_ROUTES_KEY, JSON.stringify(routes));
}

export function loadFavoriteStops(): FavoriteStop[] {
  return safeParse<FavoriteStop[]>(localStorage.getItem(FAV_STOPS_KEY), []);
}

export function saveFavoriteStops(stops: FavoriteStop[]) {
  localStorage.setItem(FAV_STOPS_KEY, JSON.stringify(stops));
}

/** Wipe everything Saerobus-related from localStorage. Used by 탈퇴하기. */
export function wipeAllProfileData() {
  [PROFILE_KEY, PLACES_KEY, NOTIFY_KEY, FAV_ROUTES_KEY, FAV_STOPS_KEY].forEach((k) => localStorage.removeItem(k));
  // Onboarding flag lives in its own component — clear by best-effort key match
  Object.keys(localStorage)
    .filter((k) => k.startsWith('saerobus.'))
    .forEach((k) => localStorage.removeItem(k));
}
