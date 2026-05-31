import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Notifications,
  Menu as MenuIcon,
  Route as RouteIcon,
  DirectionsBus,
  Map as MapIcon,
  Alarm as AlarmIcon,
  Close,
  WbSunny,
  LightMode,
  Bedtime,
  DarkMode,
  OpenInNew,
  Home,
  School,
  Work,
  MenuBook,
  Place,
  Star,
  Schedule,
  DirectionsWalk,
  ChevronRight,
} from '@mui/icons-material';
import { HomePage } from './HomePage';
import { ActiveTripCard } from './ActiveTripCard';
import { SideMenu, type SideMenuKey } from './SideMenu';
import { ProfilePage } from './ProfilePage';
import { loadUpcomingTrip, type UpcomingTrip } from '../lib/upcoming';
import { clearActiveTrip } from '../lib/activeTrip';
import { loadRecentPlaces, type RecentPlace } from './RecentPlacesSection';
import { OriBusScene } from './OriBusScene';
import {
  loadBusFavorites,
  mockNextDispatches,
  mockStops,
  haversineMeters,
  type BusInfo,
} from './BusPage';
import {
  loadMockWeather,
  fetchRealWeather,
  pickWeatherTip,
  pm10Grade,
  busImpactNote,
  WEATHER_LABELS,
  CONDITION_ICONS,
} from '../lib/weather';

interface Tile {
  id: 'route' | 'bus' | 'map' | 'alarm';
  label: string;
  sub: string;
  Icon: typeof RouteIcon;
  /** Highlight as the primary action — filled green */
  primary?: boolean;
  /** Tab index to switch to (omit for handled-in-place) */
  tabIndex?: number;
}

type Daypart = 'morning' | 'afternoon' | 'evening' | 'night';

