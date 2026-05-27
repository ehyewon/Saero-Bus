import { useState } from 'react';
import { Home, School, KeyboardArrowDown } from '@mui/icons-material';

/** localStorage keys — bump the suffix if the onboarding flow changes materially. */
export const ONBOARDING_KEY = 'saerobus.onboarded.v2';
const PLACES_KEY = 'saerobus.places.v1';

/** True once the user has finished onboarding (so we can skip it on return). */
export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    // Private mode / storage disabled — treat as not seen.
    return false;
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    /* ignore — onboarding just shows again next time */
  }
}

interface SavedPlaces {
  home: string;
  frequent: string;
  arrivalTime: string;
}

function savePlaces(places: SavedPlaces) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  } catch {
    /* ignore */
  }
}

/** 30-minute time options, labelled in Korean (오전/오후). */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? '오전' : '오후';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${period} ${h12}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

interface OnboardingProps {
  /** Called when the user finishes or skips onboarding. */
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [home, setHome] = useState('');
  const [frequent, setFrequent] = useState('');
  const [arrivalTime, setArrivalTime] = useState('오전 9:00');

  const finish = (save: boolean) => {
    if (save) savePlaces({ home, frequent, arrivalTime });
    markOnboardingSeen();
    onComplete();
  };

  return (
    <div className="size-full overflow-auto bg-[#EAF1F6]">
      <div className="max-w-md mx-auto min-h-full px-6 pt-5 pb-8 flex flex-col">
        {/* Top bar: progress pills + skip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-gray-300" />
            <span className="h-2 w-6 rounded-full bg-[#4A7CA8]" />
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            className="text-sm font-semibold text-gray-400"
          >
            건너뛰기
          </button>
        </div>

        {/* Heading */}
        <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
          자주 가는 곳을<br />알려주세요
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          다음부터 앱을 켜면 바로<br />출발 시각을 알려드릴 수 있어요.
        </p>

        {/* Place inputs */}
        <div className="mt-8 space-y-3">
          <PlaceField
            Icon={Home}
            label="집"
            placeholder="주소를 입력하세요"
            value={home}
            onChange={setHome}
          />
          <PlaceField
            Icon={School}
            label="자주 가는 곳"
            placeholder="학교 · 회사 등"
            value={frequent}
            onChange={setFrequent}
          />
        </div>

        {/* Arrival time */}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[15px] text-gray-600">
            보통 도착 시각 <span className="text-gray-400">(선택)</span>
          </span>
          <div className="relative">
            <select
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="appearance-none bg-transparent pr-7 text-lg font-bold text-gray-900 text-right focus:outline-none cursor-pointer"
              aria-label="보통 도착 시각"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <KeyboardArrowDown
              className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              sx={{ fontSize: 22 }}
            />
          </div>
        </div>

        {/* Spacer pushes actions toward the bottom on tall screens */}
        <div className="flex-1 min-h-8" />

        {/* Primary action */}
        <button
          type="button"
          onClick={() => finish(true)}
          className="mt-2 w-full rounded-2xl py-4 text-base font-extrabold text-white bg-[#4A7CA8] shadow-md active:scale-[0.99] transition-transform"
        >
          시작하기
        </button>
        <button
          type="button"
          onClick={() => finish(false)}
          className="mt-3 w-full py-2 text-sm font-semibold text-gray-400"
        >
          나중에 설정할게요
        </button>
      </div>
    </div>
  );
}

interface PlaceFieldProps {
  Icon: typeof Home;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}

function PlaceField({ Icon, label, placeholder, value, onChange }: PlaceFieldProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white border border-gray-200 px-5 py-4">
      <Icon className="text-[#4A7CA8] shrink-0" sx={{ fontSize: 26 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
