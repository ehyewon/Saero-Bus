import { useEffect, useState } from 'react';
import {
  Notifications,
  Menu as MenuIcon,
  Route as RouteIcon,
  DirectionsBus,
  Map as MapIcon,
  Alarm as AlarmIcon,
  Close,
} from '@mui/icons-material';
import { HomePage } from './HomePage';
import { ActiveTripCard } from './ActiveTripCard';
import { loadUpcomingTrip, type UpcomingTrip } from '../lib/upcoming';
import { clearActiveTrip } from '../lib/activeTrip';

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

const TILES: Tile[] = [
  { id: 'route', label: '경로', sub: '도착 시각으로 출발 시간 추천', Icon: RouteIcon, primary: true },
  { id: 'bus',   label: '버스', sub: '노선·정류장 검색',           Icon: DirectionsBus, tabIndex: 1 },
  { id: 'map',   label: '지도', sub: '실시간 위치·노선 보기',       Icon: MapIcon, tabIndex: 2 },
  { id: 'alarm', label: '알람', sub: '도착·출발 알림 관리',         Icon: AlarmIcon, tabIndex: 3 },
];

export function RouteHub() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingTrip | null>(null);

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
    <div className="size-full overflow-auto bg-[#FAFAFA]">
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

        {/* User card */}
        <div className="mt-4 card-grad rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              혜
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">혜원 님</p>
              <p className="text-xs text-gray-500">도착 기반 에이전트 · GREEN 등급</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1 tabular-nums">
            <span className="text-emerald-700 font-bold">18</span> / 30p
          </p>
        </div>

        {/* Active / upcoming trip — above the tile grid */}
        {upcoming && (
          <div className="mt-5">
            <ActiveTripCard
              destination={upcoming.destination}
              arrivalTime={upcoming.arrivalTime}
            />
          </div>
        )}

        {/* Tile grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <TileCard key={tile.id} tile={tile} onClick={() => handleTileClick(tile)} />
          ))}
        </div>

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

function TileCard({ tile, onClick }: TileCardProps) {
  const { Icon, label, sub, primary } = tile;

  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="aspect-square bg-emerald-700 rounded-2xl p-4 text-white text-left flex flex-col justify-between shadow-md"
      >
        <Icon sx={{ fontSize: 36 }} />
        <div>
          <p className="font-extrabold text-lg leading-tight">{label}</p>
          <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{sub}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square card-grad rounded-2xl p-4 text-left flex flex-col justify-between shadow-sm"
    >
      <Icon className="text-emerald-700" sx={{ fontSize: 32 }} />
      <div>
        <p className="font-extrabold text-gray-900 text-lg leading-tight">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{sub}</p>
      </div>
    </button>
  );
}
