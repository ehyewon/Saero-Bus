import { useEffect, useMemo, useState } from 'react';
import {
  Close,
  AutoAwesome,
  MyLocation,
  Place,
  SwapVert,
  TrendingUp,
} from '@mui/icons-material';

interface SearchSetupProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialArrivalTime?: string; // "HH:mm" 24h
  onCancel: () => void;
  onConfirm: (data: { origin: string; destination: string; arrivalTime: string }) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

const formatTarget = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:-- --';
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${isPm ? 'PM' : 'AM'}`;
};

// Convert 24h HH:mm → 12h parts (hour, minute, ampm)
const split12 = (hhmm: string) => {
  const [h24, m] = hhmm.split(':').map(Number);
  const isPm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: h12, minute: m, ampm: isPm ? 'PM' : ('AM' as 'AM' | 'PM') };
};

const join24 = (hour: number, minute: number, ampm: 'AM' | 'PM') => {
  let h24 = hour % 12;
  if (ampm === 'PM') h24 += 12;
  return `${pad(h24)}:${pad(minute)}`;
};

const defaultArrivalTime = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function SearchSetup({
  initialOrigin,
  initialDestination,
  initialArrivalTime,
  onCancel,
  onConfirm,
}: SearchSetupProps) {
  const [origin, setOrigin] = useState(initialOrigin || '현재 위치 (전주역)');
  const [destination, setDestination] = useState(initialDestination || '');
  const [arrivalTime, setArrivalTime] = useState(initialArrivalTime || defaultArrivalTime());

  const { hour, minute, ampm } = split12(arrivalTime);

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const adjust = (deltaMin: number) => {
    const [h24, m] = arrivalTime.split(':').map(Number);
    const total = (((h24 * 60 + m + deltaMin) % (24 * 60)) + 24 * 60) % (24 * 60);
    setArrivalTime(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const canSubmit = destination.trim().length > 0;

  // For the wheel-style preview rows
  const wheelHours = useMemo(() => [hour - 1, hour, hour + 1].map((h) => ((h - 1 + 12) % 12) + 1), [hour]);
  const wheelMinutes = useMemo(
    () => [minute - 5, minute, minute + 5].map((m) => ((m % 60) + 60) % 60),
    [minute],
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto"
      style={{
        background: 'linear-gradient(180deg, #EAF0FF 0%, #F2EBFF 50%, #FCE7F3 100%)',
      }}
    >
      <div className="max-w-md mx-auto min-h-full pb-28">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-gray-700 shadow-sm"
            aria-label="닫기"
          >
            <Close />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">경로 검색</h1>
        </div>

        {/* Title chip */}
        <div className="px-4 mt-2 flex justify-center">
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
            <AutoAwesome sx={{ fontSize: 14 }} />
            전주 AI 경로 안내
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 text-center mt-3 leading-snug">
          목적지를 설정하고<br />
          최적의 출발 시간을 찾아보세요.
        </h1>

        {/* Origin + Destination card */}
        <div className="px-4 mt-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 shadow-sm relative">
            <p className="text-xs text-gray-500 mb-1.5">Starting Point</p>
            <div className="bg-white rounded-full px-4 py-3 shadow-sm flex items-center gap-2">
              <MyLocation className="text-blue-600 shrink-0" sx={{ fontSize: 20 }} />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="출발지"
                className="flex-1 outline-none text-sm min-w-0"
              />
            </div>

            {/* Swap button */}
            <div className="flex justify-center my-2">
              <button
                onClick={swap}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-blue-600"
                aria-label="출발지와 목적지 바꾸기"
              >
                <SwapVert />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-1.5">Destination</p>
            <div className="bg-white rounded-full px-4 py-3 shadow-sm flex items-center gap-2">
              <Place className="text-purple-600 shrink-0" sx={{ fontSize: 20 }} />
              <input
                type="text"
                autoFocus
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="어디까지 가세요?"
                className="flex-1 outline-none text-sm min-w-0"
              />
            </div>
          </div>
        </div>

        {/* Arrival time card */}
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-900">도착 희망 시각</p>
            <p className="text-sm font-semibold text-blue-600">Target: {formatTarget(arrivalTime)}</p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 shadow-sm">
            {/* Wheel-style display (visual only) */}
            <div className="relative h-32 flex items-center justify-center select-none">
              {/* center band */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-12 rounded-xl bg-white/60 pointer-events-none" />
              <div className="relative grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 w-full">
                {/* Hour column */}
                <div className="flex flex-col items-end font-bold tabular-nums">
                  <span className="text-2xl text-gray-300">{pad(wheelHours[0])}</span>
                  <span className="text-4xl text-gray-900">{pad(wheelHours[1])}</span>
                  <span className="text-2xl text-gray-300">{pad(wheelHours[2])}</span>
                </div>
                <span className="text-3xl font-bold text-gray-400">:</span>
                {/* Minute column */}
                <div className="flex flex-col items-start font-bold tabular-nums">
                  <span className="text-2xl text-gray-300">{pad(wheelMinutes[0])}</span>
                  <span className="text-4xl text-gray-900">{pad(wheelMinutes[1])}</span>
                  <span className="text-2xl text-gray-300">{pad(wheelMinutes[2])}</span>
                </div>
                {/* AM/PM column */}
                <div className="flex flex-col items-start font-bold pl-2">
                  <span className={`text-2xl ${ampm === 'AM' ? 'text-blue-600' : 'text-gray-300'}`}>AM</span>
                  <span className={`text-2xl ${ampm === 'PM' ? 'text-blue-600' : 'text-gray-300'}`}>PM</span>
                </div>
              </div>
            </div>

            {/* +/- controls */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <button
                onClick={() => adjust(-30)}
                className="rounded-full bg-white/80 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                −30분
              </button>
              <button
                onClick={() => adjust(-5)}
                className="rounded-full bg-white/80 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                −5분
              </button>
              <button
                onClick={() => adjust(5)}
                className="rounded-full bg-white/80 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                +5분
              </button>
              <button
                onClick={() => adjust(30)}
                className="rounded-full bg-white/80 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                +30분
              </button>
            </div>

            {/* Native input fallback for precise entry */}
            <div className="mt-3">
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full bg-white/80 rounded-full px-4 py-2 text-sm text-gray-700 shadow-sm outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* AI insight card */}
        <div className="px-4 mt-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="text-emerald-700" sx={{ fontSize: 20 }} />
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
              <span className="font-bold">AI</span>가 전주 시내 실시간 교통량과 주말 한옥마을 정체를 분석하여 최적의 경로를 계산합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-white/95 via-white/85 to-transparent pt-6 pb-4 px-4 z-10">
        <div className="max-w-md mx-auto">
          <button
            disabled={!canSubmit}
            onClick={() => onConfirm({ origin, destination, arrivalTime })}
            className="w-full text-white rounded-2xl py-4 font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)',
            }}
          >
            <AutoAwesome sx={{ fontSize: 18 }} />
            AI 경로 분석 시작
          </button>
        </div>
      </div>
    </div>
  );
}