function getDaypart(date = new Date()): Daypart {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const DAYPART_META: Record<Daypart, { label: string; Icon: typeof WbSunny; duck: string }> = {
  morning: { label: '오늘 아침', Icon: WbSunny, duck: '/ducks/heart.png' },
  afternoon: { label: '오늘 낮', Icon: LightMode, duck: '/ducks/star.png' },
  evening: { label: '오늘 저녁', Icon: Bedtime, duck: '/ducks/happy.png' },
  night: { label: '오늘 밤', Icon: DarkMode, duck: '/ducks/sleep.png' },
};

/** Foreground colour for the big temperature reading. */
function tempColor(c: number): string {
  if (c >= 30) return '#DC2626'; // very hot
  if (c >= 26) return '#EA580C'; // hot
  if (c <= 0) return '#1D4ED8';  // very cold
  if (c <= 5) return '#2563EB';  // cold
  if (c <= 10) return '#3B82F6'; // chilly
  return '#14322E';              // neutral / forest ink
}

/** Foreground colour for PM10 reading, matching Korean grade bands. */
function pm10Color(pm: number): string {
  if (pm <= 30) return '#059669';  // 좋음 — emerald
  if (pm <= 80) return '#CA8A04';  // 보통 — yellow
  if (pm <= 150) return '#EA580C'; // 나쁨 — orange
  return '#DC2626';                // 매우 나쁨 — red
}

type Purpose = 'school' | 'work' | 'academy' | 'other';

const PURPOSE_META: Record<Purpose, { label: string; Icon: typeof School }> = {
  school: { label: '학교', Icon: School },
  work: { label: '회사', Icon: Work },
  academy: { label: '학원', Icon: MenuBook },
  other: { label: '자주 가는 곳', Icon: Place },
};

function loadProfile(): { nickname: string; purpose: Purpose | null } {
  try {
    const raw = localStorage.getItem('saerobus.profile.v1');
    if (!raw) return { nickname: '', purpose: null };
    const parsed = JSON.parse(raw);
    const nickname = typeof parsed?.nickname === 'string' ? parsed.nickname : '';
    const purpose: Purpose | null =
      parsed?.purpose === 'school' ||
      parsed?.purpose === 'work' ||
      parsed?.purpose === 'academy' ||
      parsed?.purpose === 'other'
        ? parsed.purpose
        : null;
    return { nickname, purpose };
  } catch {
    return { nickname: '', purpose: null };
  }
}

interface FavoritePlace {
  address: string;
  lat?: number;
  lng?: number;
}

function loadOnboardingFavorites(): { home: FavoritePlace | null; frequent: FavoritePlace | null } {
  try {
    const raw = localStorage.getItem('saerobus.places.v1');
    if (!raw) return { home: null, frequent: null };
    const parsed = JSON.parse(raw);
    return {
      home: parsed?.home?.address ? parsed.home : null,
      frequent: parsed?.frequent?.address ? parsed.frequent : null,
    };
  } catch {
    return { home: null, frequent: null };
  }
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토',
};

function loadTodayArrival(): string | null {
  try {
    const raw = localStorage.getItem('saerobus.places.v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const schedule = parsed?.arrivalSchedule;
    if (!schedule || typeof schedule !== 'object') return null;
    const todayKey = DAY_KEYS[new Date().getDay()];
    return typeof schedule[todayKey] === 'string' ? schedule[todayKey] : null;
  } catch {
    return null;
  }
}

interface BigTileSpec {
  key: 'route' | 'bus';
  label: string;
  sub: string;
  Icon: typeof RouteIcon;
  primary?: boolean;
}
interface SmallTileSpec {
  key: 'map' | 'alarm';
  label: string;
  sub: string;
  Icon: typeof RouteIcon;
  tabIndex: number;
}

const BIG_TILES: BigTileSpec[] = [
  { key: 'route', label: '경로 찾기', sub: '도착 시각으로 출발 시간 추천', Icon: RouteIcon, primary: true },
  { key: 'bus',   label: '버스',     sub: '노선·정류장 검색',           Icon: DirectionsBus },
];
const SMALL_TILES: SmallTileSpec[] = [
  { key: 'map',   label: '지도', sub: '실시간 위치·노선 보기', Icon: MapIcon,   tabIndex: 2 },
  { key: 'alarm', label: '알람', sub: '도착·출발 알림 관리',   Icon: AlarmIcon, tabIndex: 3 },
];

// Signal-light styling driven by minutes until "나가세요"
function signalStyles(minutes: number) {
  if (minutes <= 1) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      head: 'text-amber-900',
      sub: 'text-amber-700',
      badge: 'bg-amber-500 text-white',
    };
  }
  if (minutes <= 5) {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      head: 'text-emerald-900',
      sub: 'text-emerald-700',
      badge: 'bg-emerald-600 text-white',
    };
  }
  return {
    bg: 'bg-white',
    border: 'border-gray-200',
    head: 'text-gray-900',
    sub: 'text-gray-600',
    badge: 'bg-gray-200 text-gray-700',
  };
}

const MENU_LABELS: Record<SideMenuKey, string> = {
  profile: '나의 정보',
  notices: '공지사항',
  help: '서비스 안내',
  contact: '문의하기',
  about: '앱 정보',
};

