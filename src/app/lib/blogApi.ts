const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_BLOG_API_BASE_URL ||
  'https://tyler-attractions-guns-wallace.trycloudflare.com';

export type ApiSource = 'dummy' | 'reference' | 'live' | 'pre_eta' | 'live_eta';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteSummary {
  stdid: number;
  brt_no: string;
  subid?: string | null;
  direction?: string | null;
  start_name?: string | null;
  end_name?: string | null;
  first_time?: string | null;
  last_time?: string | null;
}

export interface StopInRoute {
  stop_ord: number;
  stop_id: number;
  stop_name: string;
  lat: number;
  lng: number;
}

export interface StopSummary {
  stop_id: number;
  stop_name: string;
  lat: number;
  lng: number;
  routes?: string[];
  source?: ApiSource;
}

export interface RouteDetailResponse {
  stdid: number;
  brt_no: string;
  stops: StopInRoute[];
  polyline: LatLng[];
  source: ApiSource;
}

export interface DepartureList {
  stdid: number;
  brt_no?: string | null;
  daytype: string;
  departures: string[];
  source: ApiSource;
}

export interface LiveBus {
  stdid: number;
  brt_no: string;
  lat?: number | null;
  lng?: number | null;
  stop_ord?: number | null;
  updated_at: string;
  source: ApiSource;
}

export interface ArrivalItem {
  brt_no: string;
  stdid: number;
  stops_away: number;
  eta_sec?: number | null;
  eta_source?: ApiSource;
}

export interface ArrivalBoard {
  stop_id: number;
  stop_name?: string | null;
  arrivals: ArrivalItem[];
}

export interface WeatherResponse {
  now: {
    lat: number;
    lng: number;
    observed_at: string;
    temp_c?: number | null;
    precipitation_type?: string | null;
    rain_mm?: number | null;
    sky?: string | null;
    source: ApiSource;
  };
  forecast?: Array<{
    forecast_at: string;
    temp_c?: number | null;
    precipitation_type?: string | null;
    rain_mm?: number | null;
    sky?: string | null;
  }>;
}

export interface PlanLeg {
  mode: string;
  desc: string;
  from_name?: string | null;
  to_name?: string | null;
  start_iso?: string | null;
  end_iso?: string | null;
  brt_no?: string | null;
  stdid?: number | null;
  depart?: string | null;
}

export interface PlanOption {
  leave_by: string;
  arrival_eta: string;
  miss_probability: number;
  legs: PlanLeg[];
}

export interface PlanResponse {
  recommended: PlanOption;
  alternatives?: PlanOption[];
  advice: string;
  dummy?: boolean;
  source?: ApiSource;
}

export interface PlanRequest {
  origin: LatLng;
  destination?: LatLng | null;
  destination_query?: string | null;
  target_arrival: string;
  user_speed_mps?: number | null;
}

const hhmm = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').padStart(4, '0');
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`BLog API ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

export const blogApi = {
  hhmm,
  listRoutes: () => request<RouteSummary[]>('/v1/routes'),
  getRoute: (stdid: number) => request<RouteDetailResponse>(`/v1/routes/${stdid}`),
  getRouteDepartures: (stdid: number, daytype?: string) => {
    const params = new URLSearchParams();
    if (daytype) params.set('daytype', daytype);
    const query = params.toString();
    return request<DepartureList>(`/v1/routes/${stdid}/departures${query ? `?${query}` : ''}`);
  },
  getRouteBuses: (stdid: number) => request<LiveBus[]>(`/v1/routes/${stdid}/buses`),
  searchStops: (q: string) =>
    request<StopSummary[]>(`/v1/stops/search?${new URLSearchParams({ q }).toString()}`),
  getStopArrivals: (stopId: number) => request<ArrivalBoard>(`/v1/stops/${stopId}/arrivals`),
  getWeather: (lat: number, lng: number) => request<WeatherResponse>(`/v1/weather?lat=${lat}&lng=${lng}`),
  makePlan: (payload: PlanRequest) =>
    request<PlanResponse>('/v1/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recheckPlan: (payload: PlanRequest) =>
    request<PlanResponse>('/v1/plan/recheck', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
