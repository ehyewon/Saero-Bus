// Detects an "upcoming trip" — either an active trip from search, or the
// soonest enabled alarm whose time is within the next N hours (default 2h).

import { loadActiveTrip, type ActiveTrip } from './activeTrip';
import type { PlanResponse } from './blogApi';

interface StoredAlarm {
  id: string;
  title: string;
  time: string; // e.g. "07:45 AM"
  enabled: boolean;
  dates: string[]; // YYYY-MM-DD list
}

export interface UpcomingTrip {
  origin?: string;
  destination: string;
  arrivalTime: string; // "HH:mm" 24h
  mode?: 'arrive' | 'depart';
  createdAt?: number;
  plan?: PlanResponse;
  noServiceReason?: string;
  nextFirstBusTime?: string;
  nextFirstBusLabel?: string;
  source: 'search' | 'alarm';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse "07:45 AM" / "06:20 PM" to 24h "HH:mm". Returns null on bad input. */
function parseClockToken(token: string): string | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${pad(h)}:${pad(min)}`;
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hhmmToDateToday(hhmm: string): Date | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function loadAlarms(): StoredAlarm[] {
  const raw = localStorage.getItem('alarms');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as StoredAlarm[];
  } catch {
    /* ignore */
  }
  return [];
}

/**
 * Returns the soonest upcoming "trip" to show on the hub, or null.
 * Priority: active trip from search > nearest enabled alarm within `windowHours`.
 */
export function loadUpcomingTrip(windowHours = 2): UpcomingTrip | null {
  const trip: ActiveTrip | null = loadActiveTrip();
  if (trip) {
    const arrival = hhmmToDateToday(trip.arrivalTime);
    if (!arrival) return null;

    const diff = arrival.getTime() - Date.now();
    if (diff > windowHours * 60 * 60_000 || diff <= 0) {
      return null;
    }

    return {
      origin: trip.origin,
      destination: trip.destination,
      arrivalTime: trip.arrivalTime,
      mode: trip.mode,
      createdAt: trip.createdAt,
      plan: trip.plan,
      noServiceReason: trip.noServiceReason,
      nextFirstBusTime: trip.nextFirstBusTime,
      nextFirstBusLabel: trip.nextFirstBusLabel,
      source: 'search',
    };
  }

  const today = todayKey();
  const windowMs = windowHours * 60 * 60_000;
  const now = Date.now();

  const candidates: { date: Date; alarm: StoredAlarm; hhmm: string }[] = [];
  for (const a of loadAlarms()) {
    if (!a.enabled) continue;
    if (!a.dates?.includes(today)) continue;
    const hhmm = parseClockToken(a.time);
    if (!hhmm) continue;
    const when = hhmmToDateToday(hhmm);
    if (!when) continue;
    const diff = when.getTime() - now;
    if (diff <= 0 || diff > windowMs) continue;
    candidates.push({ date: when, alarm: a, hhmm });
  }
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => x.date.getTime() - y.date.getTime());
  const top = candidates[0];
  return {
    origin: undefined,
    destination: top.alarm.title,
    arrivalTime: top.hhmm,
    source: 'alarm',
  };
}
