import { useEffect, useState } from 'react';
import {
  Home,
  School,
  KeyboardArrowDown,
  LocationOn,
  Search,
  CheckCircle,
} from '@mui/icons-material';

/** localStorage keys — bump the suffix if the onboarding flow changes materially. */
export const ONBOARDING_KEY = 'saerobus.onboarded.v2';
const PLACES_KEY = 'saerobus.places.v1';
const FAVORITE_PLACES_KEY = 'favoritePlaces';

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
  home: RegisteredPlace | null;
  frequent: RegisteredPlace | null;
  arrivalTime: string;
}

function savePlaces(places: SavedPlaces) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
    const favorites = [
      places.home && {
        id: 'onboarding-home',
        name: '집',
        address: places.home.address,
        category: 'home',
        lat: places.home.lat,
        lng: places.home.lng,
      },
      places.frequent && {
        id: 'onboarding-frequent',
        name: '자주 가는 곳',
        address: places.frequent.address,
        category: 'school',
        lat: places.frequent.lat,
        lng: places.frequent.lng,
      },
    ].filter(Boolean);

    if (favorites.length > 0) {
      const raw = localStorage.getItem(FAVORITE_PLACES_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const preserved = Array.isArray(existing)
        ? existing.filter(
            (place) =>
              place?.id !== 'onboarding-home' &&
              place?.id !== 'onboarding-frequent'
          )
        : [];
      localStorage.setItem(
        FAVORITE_PLACES_KEY,
        JSON.stringify([...favorites, ...preserved])
      );
    }
  } catch {
    /* ignore */
  }
}

interface RegisteredPlace {
  address: string;
  lat: number;
  lng: number;
}

interface AddressCandidate {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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
  const [home, setHome] = useState<RegisteredPlace | null>(null);
  const [frequent, setFrequent] = useState<RegisteredPlace | null>(null);
  const [arrivalTime, setArrivalTime] = useState('오전 9:00');
  const canStart = Boolean(home && frequent);

  const finish = (save: boolean) => {
    if (save) savePlaces({ home, frequent, arrivalTime });
    markOnboardingSeen();
    onComplete();
  };

  return (
    <div className="size-full overflow-auto overflow-x-hidden bg-[#EAF1F6]">
      <div className="w-full max-w-md mx-auto min-h-full box-border px-6 pt-5 pb-8 flex flex-col">
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
          <AddressField
            Icon={Home}
            label="집"
            placeholder="집 주소를 검색하세요"
            selected={home}
            onSelect={setHome}
          />
          <AddressField
            Icon={School}
            label="자주 가는 곳"
            placeholder="학교 · 회사 등을 검색하세요"
            selected={frequent}
            onSelect={setFrequent}
          />
        </div>

        {/* Arrival time */}
        <div className="mt-6 flex items-center justify-between gap-3 min-w-0">
          <span className="min-w-0 text-[15px] text-gray-600">
            보통 도착 시각 <span className="text-gray-400">(선택)</span>
          </span>
          <div className="relative shrink-0">
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
          disabled={!canStart}
          className="mt-2 w-full rounded-2xl py-4 text-base font-extrabold text-white bg-[#4A7CA8] shadow-md active:scale-[0.99] transition-transform disabled:bg-gray-300 disabled:shadow-none disabled:active:scale-100"
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

interface AddressFieldProps {
  Icon: typeof Home;
  label: string;
  placeholder: string;
  selected: RegisteredPlace | null;
  onSelect: (place: RegisteredPlace | null) => void;
}

function AddressField({ Icon, label, placeholder, selected, onSelect }: AddressFieldProps) {
  const [query, setQuery] = useState(selected?.address ?? '');
  const [results, setResults] = useState<AddressCandidate[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (selected?.address && selected.address === query) {
      setResults([]);
      setStatus('idle');
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const params = new URLSearchParams({
          q: trimmed,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'kr',
          'accept-language': 'ko',
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Address search failed');
        const data = (await response.json()) as AddressCandidate[];
        setResults(data);
        setStatus('idle');
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus('error');
          setResults([]);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected?.address]);

  const choose = (candidate: AddressCandidate) => {
    const place = {
      address: candidate.display_name,
      lat: Number(candidate.lat),
      lng: Number(candidate.lon),
    };
    setQuery(place.address);
    setResults([]);
    setStatus('idle');
    onSelect(place);
  };

  const clearSelection = (value: string) => {
    setQuery(value);
    if (selected) onSelect(null);
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
        <Icon className="text-[#4A7CA8] shrink-0" sx={{ fontSize: 26 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{label}</p>
            {selected && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle sx={{ fontSize: 14 }} />
                등록됨
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Search className="text-gray-300 shrink-0" sx={{ fontSize: 18 }} />
            <input
              type="search"
              value={query}
              onChange={(e) => clearSelection(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div className="border-t border-gray-100 px-5 py-3 text-sm text-gray-400">
          주소를 찾는 중
        </div>
      )}

      {status === 'error' && (
        <div className="border-t border-gray-100 px-5 py-3 text-sm text-red-500">
          주소 검색에 실패했어요
        </div>
      )}

      {results.length > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {results.map((candidate) => (
            <button
              key={candidate.place_id}
              type="button"
              onClick={() => choose(candidate)}
              className="w-full flex items-start gap-3 px-5 py-3 text-left active:bg-gray-50"
            >
              <LocationOn className="mt-0.5 text-[#4A7CA8] shrink-0" sx={{ fontSize: 20 }} />
              <span className="text-sm leading-snug text-gray-700 line-clamp-2">
                {candidate.display_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="h-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <iframe
              title={`${label} 지도`}
              className="h-full w-full"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.006}%2C${selected.lat - 0.004}%2C${selected.lng + 0.006}%2C${selected.lat + 0.004}&layer=mapnik&marker=${selected.lat}%2C${selected.lng}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
