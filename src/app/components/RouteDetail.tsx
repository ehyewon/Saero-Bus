import { useEffect, useState } from 'react';
import {
  ArrowBack,
  Search,
  AccountCircle,
  DirectionsBus,
  CheckCircle,
  CheckCircleOutline,
  NotificationsActive,
  Notifications,
  PlayCircleOutline,
  PhotoCamera,
} from '@mui/icons-material';

interface RouteDetailProps {
  busNumber: string;
  directionFrom: string;
  directionTo: string;
  stopsAway: number;
  onClose: () => void;
}

interface Stop {
  id: string;
  name: string;
  code: string;
  /** distance from start of the listed segment (0 = first row in the timeline) */
  index: number;
}

// Mock stops along the route (5 visible in the timeline view)
const stops: Stop[] = [
  { id: 's1', name: '전주역', code: '30901', index: 0 },
  { id: 's2', name: '기린대로 병무청', code: '30902', index: 1 },
  { id: 's3', name: '전동성당·한옥마을', code: '30903', index: 2 },
  { id: 's4', name: '남부시장', code: '30904', index: 3 },
  { id: 's5', name: '국립무형유산원', code: '30905', index: 4 },
];

// Arrival list (alarm-set stops)
const arrivalRows = [
  { id: 'a1', name: '전주역', label: '도착완료', done: true, highlight: false },
  { id: 'a2', name: '모래내시장', label: '2분 15초', done: false, highlight: true },
  { id: 'a3', name: '전주시청', label: '11:42', done: false, highlight: false },
];

export function RouteDetail({
  busNumber,
  directionFrom,
  directionTo,
  stopsAway,
  onClose,
}: RouteDetailProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      document.body.style.overflow = prev;
      window.clearInterval(id);
    };
  }, []);

  // Map stopsAway → which stop in our timeline the bus is currently at.
  // We say: bus is "entering" the stop whose index = (stops.length - 1) - stopsAway,
  // clamped to the visible range.
  const busAtIndex = Math.max(0, Math.min(stops.length - 1, stops.length - 1 - stopsAway));

  // ETA to the LAST stop (≈ user's destination side). Use stopsAway as a proxy.
  const totalSec = Math.max(0, stopsAway * 80 + 20); // mock pacing
  const etaMin = Math.floor(totalSec / 60);
  const etaSec = totalSec % 60;
  const progress = Math.min(1, 1 - stopsAway / 8);

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto"
      style={{
        background: 'linear-gradient(180deg, #EFF4FF 0%, #F5EBFF 60%, #FCE7F3 100%)',
      }}
    >
      <div className="max-w-md mx-auto min-h-full pb-10">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between bg-white/40 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Saerobus
          </span>
          <div className="flex gap-1">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700">
              <Search />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700">
              <AccountCircle />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 mt-4">
          <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-sm">
            <DirectionsBus sx={{ fontSize: 18 }} />
            Bus {busNumber}
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">노선 상세</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            정방향: {directionFrom} → {directionTo}
          </p>
        </div>

        {/* ETA card */}
        <div className="px-4 mt-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">가장 빠른 도착</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-1 tabular-nums">
                  {etaMin}분 {String(etaSec).padStart(2, '0')}초 후
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                혼잡도: 여유
              </span>
            </div>
            <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.max(8, progress * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stop timeline */}
        <div className="px-4 mt-5">
          <div className="relative pl-10">
            {/* vertical line */}
            <span className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-blue-300 via-purple-300 to-emerald-300" />
            {stops.map((stop, i) => {
              const isPast = i < busAtIndex;
              const isCurrent = i === busAtIndex;
              const isLast = i === stops.length - 1;
              return (
                <div key={stop.id} className="relative mb-3 last:mb-0">
                  {/* dot or bus marker */}
                  <div
                    className={`absolute -left-[28px] top-3 flex items-center justify-center ${
                      isCurrent ? 'w-7 h-7 bg-blue-600 rounded-full -translate-x-1' : ''
                    }`}
                  >
                    {isCurrent ? (
                      <DirectionsBus className="text-white" sx={{ fontSize: 16 }} />
                    ) : (
                      <span
                        className={`block w-2.5 h-2.5 rounded-full ${
                          isPast ? 'bg-gray-300' : isLast ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>

                  {/* card */}
                  <div
                    className={`bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 ${
                      isCurrent ? 'ring-2 ring-blue-500/40' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{stop.name}</p>
                      <p className="text-xs text-gray-500">{stop.code}</p>
                    </div>
                    {isPast && !isCurrent && (
                      <CheckCircle className="text-gray-300" />
                    )}
                    {isCurrent && (
                      <div className="text-right">
                        <p className="text-blue-600 font-bold text-sm">진입중</p>
                        <p className="text-[10px] text-gray-500">전북 70자 5678</p>
                      </div>
                    )}
                    {!isPast && !isCurrent && !isLast && (
                      <span className="text-blue-600 font-semibold text-sm">
                        {(i - busAtIndex) * 3}분
                      </span>
                    )}
                    {isLast && !isCurrent && (
                      <PlayCircleOutline className="text-emerald-600 rotate-90" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrival schedule */}
        <div className="px-4 mt-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-2">도착 예정 시간</h2>
          <div className="space-y-2">
            {arrivalRows.map((row) => (
              <div
                key={row.id}
                className={`rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm ${
                  row.highlight ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'
                }`}
              >
                {row.done ? (
                  <CheckCircleOutline className="text-gray-400" />
                ) : row.highlight ? (
                  <NotificationsActive className="text-blue-600" />
                ) : (
                  <Notifications className="text-gray-300" />
                )}
                <span
                  className={`flex-1 text-sm ${
                    row.done ? 'text-gray-500' : 'text-gray-900 font-semibold'
                  }`}
                >
                  {row.name}
                </span>
                <span
                  className={`text-sm tabular-nums ${
                    row.highlight ? 'text-blue-600 font-bold' : row.done ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {row.label}
                </span>
              </div>
            ))}
          </div>

          <button
            className="mt-4 w-full text-white rounded-2xl py-4 font-semibold shadow-md flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)',
            }}
          >
            <Notifications sx={{ fontSize: 20 }} />
            도착 알림 설정하기
          </button>
        </div>

        {/* Traffic snapshot */}
        <div className="px-4 mt-5">
          <div className="relative rounded-2xl overflow-hidden shadow-md h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-end p-3">
            <PhotoCamera
              className="absolute text-white/5"
              sx={{ fontSize: 220, right: -40, top: -50 }}
            />
            <div className="relative z-10 text-white">
              <p className="text-sm font-bold">실시간 교통 상황</p>
              <p className="text-xs opacity-80">전주 시내 소통 원활합니다.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-500 mt-4 tabular-nums">
          마지막 갱신 {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}:{String(now.getSeconds()).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
