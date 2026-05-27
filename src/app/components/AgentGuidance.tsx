import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DirectionsBus,
  Place,
  AccessTime,
  DirectionsWalk,
  Flag,
} from '@mui/icons-material';
import { RouteDetail } from './RouteDetail';

interface AgentGuidanceProps {
  destination: string;
  arrivalTime: string; // "HH:mm"
}

// --- Mock route the agent "picked" ---
const MOCK_STOP = '한옥마을 정류장';
const MOCK_BUS_NUMBER = '1001';
const MOCK_WALK_MINUTES = 5;       // time to reach the stop on foot
const MOCK_RIDE_MINUTES = 22;      // time on the bus to destination
const MOCK_BUFFER_MINUTES = 3;     // safety buffer
// Bus current position: starts N stops away and ticks down over time
const MOCK_BUS_INITIAL_STOPS_AWAY = 6;
const MOCK_BUS_STOP_INTERVAL_SEC = 30; // mock: each "stop" passes every 30s

const parseArrivalToToday = (hhmm: string): Date | null => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  // If the arrival time is earlier than now, assume next day
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
};

const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function AgentGuidance({ destination, arrivalTime }: AgentGuidanceProps) {
  const [now, setNow] = useState<Date>(new Date());
  const [detailOpen, setDetailOpen] = useState(false);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const arrivalDate = useMemo(() => parseArrivalToToday(arrivalTime), [arrivalTime]);

  // Recommended leave-home time = arrival - (ride + walk + buffer)
  const leaveDate = useMemo(() => {
    if (!arrivalDate) return null;
    const d = new Date(arrivalDate);
    d.setMinutes(d.getMinutes() - (MOCK_RIDE_MINUTES + MOCK_WALK_MINUTES + MOCK_BUFFER_MINUTES));
    return d;
  }, [arrivalDate]);

  const msUntilLeave = leaveDate ? leaveDate.getTime() - now.getTime() : 0;
  const minutesUntilLeave = Math.round(msUntilLeave / 60000);

  // Headline + tone based on how soon to leave
  let headline: string;
  let cta: string;
  let toneClass: string;
  if (!leaveDate || !arrivalDate) {
    headline = '도착 시간을 분석 중이에요';
    cta = '잠시만요';
    toneClass = 'from-gray-600 to-gray-700';
  } else if (minutesUntilLeave <= 0) {
    headline = '지금 출발하세요!';
    cta = '바로 정류장으로 이동';
    toneClass = 'from-red-500 to-rose-600';
  } else if (minutesUntilLeave <= 5) {
    headline = `${minutesUntilLeave}분 후 출발하세요`;
    cta = '곧 출발 준비';
    toneClass = 'from-orange-500 to-amber-500';
  } else {
    headline = `${minutesUntilLeave}분 후 출발하세요`;
    cta = '여유 있게 준비하세요';
    toneClass = 'from-blue-600 to-indigo-600';
  }

  // Bus position ticks down over time. Floor to 0 (i.e. "도착").
  const elapsedSec = Math.max(0, Math.floor((now.getTime() - mountTimeRef.current) / 1000));
  const stopsPassed = Math.floor(elapsedSec / MOCK_BUS_STOP_INTERVAL_SEC);
  const stopsAway = Math.max(0, MOCK_BUS_INITIAL_STOPS_AWAY - stopsPassed);

  return (
    <>
    <div className="px-4 space-y-4">
      {/* Headline card — what to do RIGHT NOW */}
      <div
        className={`rounded-2xl p-5 shadow-lg text-white bg-gradient-to-br ${toneClass}`}
      >
        <p className="text-xs uppercase tracking-wider opacity-80">에이전트 안내</p>
        <h2 className="text-3xl font-extrabold mt-1">{headline}</h2>
        <p className="text-sm opacity-90 mt-1">{cta}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-[10px] opacity-80">현재</div>
            <div className="font-bold tabular-nums">{formatClock(now)}</div>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-[10px] opacity-80">출발 권장</div>
            <div className="font-bold tabular-nums">
              {leaveDate ? formatClock(leaveDate) : '--:--'}
            </div>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <div className="text-[10px] opacity-80">도착 예정</div>
            <div className="font-bold tabular-nums">
              {arrivalDate ? formatClock(arrivalDate) : arrivalTime}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended bus + stop card */}
      <div className="bg-white rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <DirectionsBus className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-blue-600">{MOCK_BUS_NUMBER}</span>
              <span className="text-xs text-gray-500">번 버스</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-700 truncate">
              <Place className="text-gray-400" sx={{ fontSize: 16 }} />
              {MOCK_STOP}
            </div>
          </div>
        </div>

        {/* Live bus position — tap for full route detail */}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mt-4 w-full bg-blue-50 hover:bg-blue-100 transition-colors rounded-xl p-3 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
            <DirectionsBus className="text-blue-600" sx={{ fontSize: 20 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900">
              {stopsAway === 0 ? '정류장 도착' : `${stopsAway} 정거장 전 운행 중`}
            </div>
            <div className="text-xs text-gray-600">실시간 위치 추적 중 · 1초마다 갱신 · 탭하여 노선 상세</div>
          </div>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
          </span>
        </button>

        {/* Leg breakdown */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Leg icon={<DirectionsWalk className="text-emerald-600" />} label="도보" value={`${MOCK_WALK_MINUTES}분`} />
          <Leg icon={<DirectionsBus className="text-blue-600" />} label="버스" value={`${MOCK_RIDE_MINUTES}분`} />
          <Leg icon={<Flag className="text-rose-600" />} label="여유" value={`${MOCK_BUFFER_MINUTES}분`} />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-1 text-xs text-white/90 pb-2">
        <AccessTime sx={{ fontSize: 14 }} />
        에이전트가 실시간으로 노선을 다시 계산합니다
      </div>
    </div>

    {detailOpen && (
      <RouteDetail
        busNumber={MOCK_BUS_NUMBER}
        directionFrom="전주역"
        directionTo={destination || '한옥마을'}
        stopsAway={stopsAway}
        onClose={() => setDetailOpen(false)}
      />
    )}
    </>
  );
}

function Leg({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl py-2 flex flex-col items-center">
      <div>{icon}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-900">{value}</div>
    </div>
  );
}
