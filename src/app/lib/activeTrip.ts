// Active trip state shared between the HomePage search flow and RouteHub.
// Persisted in localStorage so the hub can show a live trip card after search.

import type { PlanResponse } from './blogApi';

export interface ActiveTrip {
  origin?: string;
  destination: string;
  arrivalTime: string; // "HH:mm"
  mode?: 'arrive' | 'depart';
  plan?: PlanResponse;
  noServiceReason?: string;
  createdAt: number;
}

const KEY = 'activeTrip';

const parseHhmmToToday = (hhmm: string): Date | null => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
};

export function saveActiveTrip(trip: Omit<ActiveTrip, 'createdAt'>) {
  const payload: ActiveTrip = { ...trip, createdAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearActiveTrip() {
  localStorage.removeItem(KEY);
}

/**
 * Returns the active trip if it still has an unreached arrival time.
 * Auto-clears stale trips (arrival already passed).
 */
export function loadActiveTrip(): ActiveTrip | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveTrip;
    const arrival = parseHhmmToToday(parsed.arrivalTime);
    // If we can't parse, drop it
    if (!arrival) {
      localStorage.removeItem(KEY);
      return null;
    }
    // Expire 10 min after arrival
    if (arrival.getTime() + 10 * 60_000 < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}
