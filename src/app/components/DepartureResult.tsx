import { useEffect, useState } from 'react';
import {
  Place,
  Notifications,
  Search,
  ArrowBack,
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
}

const pad = (n: number) => String(n).padStart(2, '0');

const fmtClockKorean = (d: Date) => {
  const isPm = d.getHours() >= 12;
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${isPm ? '오후' : '오전'} ${h12}:${pad(d.getMinutes())}`;
};

export function DepartureResult({
  destination,
  arrivalTime,
  origin = '덕진구 금암동',
  homeLabel = '집',
  destinationLabel,
  onBack,
  onClear,
  onEnd,
}: DepartureResultProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="size-full overflow-auto text-gray-900 bg-[#EAF4F0]">
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
            onEnd={onEnd}
          />
        </div>

        {/* "Go to another place" search — cancels current trip and reopens search */}
        <button
          type="button"
          onClick={onClear ?? onBack}
          className="mt-4 w-full card-grad rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-800 shadow-sm"
        >
          <Search />
          <span className="text-sm font-semibold">경로 변경하기</span>
        </button>
      </div>
    </div>
  );
}
