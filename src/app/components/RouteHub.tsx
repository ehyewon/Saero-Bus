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
  PriorityHigh,
  OpenInNew,
  Home,
  School,
} from '@mui/icons-material';
import { HomePage } from './HomePage';
import { ActiveTripCard } from './ActiveTripCard';
import { WeatherEffect } from './WeatherEffect';
import { loadUpcomingTrip, type UpcomingTrip } from '../lib/upcoming';
import { clearActiveTrip } from '../lib/activeTrip';
import {
  loadMockWeather,
  fetchRealWeather,
  pickWeatherTip,
  pm10Grade,
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

const URGENT_DUCK = '/ducks/alert.png';
const URGENT_WINDOW_MIN = 30;

function minutesUntilArrival(arrivalTime: string | undefined, now = new Date()): number | null {
  if (!arrivalTime) return null;
  const m = arrivalTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  // If target is already past, assume the trip is happening *now* (not next day).
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

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

function loadNickname(): string {
  try {
    const raw = localStorage.getItem('saerobus.profile.v1');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.nickname === 'string' ? parsed.nickname : '';
  } catch {
    return '';
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

const TILES: Tile[] = [
  { id: 'route', label: '경로', sub: '도착 시각으로 출발 시간 추천', Icon: RouteIcon, primary: true },
  { id: 'bus',   label: '버스', sub: '노선·정류장 검색',           Icon: DirectionsBus, tabIndex: 1 },
  { id: 'map',   label: '지도', sub: '실시간 위치·노선 보기',       Icon: MapIcon, tabIndex: 2 },
  { id: 'alarm', label: '알람', sub: '도착·출발 알림 관리',         Icon: AlarmIcon, tabIndex: 3 },
];

export function RouteHub() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingTrip | null>(null);
  const [nickname, setNickname] = useState('');
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
  const urgent = useMemo(() => {
    if (!upcoming) return false;
    const remaining = minutesUntilArrival(upcoming.arrivalTime);
    return remaining !== null && remaining >= 0 && remaining < URGENT_WINDOW_MIN;
  }, [upcoming]);

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

  useEffect(() => {
    setNickname(loadNickname());
    setFavorites(loadOnboardingFavorites());
    const refresh = () => {
      setNickname(loadNickname());
      setFavorites(loadOnboardingFavorites());
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const handleQuickPlace = (place: FavoritePlace) => {
    try {
      sessionStorage.setItem('saerobus.quickDestination', place.address);
    } catch {
      /* ignore */
    }
    setSearchOpen(true);
  };

  const handleTileClick = (tile: Tile) => {
    if (tile.id === 'route') {
      setSearchOpen(true);
      return;
    }
    if (typeof tile.tabIndex === 'number') {
      window.dispatchEvent(new CustomEvent('switchTab', { detail: tile.tabIndex }));
    }
  };

  if (searchOpen) {
    return <HomePage onBack={() => setSearchOpen(false)} />;
  }

  return (
    <div className="size-full overflow-auto bg-[#EAF4F0]">
      <div className="max-w-md mx-auto min-h-full px-4 pt-2 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight text-emerald-700">
            Saerobus
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800"
              aria-label="알림"
            >
              <Notifications />
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800"
              aria-label="메뉴"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Combined greeting + weather card. Tappable — opens NAVER weather. */}
        <a
          href="https://m.weather.naver.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="네이버 날씨 열기"
          className="mt-5 block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#B8E0D2] to-[#EAF4F0] px-5 py-4 shadow-sm text-[#14322E] hover:shadow-md active:scale-[0.99] transition"
        >
          <WeatherEffect condition={weather.condition} tempC={weather.tempC} pm10={weather.pm10} />
          <div className="relative flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005C42]">
                {urgent ? (
                  <>
                    <PriorityHigh sx={{ fontSize: 14 }} />
                    <span>지금 출발</span>
                  </>
                ) : (
                  <>
                    <DaypartIcon sx={{ fontSize: 14 }} />
                    <span>{DAYPART_META[daypart].label}</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-[19px] leading-[1.3] font-extrabold">
                {nickname ? `${nickname}님! ` : '안녕하세요! '}
                {urgent ? '지금 나가야 해요' : weatherTip.line}
              </p>
            </div>
            <motion.img
              src={urgent ? URGENT_DUCK : DAYPART_META[daypart].duck}
              alt=""
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
              className="w-16 h-16 shrink-0 object-contain select-none"
              animate={
                urgent
                  ? { x: [0, -4, 4, -4, 4, 0], rotate: [0, -3, 3, -3, 3, 0] }
                  : { y: [0, -5, 0] }
              }
              transition={{
                duration: urgent ? 0.6 : 2.4,
                repeat: Infinity,
                repeatDelay: urgent ? 1.2 : 0,
                ease: 'easeInOut',
              }}
            />
          </div>

          <div className="relative mt-3 pt-3 border-t border-white/70 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap text-[11px] text-[#5A6B66] min-w-0">
              <span className="flex items-baseline gap-1">
                <ConditionIcon sx={{ fontSize: 14 }} className="self-center" />
                <span
                  className="text-[18px] font-extrabold leading-none tabular-nums"
                  style={{ color: tempColor(weather.tempC) }}
                >
                  {Math.round(weather.tempC)}°
                </span>
                <span className="font-semibold text-[#14322E]">
                  {WEATHER_LABELS[weather.condition]}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                습도{' '}
                <span className="font-semibold text-[#14322E]">{weather.humidity}%</span>
              </span>
              <span aria-hidden>·</span>
              <span>
                미세먼지{' '}
                <span className="font-semibold" style={{ color: pm10Color(weather.pm10) }}>
                  {weather.pm10}㎍/㎥ ({pm10Grade(weather.pm10)})
                </span>
              </span>
            </div>
            <OpenInNew sx={{ fontSize: 14 }} className="text-[#5A6B66] shrink-0" />
          </div>
        </a>

        {/* Active / upcoming trip — above the tile grid */}
        {upcoming && (
          <div className="mt-5">
            <ActiveTripCard
              origin={upcoming.origin}
              destination={upcoming.destination}
              arrivalTime={upcoming.arrivalTime}
              showInsights={false}
            />
          </div>
        )}

        {/* Tile grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <TileCard key={tile.id} tile={tile} onClick={() => handleTileClick(tile)} />
          ))}
        </div>

        {/* Quick-pick favorite places (집 / 자주 가는 곳 — onboarding data put to use) */}
        {(favorites.home || favorites.frequent) && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-[#5A6B66] mb-2">자주 가는 곳</p>
            <div className="grid grid-cols-2 gap-3">
              {favorites.home && (
                <FavoriteChip
                  Icon={Home}
                  label="집"
                  address={favorites.home.address}
                  onClick={() => handleQuickPlace(favorites.home!)}
                />
              )}
              {favorites.frequent && (
                <FavoriteChip
                  Icon={School}
                  label="자주 가는 곳"
                  address={favorites.frequent.address}
                  onClick={() => handleQuickPlace(favorites.frequent!)}
                />
              )}
            </div>
          </div>
        )}

        {/* End-trip button (only when a trip is active) */}
        {upcoming && (
          <button
            type="button"
            onClick={() => {
              clearActiveTrip();
              setUpcoming(null);
              window.dispatchEvent(new CustomEvent('showToast', { detail: '안내를 종료합니다.' }));
            }}
            className="mt-4 w-full rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-800 bg-white border-2 border-gray-500"
          >
            <Close sx={{ fontSize: 18 }} />
            경로 안내 종료
          </button>
        )}
      </div>
    </div>
  );
}

interface TileCardProps {
  tile: Tile;
  onClick: () => void;
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

function TileCard({ tile, onClick }: TileCardProps) {
  const { Icon, label, sub, primary } = tile;

  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl bg-[#007956] p-3 text-white text-left flex items-center gap-3 shadow-md active:scale-[0.98] transition"
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Icon sx={{ fontSize: 22 }} />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-[15px] leading-tight">{label}</p>
          <p className="text-[11px] opacity-90 mt-0.5 leading-snug truncate">{sub}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-3 text-left flex items-center gap-3 shadow-sm active:scale-[0.98] transition"
    >
      <div className="w-10 h-10 rounded-xl bg-[#EAF4F0] text-[#007956] flex items-center justify-center shrink-0">
        <Icon sx={{ fontSize: 22 }} />
      </div>
      <div className="min-w-0">
        <p className="font-extrabold text-[#14322E] text-[15px] leading-tight">{label}</p>
        <p className="text-[11px] text-[#5A6B66] mt-0.5 leading-snug truncate">{sub}</p>
      </div>
    </button>
  );
}
