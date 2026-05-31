import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  Search,
  DirectionsBus,
  ArrowBack,
  Star,
  StarBorder,
  AccessTime,
  Place,
  FiberManualRecord,
  Schedule,
  People,
  Refresh,
} from '@mui/icons-material';
import { blogApi, type RouteDetailResponse, type RouteSummary } from '../lib/blogApi';

export interface BusInfo {
  stdid?: number;
  number: string;
  name: string;
  type: 'express' | 'trunk' | 'branch' | 'local';
  firstBus: string;
  lastBus: string;
  interval: string;
  source?: 'api' | 'mock';
}

const FAVORITES_KEY = 'saerobus.busFavorites.v1';

export function loadBusFavorites(): BusInfo[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BusInfo[]) : [];
  } catch {
    return [];
  }
}

export function saveBusFavorites(list: BusInfo[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const goHub = () =>
  window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }));

const busBadgeBg: Record<BusInfo['type'], string> = {
  express: 'bg-emerald-800',
  trunk: 'bg-emerald-700',
  branch: 'bg-emerald-500',
  local: 'bg-emerald-400',
};

const busTypeName: Record<BusInfo['type'], string> = {
  express: '광역',
  trunk: '간선',
  branch: '지선',
  local: '마을',
};

export const FALLBACK_BUSES: BusInfo[] = [
  { number: '101', name: '전북대종점 - 이마트', type: 'trunk', firstBus: '06:00', lastBus: '22:10', interval: '10-15분' },
  { number: '501', name: '평화동종점 - 봉동회차지', type: 'trunk', firstBus: '05:57', lastBus: '22:30', interval: '10-15분' },
  { number: '554', name: '고속버스터미널입구 - 둔산코아루2차아파트', type: 'branch', firstBus: '05:55', lastBus: '22:25', interval: '15-20분' },
  { number: '3001', name: '송천동종점 - 평화동종점', type: 'trunk', firstBus: '06:07', lastBus: '22:30', interval: '8-12분' },
  { number: '354', name: '충경로객사 - 우석대종점', type: 'branch', firstBus: '06:00', lastBus: '22:00', interval: '20-25분' },
];

export const busTypeFromNo = (number: string): BusInfo['type'] => {
  if (number.length >= 4) return 'express';
  const n = Number(number);
  if (Number.isFinite(n) && n >= 500) return 'branch';
  if (Number.isFinite(n) && n < 100) return 'local';
  return 'trunk';
};

