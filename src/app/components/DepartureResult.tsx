import { useEffect, useState } from 'react';
import {
  Place,
  Notifications,
  Search,
  Home,
  School,
  Train,
  Business,
  ArrowBack,
  Close,
} from '@mui/icons-material';
import { ActiveTripCard } from './ActiveTripCard';

interface DepartureResultProps {
  destination: string;
  arrivalTime: string; // "HH:mm"
  origin?: string;
  homeLabel?: string;
  destinationLabel?: string;
  /** Return to the previous screen (e.g. menu hub) without cancelling the trip */
  onBack: () => void;
  /** Cancel the trip + return to the empty search screen */
  onClear?: () => void;
  /** Cancel the trip + return all the way to the hub */
  onEnd?: () => void;
  onSelectQuickPlace?: (label: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

const fmtClockKorean = (d: Date) => {
  const isPm = d.getHours() >= 12;
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${isPm ? '오후' : '오전'} ${h12}:${pad(d.getMinutes())}`;
};

interface Quick {
  id: string;
  Icon: typeof Home;
  label: string;
}
const QUICK: Quick[] = [
  { id: 'home', Icon: Home, label: '집' },
  { id: 'school', Icon: School, label: '전북대' },
  { id: 'station', Icon: Train, label: '전주역' },
  { id: 'city', Icon: Business, label: '시청' },
];

export function DepartureResult({
  destination,
  arrivalTime,
  origin = '덕진구 금암동',
  homeLabel = '집',
  destinationLabel,
  onBack,
  onClear,
  onEnd,
  onSelectQuickPlace,
}: DepartureResultProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="size-full overflow-auto text-gray-900 bg-[#FAFAFA]">
      <div className="max-w-md mx-auto min-h-full px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
              aria-label="뒤로"
            >
              <ArrowBack />
            </button>
            <div className="flex items-center gap-1 text-gray-700">
              <Place sx={{ fontSize: 16 }} className="text-gray-700" />
              <span className="text-sm font-semibold">{origin}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <span className="text-sm tabular-nums">{fmtClockKorean(now)}</span>
            <Notifications sx={{ fontSize: 20 }} />
          </div>
        </div>

        {/* Trip card (subheader + main card + warning) */}
        <div className="mt-3">
          <ActiveTripCard
            destination={destination}
            arrivalTime={arrivalTime}
            homeLabel={homeLabel}
            destinationLabel={destinationLabel}
          />
        </div>

        {/* "Go to another place" search — cancels current trip and reopens search */}
        <button
          type="button"
          onClick={onClear ?? onBack}
          className="mt-4 w-full card-grad rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-800 shadow-sm"
        >
          <Search />
          <span className="text-sm font-semibold">다른 곳으로 가기</span>
        </button>

        {/* Frequent places */}
        <div className="mt-5">
          <p className="text-sm text-gray-700 font-semibold mb-2">자주 가는 곳</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => {
              const Icon = q.Icon;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuickPlace?.(q.label)}
                  className="card-grad rounded-xl py-4 px-4 flex items-center gap-3 text-left shadow-sm"
                >
                  <Icon className="text-gray-700" />
                  <span className="text-sm text-gray-900 font-semibold">{q.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* End-trip button */}
        {onEnd && (
          <button
            type="button"
            onClick={onEnd}
            className="mt-4 w-full rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-800 bg-white border-2 border-gray-500"
          >
            <Close sx={{ fontSize: 18 }} />
            경로 안내 종료
          </button>
        )}

        {/* Footer link */}
        <button
          type="button"
          className="mt-5 w-full text-center text-sm text-gray-600"
        >
          내 주변 버스 실시간 보기
        </button>
      </div>
    </div>
  );
}
