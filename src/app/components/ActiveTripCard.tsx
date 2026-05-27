import { useEffect, useMemo, useState } from 'react';
import { Warning, DirectionsWalk } from '@mui/icons-material';

interface ActiveTripCardProps {
  destination: string;
  arrivalTime: string; // "HH:mm"
  homeLabel?: string;
  destinationLabel?: string;
  /** Render the small "오늘의 이동 · ..." subheader above the card */
  showSubheader?: boolean;
}

// --- Mock route the agent picked ---
export const MOCK_PREP_MIN = 39;
export const MOCK_RIDE_MIN = 28;
export const MOCK_BUFFER_MIN = 6;
export const MOCK_BUS = '536';
export const MOCK_STOP = '봉서마을 정류장';
export const MOCK_WALK_MIN = 4;
export const MOCK_NEXT_BUS = '119';

const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toToday = (hhmm: string): Date | null => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
};

export const addMin = (d: Date, m: number) => {
  const next = new Date(d);
  next.setMinutes(next.getMinutes() + m);
  return next;
};

export function ActiveTripCard({
  destination,
  arrivalTime,
  homeLabel = '집',
  destinationLabel,
  showSubheader = true,
}: ActiveTripCardProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const arrivalDate = useMemo(() => toToday(arrivalTime), [arrivalTime]);
  const departDate = useMemo(
    () => (arrivalDate ? addMin(arrivalDate, -MOCK_PREP_MIN) : null),
    [arrivalDate],
  );
  const stopArriveDate = useMemo(
    () => (departDate ? addMin(departDate, MOCK_WALK_MIN + 1) : null),
    [departDate],
  );
  const nextBusDate = useMemo(
    () => (departDate ? addMin(departDate, 20) : null),
    [departDate],
  );
  const nextBusArrivalDate = useMemo(
    () => (nextBusDate ? addMin(nextBusDate, MOCK_RIDE_MIN + MOCK_WALK_MIN) : null),
    [nextBusDate],
  );

  const minutesUntilDepart = departDate
    ? Math.max(0, Math.round((departDate.getTime() - now.getTime()) / 60000))
    : 0;

  const destLabel = destinationLabel || destination || '목적지';

  return (
    <div>
      {showSubheader && (
        <p className="text-sm text-gray-600 mb-2">
          오늘의 이동 ·{' '}
          <span className="text-gray-900 font-semibold">
            {homeLabel} → {destLabel}
          </span>
        </p>
      )}

      {/* Main departure card */}
      <div className="card-grad rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-600 leading-snug">
          {destination || '목적지'} · {arrivalTime} 도착
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tabular-nums text-gray-900">
            {departDate ? fmt(departDate) : '--:--'}
          </span>
          <span className="text-lg text-gray-700">에 출발</span>
        </div>

        <p className="text-sm text-gray-700 mt-2">
          <span className="font-bold text-gray-900 tabular-nums">
            {minutesUntilDepart}분 뒤
          </span>{' '}
          나가면{' '}
          <span className="text-emerald-700 font-bold">
            {MOCK_BUFFER_MIN}분 여유
          </span>
          로 도착해요.
        </p>

        <div className="h-px bg-gray-100 my-4" />

        <div className="flex items-start gap-3">
          <span className="bg-emerald-700 text-white font-extrabold text-sm rounded-lg px-3 py-1.5 tabular-nums shrink-0">
            {MOCK_BUS}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium">
              {MOCK_STOP} · {stopArriveDate ? fmt(stopArriveDate) : '--:--'} 도착
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <DirectionsWalk sx={{ fontSize: 14 }} />
              도보 {MOCK_WALK_MIN}분 · 도착 예상{' '}
              {arrivalDate ? fmt(addMin(arrivalDate, -6)) : '--:--'}
            </p>
          </div>
        </div>
      </div>

      {/* Miss warning */}
      <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 flex items-center gap-2 text-sm">
        <Warning className="text-rose-500 shrink-0" sx={{ fontSize: 18 }} />
        <p className="text-gray-800">
          놓치면 다음{' '}
          <span className="font-bold">
            {MOCK_NEXT_BUS}번 {nextBusDate ? fmt(nextBusDate) : '--:--'}
          </span>{' '}
          → 도착 {nextBusArrivalDate ? fmt(nextBusArrivalDate) : '--:--'}{' '}
          <span className="text-rose-600 font-bold">지각 위험</span>
        </p>
      </div>

    </div>
  );
}
