import { useEffect, useState } from 'react';
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

type Daypart = 'morning' | 'afternoon' | 'evening';

function getDaypart(date = new Date()): Daypart {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  return 'evening';
}

const GREETINGS: Record<Daypart, string[]> = {
  morning: [
    '오늘 하루도 화이팅이에요',
    '좋은 아침이에요',
    '오늘도 잘 다녀오세요',
    '상쾌한 하루 시작해볼까요?',
    '오늘 햇살이 참 좋네요',
    '아침은 챙겨드셨어요?',
    '출발 준비는 되셨나요?',
    '오늘은 어떤 하루가 기다릴까요?',
    '새로운 하루 응원할게요',
    '늦지 않게 도와드릴게요',
  ],
  afternoon: [
    '점심은 드셨어요?',
    '잠깐 쉬어가도 좋아요',
    '오후도 힘내세요',
    '햇살 좋은 오후네요',
    '다음 일정 챙겨드릴게요',
    '졸음이 올 시간이에요',
    '산책하기 좋은 날이에요',
    '오후 일정 가볍게 가봐요',
    '잠깐 숨 돌리는 거 잊지 마세요',
    '오늘 절반 잘 달려왔어요',
  ],
  evening: [
    '오늘도 수고하셨어요',
    '저녁 달이 참 예쁘네요',
    '집까지 편히 모실게요',
    '오늘 하루 어떠셨어요?',
    '조심해서 들어가세요',
    '야경이 멋진 시간이에요',
    '따뜻한 저녁 보내세요',
    '마지막 한 걸음만 더 힘내요',
    '오늘도 잘 이겨내셨어요',
    '푹 쉬셔도 괜찮아요',
  ],
};

const DAYPART_META: Record<Daypart, { label: string; Icon: typeof WbSunny }> = {
  morning: { label: '오늘 아침', Icon: WbSunny },
  afternoon: { label: '오늘 낮', Icon: LightMode },
  evening: { label: '오늘 저녁', Icon: Bedtime },
};

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
  // Pick a daypart + greeting once per mount so the message stays stable while the user is here.
  const [greeting] = useState(() => {
    const daypart = getDaypart();
    const list = GREETINGS[daypart];
    return { daypart, line: list[Math.floor(Math.random() * list.length)] };
  });
  const DaypartIcon = DAYPART_META[greeting.daypart].Icon;

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

  useEffect(() => {
    setNickname(loadNickname());
    const refresh = () => setNickname(loadNickname());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

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

        {/* Greeting card — time-of-day message keyed to the user's nickname */}
        <div className="mt-5 rounded-3xl bg-gradient-to-br from-[#007956] to-[#005C42] px-6 py-7 shadow-md text-white">
          <div className="flex items-center gap-2 text-[12px] font-semibold opacity-85">
            <DaypartIcon sx={{ fontSize: 16 }} />
            <span>{DAYPART_META[greeting.daypart].label}</span>
          </div>
          <p className="mt-2 text-[26px] leading-[1.25] font-extrabold">
            {nickname ? `${nickname}님!` : '안녕하세요!'}
            <br />
            {greeting.line}
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
