import { useEffect, useMemo, useState } from 'react';
import {
  SmartToy,
  ChevronLeft,
  ChevronRight,
  Add,
  Remove,
  ArrowBack,
  Settings,
  Place,
  Work,
  FitnessCenter,
  Restaurant,
  Psychology,
  CheckCircle,
  AutoAwesome,
  Map as MapIcon,
} from '@mui/icons-material';

type AlarmIconKey = 'work' | 'fitness' | 'meal';

interface Alarm {
  id: string;
  title: string;
  time: string;
  days: string;
  icon: AlarmIconKey;
  enabled: boolean;
  // YYYY-MM-DD list this alarm appears on (mock data)
  dates: string[];
}

const iconMap: Record<AlarmIconKey, { Icon: typeof Work; bg: string; color: string }> = {
  work: { Icon: Work, bg: 'bg-emerald-100', color: 'text-emerald-700' },
  fitness: { Icon: FitnessCenter, bg: 'bg-green-100', color: 'text-green-700' },
  meal: { Icon: Restaurant, bg: 'bg-emerald-100', color: 'text-emerald-700' },
};

const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = new Date();
const todayKey = toDateKey(today);

// Build a few mock dates around today
const dateOffset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

const initialAlarms: Alarm[] = [
  {
    id: '1',
    title: '한옥마을 출근',
    time: '07:45 AM',
    days: '월 화 수 목 금',
    icon: 'work',
    enabled: true,
    dates: [dateOffset(-1), todayKey, dateOffset(1), dateOffset(2)],
  },
  {
    id: '2',
    title: '헬스장 이동',
    time: '06:20 PM',
    days: '화 목 토',
    icon: 'fitness',
    enabled: false,
    dates: [todayKey, dateOffset(2)],
  },
  {
    id: '3',
    title: '객사길 모임',
    time: '05:30 PM',
    days: '오늘',
    icon: 'meal',
    enabled: true,
    dates: [todayKey],
  },
];

const ALARMS_STORAGE_KEY = 'alarms';

function loadStoredAlarms(): Alarm[] | null {
  const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Alarm[];
  } catch {
    /* ignore */
  }
  return null;
}