function normalizeDeparture(raw: string): number | null {
  const digits = raw.replace(/\D/g, '').padStart(4, '0');
  const h = Number(digits.slice(0, 2));
  const m = Number(digits.slice(2, 4));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatApiInterval(departures: string[]): string {
  const minutes = departures
    .map(normalizeDeparture)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (minutes.length < 2) return '간격 정보 없음';

  const gaps: number[] = [];
  for (let i = 1; i < minutes.length; i += 1) {
    gaps.push(minutes[i] - minutes[i - 1]);
  }

  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  if (minGap === maxGap) return `${minGap}분`;
  if (maxGap - minGap <= 2) return `약 ${Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)}분`;
  return `${minGap}~${maxGap}분`;
}

const routeToBusInfo = (route: RouteSummary, interval: string): BusInfo => ({
  stdid: route.stdid,
  number: route.brt_no,
  name: `${route.start_name || '기점'} - ${route.end_name || '종점'}`,
  type: busTypeFromNo(route.brt_no),
  firstBus: blogApi.hhmm(route.first_time) || '--:--',
  lastBus: blogApi.hhmm(route.last_time) || '--:--',
  interval,
  source: 'api',
});

const STOP_POOL = [
  '시청 정류장', '중앙로', '동산동 주민센터', '전통시장 입구', '대학교 정문',
  '시립병원', '근린공원', '문화회관 앞', '체육관 사거리', '백화점',
  '버스 터미널', '기차역 광장', '고등학교 앞', '도서관', '우체국 사거리',
];

export interface Stop {
  stopId?: number;
  stopOrd?: number;
  name: string;
  lat: number;
  lon: number;
}

// Roughly central 전주 — stops are scattered around this anchor.
const STOPS_ANCHOR = { lat: 35.8242, lon: 127.1480 };

function hashNumber(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function mockStops(bus: BusInfo): Stop[] {
  const seed = hashNumber(bus.number);
  const [start, end] = bus.name.split(' - ');
  const count = 5 + (seed % 4);
  const names = [start ?? '기점'];
  for (let i = 0; i < count; i += 1) {
    names.push(STOP_POOL[(seed + i * 7) % STOP_POOL.length]);
  }
  names.push(end ?? '종점');

  // Lay the stops on a gentle arc around the anchor so distances feel real.
  const baseAngle = ((seed % 360) * Math.PI) / 180;
  return names.map((name, i) => {
    const angle = baseAngle + (i / names.length) * Math.PI * 1.2;
    const radius = 0.004 + i * 0.0015; // ~150m per step
    return {
      name,
      lat: STOPS_ANCHOR.lat + Math.sin(angle) * radius,
      lon: STOPS_ANCHOR.lon + Math.cos(angle) * radius,
    };
  });
}

export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

type Crowd = '여유' | '보통' | '혼잡';

interface RunningBus {
  stopIndex: number;
  crowd: Crowd;
}

function mockRunningBuses(bus: BusInfo, stopCount: number): RunningBus[] {
  const seed = hashNumber(bus.number);
  const crowds: Crowd[] = ['여유', '보통', '혼잡'];
  const count = Math.min(stopCount - 1, 2 + (seed % 3));
  const spacing = Math.max(1, Math.floor(stopCount / (count + 1)));
  return Array.from({ length: count }, (_, i) => ({
    stopIndex: Math.min(stopCount - 1, (i + 1) * spacing),
    crowd: crowds[(seed + i) % 3],
  }));
}

interface ArrivalAtStop {
  minutes: number;
  stopsAway: number;
  crowd: Crowd;
  source?: 'api' | 'mock';
}

export interface Dispatch {
  time: string; // "HH:mm"
  minutesUntil: number;
}

function parseIntervalMin(interval: string): number {
  const m = interval.match(/(\d+)/);
  return m ? Math.max(3, Number(m[1])) : 10;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function mockNextDispatches(bus: BusInfo, count = 3): Dispatch[] {
  const seed = hashNumber(bus.number);
  const intervalMin = parseIntervalMin(bus.interval);
  const now = new Date();
  // Align the first dispatch to roughly 2–9 min away so it feels live.
  const firstOffset = 2 + (seed % 8);
  const start = new Date(now.getTime() + firstOffset * 60_000);
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(start.getTime() + i * intervalMin * 60_000);
    const minutesUntil = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60_000));
    return { time: `${pad2(at.getHours())}:${pad2(at.getMinutes())}`, minutesUntil };
  });
}

// Buses upstream of the chosen stop will eventually arrive there.
// Mock: ~2 minutes per stop, since we don't have real headway data.
function mockArrivalsAtStop(
  buses: RunningBus[],
  stopIndex: number,
): ArrivalAtStop[] {
  return buses
    .filter((b) => b.stopIndex <= stopIndex)
    .map((b) => {
      const stopsAway = Math.max(0, stopIndex - b.stopIndex);
      return {
        minutes: Math.max(1, stopsAway * 2),
        stopsAway,
        crowd: b.crowd,
      };
    })
    .sort((a, b) => a.minutes - b.minutes);
}

const crowdColor: Record<Crowd, string> = {
  여유: 'text-emerald-700 bg-emerald-50',
  보통: 'text-amber-700 bg-amber-50',
  혼잡: 'text-rose-700 bg-rose-50',
};