export function RouteHub() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingTrip | null>(null);
  const [nickname, setNickname] = useState('');
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [daypart] = useState(() => getDaypart());
  const DaypartIcon = DAYPART_META[daypart].Icon;
  const [weather, setWeather] = useState(() => loadMockWeather());
  useEffect(() => {
    let cancelled = false;
    fetchRealWeather().then((real) => {
      if (real && !cancelled) setWeather(real);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const weatherTip = useMemo(() => pickWeatherTip(weather), [weather]);
  const ConditionIcon = CONDITION_ICONS[weather.condition];

  // Re-check upcoming trip on mount, on focus, and once a minute
  useEffect(() => {
    const refresh = () => setUpcoming(loadUpcomingTrip());
    refresh();
    const id = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [searchOpen]);

  const [favorites, setFavorites] = useState<{ home: FavoritePlace | null; frequent: FavoritePlace | null }>({
    home: null,
    frequent: null,
  });
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const [busFavorites, setBusFavorites] = useState<BusInfo[]>([]);

  useEffect(() => {
    const applyProfile = () => {
      const profile = loadProfile();
      setNickname(profile.nickname);
      setPurpose(profile.purpose);
    };
    applyProfile();
    setFavorites(loadOnboardingFavorites());
    setRecents(loadRecentPlaces());
    setBusFavorites(loadBusFavorites());
    setTodayArrival(loadTodayArrival());
    const refresh = () => {
      applyProfile();
      setFavorites(loadOnboardingFavorites());
      setRecents(loadRecentPlaces());
      setBusFavorites(loadBusFavorites());
      setTodayArrival(loadTodayArrival());
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [searchOpen]);

  const frequentMeta = purpose ? PURPOSE_META[purpose] : PURPOSE_META.other;
  const [todayArrival, setTodayArrival] = useState<string | null>(() => loadTodayArrival());
  const recentPreview = recents.slice(0, 3);
  const busFavoritePreview: BusInfo[] = [];

  type Loc =
    | { status: 'pending' }
    | { status: 'ready'; coord: { lat: number; lon: number } }
    | { status: 'denied' };
  const [loc, setLoc] = useState<Loc>({ status: 'pending' });

  // Only ask for location if the user actually has buses to track.
  useEffect(() => {
    if (busFavoritePreview.length === 0) return;
    if (loc.status !== 'pending') return;
    if (!navigator.geolocation) {
      setLoc({ status: 'denied' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          status: 'ready',
          coord: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        }),
      () => setLoc({ status: 'denied' }),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  }, [busFavoritePreview.length, loc.status]);

  // Tick every 5 s so the countdown stays fresh — only while there are buses to count down to.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (busFavoritePreview.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, [busFavoritePreview.length]);

  const DEFAULT_WALK_MIN = 5;
  const WALK_SPEED_MPM = 72;

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const computeDeparture = (bus: BusInfo) => {
    // Pick a dispatch we can still reasonably catch
    const dispatches = mockNextDispatches(bus, 3);
    let walkMin = DEFAULT_WALK_MIN;
    let nearestName: string | null = null;
    if (loc.status === 'ready') {
      const stops = mockStops(bus);
      let best = Infinity;
      let bestIdx = -1;
      stops.forEach((s, i) => {
        const d = haversineMeters(loc.coord, { lat: s.lat, lon: s.lon });
        if (d < best) {
          best = d;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) {
        walkMin = Math.max(1, Math.round(best / WALK_SPEED_MPM));
        nearestName = stops[bestIdx].name;
      }
    }
    const chosen =
      dispatches.find((d) => d.minutesUntil - walkMin >= -1) ?? dispatches[0];
    const now = new Date();
    const departAt = new Date(now.getTime() + (chosen.minutesUntil - walkMin) * 60_000);
    const minutesUntilDepart = chosen.minutesUntil - walkMin;
    return {
      dispatchTime: chosen.time,
      departTime: `${pad2(departAt.getHours())}:${pad2(departAt.getMinutes())}`,
      minutesUntilDepart,
      walkMin,
      nearestName,
    };
  };

  const openBusDetail = (bus: BusInfo) => {
    try {
      sessionStorage.setItem('saerobus.openBus', bus.number);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('switchTab', { detail: 1 }));
  };

  const handleRecentClick = (place: RecentPlace) => {
    try {
      sessionStorage.setItem('saerobus.quickDestination', place.name || place.address);
    } catch {
      /* ignore */
    }
    setSearchOpen(true);
  };

  const handleQuickPlace = (place: FavoritePlace) => {
    try {
      sessionStorage.setItem('saerobus.quickDestination', place.address);
    } catch {
      /* ignore */
    }
    setSearchOpen(true);
  };

  const handleTileClick = (tile: Tile) => {
    if (typeof tile.tabIndex === 'number') {
      window.dispatchEvent(new CustomEvent('switchTab', { detail: tile.tabIndex }));
    }
  };

  if (profileOpen) {
    return <ProfilePage onBack={() => setProfileOpen(false)} />;
  }

  if (searchOpen) {
    return <HomePage onBack={() => setSearchOpen(false)} />;
  }

  return (
    <div className="size-full overflow-auto bg-[#EAF4F0]">
      <div className="max-w-md mx-auto min-h-full px-4 pt-2 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight text-emerald-700">
            새로버스
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 3 }))}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800"
              aria-label="알람"
            >
              <Notifications />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800"
              aria-label="메뉴"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {upcoming ? (
          <>
            {/* Active trip — dominant block when a trip is in progress */}
            <div className="mt-5">
              <ActiveTripCard
                origin={upcoming.origin}
                destination={upcoming.destination}
                arrivalTime={upcoming.arrivalTime}
                mode={upcoming.mode}
                createdAt={upcoming.createdAt}
                plan={upcoming.plan}
                noServiceReason={upcoming.noServiceReason}
                nextFirstBusTime={upcoming.nextFirstBusTime}
                nextFirstBusLabel={upcoming.nextFirstBusLabel}
                showInsights={false}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                clearActiveTrip();
                setUpcoming(null);
                window.dispatchEvent(new CustomEvent('showToast', { detail: '안내를 종료합니다.' }));
              }}
              className="mt-3 w-full rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-800 bg-white border-2 border-gray-500"
            >
              <Close sx={{ fontSize: 18 }} />
              경로 안내 종료
            </button>

            {/* Bottom nav — 큰 [경로][버스] + 작은 [지도][알람] */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {BIG_TILES.map((tile) => (
                <BigTile
                  key={tile.key}
                  Icon={tile.Icon}
                  label={tile.label}
                  sub={tile.sub}
                  primary={tile.primary}
                  onClick={() =>
                    tile.key === 'route'
                      ? setSearchOpen(true)
                      : window.dispatchEvent(new CustomEvent('switchTab', { detail: 1 }))
                  }
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SMALL_TILES.map((tile) => (
                <SmallTile
                  key={tile.key}
                  Icon={tile.Icon}
                  label={tile.label}
                  sub={tile.sub}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('switchTab', { detail: tile.tabIndex }),
                    )
                  }
                />
              ))}
            </div>
            <OriBusScene />
          </>
        ) : (
          <>
            {/* Weather strip — quiet one-liner; appends a note only when bus is likely affected */}
            {(() => {
              const note = busImpactNote(weather);
              return (
                <a
                  href="https://m.weather.naver.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="네이버 날씨 열기"
                  className="mt-2 flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-xl bg-white text-[12px] text-gray-600 shadow-sm hover:shadow transition"
                >
                  <ConditionIcon sx={{ fontSize: 14 }} className="text-gray-500" />
                  <span className="font-extrabold tabular-nums leading-none">
                    {Math.round(weather.tempC)}°
                  </span>
                  <span className="font-semibold">{WEATHER_LABELS[weather.condition]}</span>
                  <span className="text-gray-400">·</span>
                  <span>
                    미세먼지{' '}
                    <span className="font-semibold">{pm10Grade(weather.pm10)}</span>
                  </span>
                  {note && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="font-semibold">{note}</span>
                    </>
                  )}
                  <OpenInNew sx={{ fontSize: 12 }} className="text-gray-400 ml-auto" />
                </a>
              );
            })()}

            {/* Hero + list (or empty state) */}
            {(() => {
              const departures = busFavoritePreview
                .map((bus) => ({ bus, d: computeDeparture(bus) }))
                .sort((a, b) => a.d.minutesUntilDepart - b.d.minutesUntilDepart);
              const hero = departures[0];
              const rest = departures.slice(1, 4);

              if (!hero) {
                const onboardingDone = Boolean(favorites.home && favorites.frequent);
                const todayLabel = DAY_LABELS[DAY_KEYS[new Date().getDay()]];

                const handleSearch = () => {
                  if (onboardingDone && favorites.frequent) {
                    try {
                      sessionStorage.setItem(
                        'saerobus.quickDestination',
                        favorites.frequent.address,
                      );
                    } catch {
                      /* ignore */
                    }
                  }
                  setSearchOpen(true);
                };

                if (onboardingDone) {
                  // State B-1 — has onboarding context but no confirmed star yet
                  return (
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="mt-3 w-full rounded-3xl bg-white p-5 shadow-md border border-gray-200 text-left active:scale-[0.99] transition"
                    >
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 mb-2">
                        <Schedule sx={{ fontSize: 14 }} className="text-gray-400" />
                        오늘 {todayLabel}요일
                      </div>
                      <p className="text-[20px] font-extrabold text-gray-900 leading-tight tabular-nums">
                        {todayArrival ? `${todayArrival}까지` : '도착 시각 미설정'}
                      </p>
                      {favorites.frequent && (
                        <p className="text-[13px] text-gray-600 mt-1 truncate">
                          → {favorites.frequent.address}
                        </p>
                      )}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-extrabold text-emerald-700">
                          노선 찾고 등록하기
                        </span>
                        <ChevronRight sx={{ fontSize: 20 }} className="text-emerald-700" />
                      </div>
                    </button>
                  );
                }

                // State B-2 — tourist / skipped onboarding. No hero box; the big [경로]/[버스] tiles below are the entry points.
                return null;
              }

              const heroSig = signalStyles(Math.max(0, hero.d.minutesUntilDepart));
              const heroLeaveNow = hero.d.minutesUntilDepart <= 0;

              return (
                <>
                  <button
                    type="button"
                    onClick={() => openBusDetail(hero.bus)}
                    className={`mt-3 w-full rounded-3xl shadow-md border p-5 text-left active:scale-[0.99] transition ${heroSig.bg} ${heroSig.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="rounded-lg bg-emerald-700 text-white px-2.5 py-1 font-extrabold text-sm tabular-nums shrink-0">
                          {hero.bus.number}
                        </div>
                        <span className="text-[12px] text-gray-600 truncate">
                          {hero.bus.name}
                        </span>
                      </div>
                      <Star sx={{ fontSize: 18 }} className="text-amber-500 shrink-0" />
                    </div>

                    <p
                      className={`mt-4 text-[26px] leading-tight font-extrabold tabular-nums ${heroSig.head}`}
                    >
                      {heroLeaveNow ? '지금 나가세요!' : `${hero.d.departTime}에 나가세요`}
                    </p>
                    <p className={`mt-1 text-[14px] font-extrabold ${heroSig.sub}`}>
                      {heroLeaveNow ? '0분 남음' : `${hero.d.minutesUntilDepart}분 남음`}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-200/70 flex items-center gap-2 text-[11px] text-gray-600 flex-wrap">
                      <Schedule sx={{ fontSize: 13 }} className="text-gray-500" />
                      <span>
                        출발{' '}
                        <span className="font-bold tabular-nums">{hero.d.dispatchTime}</span>
                      </span>
                      <span className="text-gray-400">·</span>
                      <DirectionsWalk sx={{ fontSize: 13 }} className="text-gray-500" />
                      <span>
                        도보{' '}
                        <span className="font-bold tabular-nums">{hero.d.walkMin}</span>분
                      </span>
                      {hero.d.nearestName && (
                        <>
                          <span className="text-gray-400">·</span>
                          <Place sx={{ fontSize: 12 }} className="text-gray-500" />
                          <span className="truncate">{hero.d.nearestName}</span>
                        </>
                      )}
                    </div>
                  </button>

                  {rest.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {rest.map(({ bus, d }) => {
                        const sig = signalStyles(Math.max(0, d.minutesUntilDepart));
                        const leaveNow = d.minutesUntilDepart <= 0;
                        return (
                          <button
                            key={bus.number}
                            type="button"
                            onClick={() => openBusDetail(bus)}
                            className={`w-full rounded-2xl shadow-sm border px-3.5 py-3 text-left flex items-center gap-3 active:scale-[0.99] transition ${sig.bg} ${sig.border}`}
                          >
                            <div className="rounded-lg bg-emerald-700 text-white px-2 py-1 font-extrabold text-[13px] tabular-nums shrink-0">
                              {bus.number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[14px] font-extrabold tabular-nums truncate ${sig.head}`}
                              >
                                {leaveNow ? '지금 나가세요' : `${d.departTime}에 나가세요`}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {d.dispatchTime} 출발 · 도보 {d.walkMin}분
                              </p>
                            </div>
                            <div className={`text-right shrink-0 ${sig.sub}`}>
                              <div className="text-[15px] font-extrabold tabular-nums leading-none">
                                {leaveNow ? 0 : d.minutesUntilDepart}
                              </div>
                              <div className="text-[10px] opacity-80 mt-0.5">분 남음</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 mt-2 px-1">
                    {loc.status === 'ready'
                      ? '※ 현재 위치 기준 도보 시간이에요.'
                      : loc.status === 'denied'
                        ? '※ 위치 권한이 없어 도보를 5분으로 가정해요.'
                        : '※ 위치 확인 중… 정확한 도보 시간이 곧 반영돼요.'}
                  </p>
                </>
              );
            })()}

            {/* Bottom nav — 큰 [경로][버스] + 작은 [지도][알람] */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {BIG_TILES.map((tile) => (
                <BigTile
                  key={tile.key}
                  Icon={tile.Icon}
                  label={tile.label}
                  sub={tile.sub}
                  primary={tile.primary}
                  onClick={() =>
                    tile.key === 'route'
                      ? setSearchOpen(true)
                      : window.dispatchEvent(new CustomEvent('switchTab', { detail: 1 }))
                  }
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SMALL_TILES.map((tile) => (
                <SmallTile
                  key={tile.key}
                  Icon={tile.Icon}
                  label={tile.label}
                  sub={tile.sub}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('switchTab', { detail: tile.tabIndex }),
                    )
                  }
                />
              ))}
            </div>
            <OriBusScene />
          </>
        )}
      </div>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(key) => {
          setMenuOpen(false);
          if (key === 'profile') {
            setProfileOpen(true);
            return;
          }
          window.dispatchEvent(
            new CustomEvent('showToast', { detail: `${MENU_LABELS[key]} (준비 중)` })
          );
        }}
      />
    </div>
  );
}

interface BigTileProps {
  Icon: typeof RouteIcon;
  label: string;
  sub: string;
  primary?: boolean;
  onClick: () => void;
}

function BigTile({ Icon, label, sub, primary, onClick }: BigTileProps) {
  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="aspect-square rounded-3xl bg-[#007956] p-4 shadow-md flex flex-col items-start gap-3 active:scale-[0.98] transition text-white"
      >
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          <Icon sx={{ fontSize: 28 }} className="text-white" />
        </div>
        <div className="text-left">
          <p className="font-extrabold text-[17px] leading-tight">{label}</p>
          <p className="text-[11px] opacity-90 mt-1 leading-snug">{sub}</p>
        </div>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square rounded-3xl bg-white p-4 shadow-sm flex flex-col items-start gap-3 active:scale-[0.98] transition"
    >
      <div className="w-12 h-12 rounded-xl bg-[#EAF4F0] text-[#007956] flex items-center justify-center">
        <Icon sx={{ fontSize: 28 }} />
      </div>
      <div className="text-left">
        <p className="font-extrabold text-[#14322E] text-[17px] leading-tight">{label}</p>
        <p className="text-[11px] text-[#5A6B66] mt-1 leading-snug">{sub}</p>
      </div>
    </button>
  );
}

interface SmallTileProps {
  Icon: typeof RouteIcon;
  label: string;
  sub: string;
  onClick: () => void;
}

function SmallTile({ Icon, label, sub, onClick }: SmallTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-[5/4] rounded-3xl bg-white p-3.5 shadow-sm flex flex-col items-start gap-2 active:scale-[0.98] transition"
    >
      <div className="w-10 h-10 rounded-xl bg-[#EAF4F0] text-[#007956] flex items-center justify-center">
        <Icon sx={{ fontSize: 22 }} />
      </div>
      <div className="text-left">
        <p className="font-extrabold text-[#14322E] text-[15px] leading-tight">{label}</p>
        <p className="text-[10px] text-[#5A6B66] mt-0.5 leading-snug">{sub}</p>
      </div>
    </button>
  );
}

interface FavoriteChipProps {
  Icon: typeof Home;
  label: string;
  address: string;
  onClick: () => void;
}

function FavoriteChip({ Icon, label, address, onClick }: FavoriteChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-3 text-left flex items-center gap-3 shadow-sm active:scale-[0.98] transition"
    >
      <div className="w-10 h-10 rounded-xl bg-[#B8E0D2] text-[#005C42] flex items-center justify-center shrink-0">
        <Icon sx={{ fontSize: 22 }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#5A6B66]">{label}</p>
        <p className="text-[12px] font-bold text-[#14322E] truncate">{address}</p>
      </div>
    </button>
  );
}