export function AlarmPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [alarms, setAlarms] = useState<Alarm[]>(() => loadStoredAlarms() ?? initialAlarms);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [weekAnchor, setWeekAnchor] = useState<Date>(today);

  useEffect(() => {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  }, [alarms]);

  const toggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
  };

  // The horizontal week strip — 5 days centered around weekAnchor
  const weekDays = useMemo(() => {
    const start = new Date(weekAnchor);
    start.setDate(start.getDate() - 2);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const monthLabel = `${weekAnchor.getFullYear()}년 ${weekAnchor.getMonth() + 1}월`;

  const visibleAlarms = alarms.filter((a) => a.dates.includes(selectedDate));
  const datesWithAlarms = new Set(alarms.flatMap((a) => a.dates));

  const selectedLabel = (() => {
    const [, m, d] = selectedDate.split('-').map(Number);
    return `${m}월 ${d}일`;
  })();

  if (view === 'create') {
    return (
      <CreateAlarmView
        onBack={() => setView('list')}
        onCreate={(alarm) => {
          setAlarms((prev) => [...prev, alarm]);
          setView('list');
        }}
      />
    );
  }

  return (
    <div className="size-full overflow-auto relative bg-[#EAF4F0]">
      <div className="max-w-md mx-auto min-h-full pb-24">
        {/* Header */}
        <div className="px-4 pt-2 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }))}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">알람 리스트</h1>
        </div>

        {/* Subtitle */}
        <div className="px-4">
          <p className="text-sm text-gray-600">
            스마트 에이전트가 최적의 출발 시간을 안내합니다.
          </p>
        </div>

        {/* Calendar */}
        <div className="px-4 mt-6">
          <p className="text-sm text-gray-700 mb-2">
            날짜를 고르면 그날 알람이 보여요
          </p>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  const d = new Date(weekAnchor);
                  d.setDate(d.getDate() - 7);
                  setWeekAnchor(d);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-700"
              >
                <ChevronLeft />
              </button>
              <span className="font-semibold text-gray-900">{monthLabel}</span>
              <button
                onClick={() => {
                  const d = new Date(weekAnchor);
                  d.setDate(d.getDate() + 7);
                  setWeekAnchor(d);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-700"
              >
                <ChevronRight />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {weekDays.map((d) => {
                const key = toDateKey(d);
                const isSelected = key === selectedDate;
                const hasAlarm = datesWithAlarms.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className="flex flex-col items-center py-2"
                  >
                    <span
                      className={`text-xs mb-1 ${
                        isSelected ? 'text-emerald-700 font-bold' : 'text-gray-500'
                      }`}
                    >
                      {KOREAN_WEEKDAYS[d.getDay()]}
                    </span>
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : 'text-gray-800'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <span
                      className={`mt-1 block h-1 w-1 rounded-full ${
                        hasAlarm && !isSelected ? 'bg-emerald-500' : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alarm count */}
        <div className="px-4 mt-5">
          <p className="text-sm text-gray-700">
            {selectedLabel} · 알람 {visibleAlarms.length}개
          </p>
        </div>

        {/* Alarm list */}
        <div className="px-4 mt-3 space-y-3">
          {visibleAlarms.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center text-sm text-gray-500 shadow-sm">
              이 날짜에는 알람이 없어요.
            </div>
          ) : (
            visibleAlarms.map((alarm) => {
              const { Icon, bg, color } = iconMap[alarm.icon];
              return (
                <div
                  key={alarm.id}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{alarm.title}</p>
                    <p className="text-gray-900 font-medium">{alarm.time}</p>
                    <p className="text-sm text-emerald-700 mt-0.5">{alarm.days}</p>
                  </div>
                  <button
                    onClick={() => toggleAlarm(alarm.id)}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      alarm.enabled ? 'bg-emerald-700' : 'bg-gray-300'
                    }`}
                    aria-pressed={alarm.enabled}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        alarm.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Agent insight */}
        <div className="px-4 mt-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center">
                <Psychology className="text-white" sx={{ fontSize: 20 }} />
              </div>
              <span className="font-semibold text-emerald-700">에이전트 인사이트</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm italic text-gray-700 leading-relaxed">
              "내일 오전 전주 지역에 비 예보가 있습니다. 한옥마을 주변은 혼잡할 수 있으니 15분 일찍 출발하시겠어요?"
            </div>
            <button className="mt-3 w-full bg-emerald-700 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium">
              <CheckCircle sx={{ fontSize: 20 }} />
              네, 15분 일찍 깨워주세요
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setView('create')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ background: '#00A878' }}
        aria-label="새 알람 만들기"
      >
        <Add sx={{ fontSize: 28 }} />
      </button>
    </div>
  );
}

interface CreateAlarmViewProps {
  onBack: () => void;
  onCreate: (alarm: Alarm) => void;
}

function CreateAlarmView({ onBack, onCreate }: CreateAlarmViewProps) {
  const [destination] = useState({
    name: '전북대학교',
    address: '전주시 덕진구 백제대로 567',
  });
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(45);
  const [isPm, setIsPm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const days = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const adjustTime = (deltaMinutes: number) => {
    const total = (hour % 12) * 60 + minute + (isPm ? 12 * 60 : 0) + deltaMinutes;
    const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const newHour24 = Math.floor(wrapped / 60);
    const newMinute = wrapped % 60;
    setIsPm(newHour24 >= 12);
    setHour(newHour24 % 12 === 0 ? 12 : newHour24 % 12);
    setMinute(newMinute);
  };

  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const handleCreate = () => {
    const newAlarm: Alarm = {
      id: String(Date.now()),
      title: `${destination.name} 도착`,
      time: `${timeLabel} ${isPm ? 'PM' : 'AM'}`,
      days: '오늘',
      icon: 'work',
      enabled: true,
      dates: [selectedDate],
    };
    onCreate(newAlarm);
  };

  return (
    <div className="size-full overflow-auto bg-[#EAF4F0]">
      <div className="max-w-md mx-auto min-h-full pb-24">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center text-gray-800">
            <ArrowBack />
          </button>
          <h1 className="text-lg font-bold text-gray-900">새 알람 만들기</h1>
          <button className="w-9 h-9 flex items-center justify-center text-gray-600">
            <Settings />
          </button>
        </div>

        {/* Destination */}
        <div className="px-4 mt-4">
          <p className="text-sm text-gray-600 mb-2">목적지 설정</p>
          <button className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Place className="text-emerald-700" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-gray-900 truncate">{destination.name}</p>
              <p className="text-xs text-gray-500 truncate">{destination.address}</p>
            </div>
            <ChevronRight className="text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Target arrival time */}
        <div className="px-4 mt-5">
          <p className="text-sm text-gray-600 mb-2">목표 도착 시간</p>
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-emerald-700 tabular-nums">{timeLabel}</span>
              <span className="text-xl font-semibold text-emerald-700">{isPm ? 'PM' : 'AM'}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">지각 걱정 없는 최적의 도착 시간</p>
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => adjustTime(-5)}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-700"
                aria-label="5분 줄이기"
              >
                <Remove />
              </button>
              <button
                onClick={() => adjustTime(5)}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-700"
                aria-label="5분 늘리기"
              >
                <Add />
              </button>
            </div>
          </div>
        </div>

        {/* Date select */}
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">날짜 선택</p>
            <p className="text-xs text-emerald-700 font-medium">
              {today.getFullYear()}년 {today.getMonth() + 1}월
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const key = toDateKey(d);
              const isSelected = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl border shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <span className={`text-xs ${isSelected ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                    {KOREAN_WEEKDAYS[d.getDay()]}
                  </span>
                  <span className={`text-xl mt-1 font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Agent */}
        <div className="px-4 mt-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center relative">
                <SmartToy className="text-white" sx={{ fontSize: 20 }} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <span className="font-semibold text-gray-900">Saero AI Agent</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                ANALYZING
              </span>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              "목표 시간에 맞춰 최적의 노선을 분석해 드릴게요. 버스를 직접 고를 필요가 없습니다."
            </p>
          </div>
        </div>

        {/* Route preview */}
        <div className="px-4 mt-4">
          <div className="rounded-2xl overflow-hidden shadow-sm bg-gray-800 h-28 relative flex items-end p-3">
            <MapIcon
              className="text-white/10 absolute"
              sx={{ fontSize: 200, right: -40, top: -40 }}
            />
            <p className="text-white/90 text-xs relative z-10">
              <span className="font-semibold">↻ 전주 1001번 외 2개 노선 분석 중</span>
            </p>
          </div>
        </div>

        {/* Create button */}
        <div className="px-4 mt-6">
          <button
            onClick={handleCreate}
            className="w-full text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold shadow-lg"
            style={{ background: '#00A878' }}
          >
            <span>알람 자동 생성하기</span>
            <AutoAwesome sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