export function BusPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'number' | 'route'>('number');
  const [favorites, setFavorites] = useState<BusInfo[]>([]);
  const [apiBuses, setApiBuses] = useState<BusInfo[]>([]);
  const [selectedBus, setSelectedBus] = useState<BusInfo | null>(null);
  const [, setTick] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    let alive = true;
    const stored = loadBusFavorites();
    setFavorites(stored);
    blogApi
      .listRoutes()
      .then(async (routes) => {
        if (!alive) return;
        const seen = new Set<string>();
        const buses = await Promise.all(
          routes.map(async (route) => {
            let interval = '간격 정보 없음';
            try {
              const departures = await blogApi.getRouteDepartures(route.stdid);
              interval = formatApiInterval(departures.departures);
            } catch {
              interval = '간격 정보 없음';
            }
            return routeToBusInfo(route, interval);
          }),
        );
        const unique = buses
          .filter((bus) => {
            const key = `${bus.number}-${bus.stdid}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setApiBuses(unique);
      })
      .catch(() => {
        if (alive) setApiBuses([]);
      });
    try {
      const pending = sessionStorage.getItem('saerobus.openBus');
      if (pending) {
        sessionStorage.removeItem('saerobus.openBus');
        const found =
          stored.find((b) => b.number === pending) ??
          apiBuses.find((b) => b.number === pending) ??
          FALLBACK_BUSES.find((b) => b.number === pending);
        if (found) setSelectedBus(found);
      }
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
    };
  }, []);

  // Auto-refresh every 5s so countdowns stay fresh.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = () => {
    setFavorites(loadBusFavorites());
    setTick((t) => t + 1);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 600);
  };

  const favoriteNumbers = new Set(favorites.map((f) => f.number));
  const catalog = apiBuses.length > 0 ? apiBuses : FALLBACK_BUSES;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasSearch = normalizedQuery.length > 0;

  const toggleFavorite = (bus: BusInfo) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.number === bus.number);
      const next = exists
        ? prev.filter((f) => f.number !== bus.number)
        : [...prev, bus];
      saveBusFavorites(next);
      return next;
    });
  };

  const fab = (
    <button
      type="button"
      onClick={refresh}
      className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-emerald-700 text-white shadow-lg flex items-center justify-center active:scale-95 transition"
      aria-label="새로고침"
    >
      <Refresh sx={{ fontSize: 22 }} className={spinning ? 'animate-spin' : ''} />
    </button>
  );

  if (selectedBus) {
    return (
      <>
        <BusDetailView
          bus={selectedBus}
          isFavorite={favoriteNumbers.has(selectedBus.number)}
          onBack={() => setSelectedBus(null)}
          onToggleFavorite={() => toggleFavorite(selectedBus)}
        />
        {fab}
      </>
    );
  }

  const matches = (b: BusInfo) =>
    searchMode === 'number'
      ? b.number.includes(normalizedQuery)
      : b.name.toLowerCase().includes(normalizedQuery);

  const handleSearchChange = (value: string) => {
    if (searchMode === 'number') {
      setSearchQuery(value.replace(/\D/g, ''));
      return;
    }
    setSearchQuery(value);
  };

  const visibleFavorites = hasSearch ? favorites.filter(matches) : favorites;
  const visiblePopular = hasSearch
    ? catalog.filter(matches).slice(0, 20)
    : catalog.filter((b) => !favoriteNumbers.has(b.number)).slice(0, 5);

  const noResults = hasSearch && visibleFavorites.length === 0 && visiblePopular.length === 0;

  return (
    <>
      <div className="size-full bg-[#EAF4F0] overflow-auto">
      <div className="max-w-md mx-auto min-h-full pb-6">
        {/* Header */}
        <div className="px-4 pt-2 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goHub}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">버스 검색</h1>
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="card-grad rounded-2xl p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSearchMode('number')}
                className={`h-10 rounded-xl text-sm font-semibold transition ${
                  searchMode === 'number'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-600'
                }`}
                aria-pressed={searchMode === 'number'}
              >
                버스 번호 검색
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('route')}
                className={`h-10 rounded-xl text-sm font-semibold transition ${
                  searchMode === 'route'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-600'
                }`}
                aria-pressed={searchMode === 'route'}
              >
                노선명 검색
              </button>
            </div>
            <div className="px-3 py-3 flex items-center gap-2 rounded-xl bg-white">
              <Search className="text-gray-400" />
              <input
                type="text"
                inputMode={searchMode === 'number' ? 'numeric' : 'text'}
                placeholder={searchMode === 'number' ? '버스 번호를 검색하세요' : '노선명을 검색하세요'}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="flex-1 outline-none bg-transparent text-sm min-w-0"
              />
            </div>
            <p className="px-1 pt-2 text-[11px] text-gray-500">
              {searchMode === 'number' ? '버스 번호만 검색합니다.' : '노선명만 검색합니다.'}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* My buses — shown first if any */}
          {visibleFavorites.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-1">
                <Star sx={{ fontSize: 16 }} className="text-amber-500" />
                내 버스
              </h2>
              <div className="space-y-3">
                {visibleFavorites.map((bus) => (
                  <BusCard
                    key={`fav-${bus.number}`}
                    bus={bus}
                    isFavorite
                    onSelect={() => setSelectedBus(bus)}
                    onToggleFavorite={() => toggleFavorite(bus)}
                    searchMode={hasSearch ? searchMode : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Popular / search results */}
          {visiblePopular.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-600 mb-3">
                {hasSearch
                  ? `${searchMode === 'number' ? '버스 번호' : '노선명'} 검색 결과 (${visiblePopular.length})`
                  : '인기 노선'}
              </h2>
              <div className="space-y-3">
                {visiblePopular.map((bus) => (
                  <BusCard
                    key={bus.number}
                    bus={bus}
                    isFavorite={favoriteNumbers.has(bus.number)}
                    onSelect={() => setSelectedBus(bus)}
                    onToggleFavorite={() => toggleFavorite(bus)}
                    searchMode={hasSearch ? searchMode : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty states */}
          {!hasSearch && favorites.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              ★ 별을 눌러 자주 타는 버스를 등록해 보세요.
            </p>
          )}
          {noResults && (
            <div className="flex flex-col items-center justify-center h-72 text-gray-500">
              <DirectionsBus sx={{ fontSize: 64, opacity: 0.3 }} className="text-emerald-700" />
              <p className="mt-4 text-center">
                {searchMode === 'number' ? '버스 번호 검색 결과가 없습니다' : '노선명 검색 결과가 없습니다'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    {fab}
    </>
  );
}

interface BusCardProps {
  bus: BusInfo;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  searchMode?: 'number' | 'route';
}

function BusCard({ bus, isFavorite, onSelect, onToggleFavorite, searchMode }: BusCardProps) {
  const stopStar = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div className="card-grad rounded-2xl shadow-sm relative">
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 text-left active:scale-[0.99] transition"
      >
        <div className="flex items-center justify-between mb-3 pr-8">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`${busBadgeBg[bus.type]} text-white rounded-lg ${
                searchMode === 'route' ? 'px-3 py-1.5 min-w-[58px]' : 'px-4 py-2 min-w-[70px]'
              } text-center shrink-0`}
            >
              <div className={`font-bold ${searchMode === 'route' ? 'text-base' : 'text-lg'}`}>{bus.number}</div>
            </div>
            <div className="min-w-0">
              {searchMode === 'route' ? (
                <>
                  <div className="text-xs font-semibold text-emerald-700">노선명 검색</div>
                  <div className="font-bold text-gray-900 truncate">{bus.name}</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-gray-900 truncate">{bus.name}</div>
                  <div className="text-xs text-gray-500">{busTypeName[bus.type]}버스</div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500">첫차</div>
            <div className="font-medium">{bus.firstBus}</div>
          </div>
          <div>
            <div className="text-gray-500">막차</div>
            <div className="font-medium">{bus.lastBus}</div>
          </div>
          <div>
            <div className="text-gray-500">배차간격</div>
            <div className="font-medium">{bus.interval}</div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={stopStar}
        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition"
        aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
        aria-pressed={isFavorite}
      >
        {isFavorite ? (
          <Star sx={{ fontSize: 24 }} className="text-amber-500" />
        ) : (
          <StarBorder sx={{ fontSize: 24 }} className="text-gray-400" />
        )}
      </button>
    </div>
  );
}

interface BusDetailViewProps {
  bus: BusInfo;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

type LocationState =
  | { status: 'pending' }
  | { status: 'ready'; coord: { lat: number; lon: number } }
  | { status: 'denied' };

export function BusDetailView({ bus, isFavorite, onBack, onToggleFavorite }: BusDetailViewProps) {
  const [routeDetail, setRouteDetail] = useState<RouteDetailResponse | null>(null);
  const [apiRunningBuses, setApiRunningBuses] = useState<RunningBus[] | null>(null);
  const [apiDepartures, setApiDepartures] = useState<Dispatch[] | null>(null);
  const [apiFirstBusTime, setApiFirstBusTime] = useState<string | null>(null);
  const [apiArrivals, setApiArrivals] = useState<ArrivalAtStop[] | null>(null);

  useEffect(() => {
    if (!bus.stdid) return;
    let alive = true;
    blogApi
      .getRoute(bus.stdid)
      .then((detail) => {
        if (alive) setRouteDetail(detail);
      })
      .catch(() => {
        if (alive) setRouteDetail(null);
      });
    blogApi
      .getRouteBuses(bus.stdid)
      .then((items) => {
        if (!alive) return;
        setApiRunningBuses(
          items
            .filter((item) => typeof item.stop_ord === 'number')
            .map((item) => ({
              stopIndex: Math.max(0, Number(item.stop_ord) - 1),
              crowd: '보통' as Crowd,
            })),
        );
      })
      .catch(() => {
        if (alive) setApiRunningBuses(null);
      });
    blogApi
      .getRouteDepartures(bus.stdid)
      .then((list) => {
        if (!alive) return;
        const now = new Date();
        const todayMin = now.getHours() * 60 + now.getMinutes();
        const next = list.departures
          .map((raw) => {
            const normalized = raw.replace(/\D/g, '').padStart(4, '0');
            const h = Number(normalized.slice(0, 2));
            const m = Number(normalized.slice(2, 4));
            const total = h * 60 + m;
            const minutesUntil = total >= todayMin ? total - todayMin : total + 24 * 60 - todayMin;
            return { time: `${pad2(h)}:${pad2(m)}`, minutesUntil };
          })
          .sort((a, b) => a.minutesUntil - b.minutesUntil)
          .filter((d) => d.minutesUntil < 24 * 60 - todayMin)
          .slice(0, 3);
        const first = list.departures
          .map((raw) => raw.replace(/\D/g, '').padStart(4, '0'))
          .sort()[0];
        setApiFirstBusTime(first ? `${first.slice(0, 2)}:${first.slice(2, 4)}` : null);
        setApiDepartures(next);
      })
      .catch(() => {
        if (alive) setApiDepartures(null);
      });
    return () => {
      alive = false;
    };
  }, [bus.stdid]);

  const stops = useMemo(
    () =>
      routeDetail?.stops.map((stop) => ({
        stopId: stop.stop_id,
        stopOrd: stop.stop_ord,
        name: stop.stop_name,
        lat: stop.lat,
        lon: stop.lng,
      })) ?? mockStops(bus),
    [bus, routeDetail],
  );
  const runningBuses = apiRunningBuses ?? mockRunningBuses(bus, stops.length);
  const busesByStop = new Map<number, RunningBus[]>();
  runningBuses.forEach((rb) => {
    const stopIndex = Math.max(0, Math.min(stops.length - 1, rb.stopIndex));
    const list = busesByStop.get(stopIndex) ?? [];
    list.push(rb);
    busesByStop.set(stopIndex, list);
  });

  const [location, setLocation] = useState<LocationState>({ status: 'pending' });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: 'denied' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          status: 'ready',
          coord: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        }),
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  }, []);

  let nearestStopIndex: number | null = null;
  let nearestDistance: number | null = null;
  if (location.status === 'ready') {
    let best = Infinity;
    stops.forEach((s, i) => {
      const d = haversineMeters(location.coord, { lat: s.lat, lon: s.lon });
      if (d < best) {
        best = d;
        nearestStopIndex = i;
      }
    });
    nearestDistance = best;
  }

  const arrivalsAtNearest =
    apiArrivals ?? (nearestStopIndex !== null ? mockArrivalsAtStop(runningBuses, nearestStopIndex) : []);

  useEffect(() => {
    if (nearestStopIndex === null) {
      setApiArrivals(null);
      return;
    }
    const stopId = stops[nearestStopIndex]?.stopId;
    if (!stopId) {
      setApiArrivals(null);
      return;
    }
    let alive = true;
    blogApi
      .getStopArrivals(stopId)
      .then((board) => {
        if (!alive) return;
        const arrivals = board.arrivals
          .filter((item) => item.brt_no === bus.number || item.stdid === bus.stdid)
          .map((item) => ({
            minutes: item.eta_sec ? Math.max(1, Math.round(item.eta_sec / 60)) : Math.max(1, item.stops_away * 2),
            stopsAway: item.stops_away,
            crowd: '보통' as Crowd,
            source: 'api' as const,
          }))
          .sort((a, b) => a.minutes - b.minutes);
        setApiArrivals(arrivals);
      })
      .catch(() => {
        if (alive) setApiArrivals(null);
      });
    return () => {
      alive = false;
    };
  }, [bus.number, bus.stdid, nearestStopIndex, stops]);

  const nextDispatches = apiDepartures ?? mockNextDispatches(bus, 3);

  return (
    <div className="size-full bg-[#EAF4F0] overflow-auto">
      <div className="max-w-md mx-auto min-h-full pb-6">
        {/* Header */}
        <div className="px-4 pt-2 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
              aria-label="뒤로"
            >
              <ArrowBack />
            </button>
            <h1 className="text-xl font-extrabold text-gray-900 truncate">
              {bus.number}번 버스
            </h1>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
            aria-pressed={isFavorite}
          >
            {isFavorite ? (
              <Star sx={{ fontSize: 22 }} className="text-amber-500" />
            ) : (
              <StarBorder sx={{ fontSize: 22 }} className="text-gray-400" />
            )}
          </button>
        </div>

        <div className="px-4 space-y-3">
          {/* Route summary */}
          <div className="card-grad rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`${busBadgeBg[bus.type]} text-white rounded-lg px-4 py-2 min-w-[70px] text-center shrink-0`}
              >
                <div className="font-bold text-lg">{bus.number}</div>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-gray-900 truncate">{bus.name}</div>
              <div className="text-xs text-gray-500">
                {busTypeName[bus.type]}버스{bus.source === 'api' ? ' · API' : ''}
              </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-gray-100">
              <div>
                <div className="text-gray-500 flex items-center gap-1">
                  <Schedule sx={{ fontSize: 12 }} />첫차
                </div>
                <div className="font-medium">{bus.firstBus}</div>
              </div>
              <div>
                <div className="text-gray-500 flex items-center gap-1">
                  <Schedule sx={{ fontSize: 12 }} />막차
                </div>
                <div className="font-medium">{bus.lastBus}</div>
              </div>
              <div>
                <div className="text-gray-500 flex items-center gap-1">
                  <AccessTime sx={{ fontSize: 12 }} />배차
                </div>
                <div className="font-medium">{bus.interval}</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <AccessTime sx={{ fontSize: 12 }} />
                다음 배차
              </div>
              <div className="flex gap-2 flex-wrap">
                {nextDispatches.length > 0 ? (
                  nextDispatches.map((d, i) => (
                    <div
                      key={d.time}
                      className={`rounded-xl px-3 py-2 ${
                        i === 0
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <div className="text-sm font-extrabold tabular-nums leading-none">
                        {d.time}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${i === 0 ? 'opacity-90' : 'opacity-70'}`}>
                        {d.minutesUntil <= 0 ? '곧 출발' : `${d.minutesUntil}분 후`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full rounded-xl bg-amber-50 text-amber-800 px-3 py-2 text-sm font-semibold">
                    오늘은 탑승 가능한 버스가 없어요
                    {apiFirstBusTime ? (
                      <span className="block text-xs font-medium mt-0.5">
                        다음 첫차는 내일 {apiFirstBusTime} 출발이에요.
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nearest stop based on user's location */}
          <div className="card-grad rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-1">
              <FiberManualRecord sx={{ fontSize: 10 }} className="text-rose-500 animate-pulse" />
              내 근처 정류장
            </div>

            {location.status === 'pending' && (
              <p className="text-xs text-gray-500 mt-2">위치를 확인하고 있어요…</p>
            )}

            {location.status === 'denied' && (
              <p className="text-xs text-gray-500 mt-2">
                위치 권한이 없어서 가장 가까운 정류장을 못 찾았어요. 아래 노선에서 직접 확인해 주세요.
              </p>
            )}

            {location.status === 'ready' && nearestStopIndex !== null && (
              <>
                <div className="mt-2 flex items-center gap-3 bg-white rounded-xl px-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                    <Place sx={{ fontSize: 18 }} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {stops[nearestStopIndex].name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {nearestDistance !== null
                        ? `내 위치에서 ${formatDistance(nearestDistance)}`
                        : '거리 정보 없음'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] font-semibold text-gray-600 mb-2">
                  도착 예정
                </div>
                {arrivalsAtNearest.length > 0 ? (
                  <div className="space-y-2">
                    {arrivalsAtNearest.slice(0, 2).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-center min-w-[52px]">
                            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                              {a.minutes}
                            </div>
                            <div className="text-[10px] text-gray-500">분 후</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">
                              {a.stopsAway === 0 ? '곧 도착' : `${a.stopsAway}개 정류장 전`}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-[11px] font-semibold rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0 ${crowdColor[a.crowd]}`}
                        >
                          <People sx={{ fontSize: 12 }} />
                          {a.crowd}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    이 정류장으로 오는 버스가 아직 없어요. 곧 새 차량이 출발해요.
                  </p>
                )}
              </>
            )}

            <p className="text-[11px] text-gray-400 mt-2">
              ※ {bus.stdid ? '제공된 API 기준으로 갱신돼요. dummy 응답은 API 표시와 다를 수 있어요.' : '시연용 예시 데이터입니다. 실시간 연동 시 갱신돼요.'}
            </p>
          </div>

          {/* Stops list */}
          <div className="card-grad rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3">
              <Place sx={{ fontSize: 16 }} className="text-emerald-700" />
              정류장 노선
              <span className="text-xs text-gray-500 font-normal">· {stops.length}개</span>
            </div>
            <ol className="relative">
              {stops.map((stop, i) => {
                const busesHere = busesByStop.get(i) ?? [];
                const hasBus = busesHere.length > 0;
                const isStart = i === 0;
                const isEnd = i === stops.length - 1;
                const isNearest = i === nearestStopIndex;
                return (
                  <li key={`${stop.name}-${i}`} className="flex items-start gap-3 pb-3 last:pb-0 relative">
                    {/* Line spine */}
                    {!isEnd && (
                      <div className="absolute left-[11px] top-5 bottom-0 w-px bg-emerald-200" />
                    )}
                    {/* Marker */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                        hasBus
                          ? 'bg-emerald-700'
                          : isNearest
                            ? 'bg-amber-500'
                            : isStart || isEnd
                              ? 'bg-emerald-500'
                              : 'bg-white border-2 border-emerald-300'
                      }`}
                    >
                      {hasBus && (
                        <DirectionsBus sx={{ fontSize: 14 }} className="text-white" />
                      )}
                      {!hasBus && isNearest && (
                        <Place sx={{ fontSize: 14 }} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm truncate ${
                            hasBus
                              ? 'font-extrabold text-emerald-800'
                              : isNearest
                                ? 'font-extrabold text-amber-700'
                                : isStart || isEnd
                                  ? 'font-bold text-gray-900'
                                  : 'text-gray-700'
                          }`}
                        >
                          {stop.name}
                        </span>
                        {isStart && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                            기점
                          </span>
                        )}
                        {isEnd && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                            종점
                          </span>
                        )}
                        {isNearest && (
                          <span className="text-[10px] font-semibold text-white bg-amber-500 rounded-full px-2 py-0.5">
                            내 근처
                          </span>
                        )}
                        {hasBus && (
                          <span className="text-[10px] font-semibold text-white bg-emerald-700 rounded-full px-2 py-0.5">
                            {busesHere.length > 1 ? `${busesHere.length}대 운행 중` : '운행 중'}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
