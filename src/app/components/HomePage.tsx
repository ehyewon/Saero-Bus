import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBack,
  Adjust,
  Place,
  Search,
  History,
  Star,
} from '@mui/icons-material';
import { WheelTimePicker } from './WheelTimePicker';
import {
  loadRecentPlaces,
  pushRecentPlace,
  type RecentPlace,
} from './RecentPlacesSection';
import { DepartureResult } from './DepartureResult';
import { saveActiveTrip, clearActiveTrip, loadActiveTrip } from '../lib/activeTrip';

interface HomePageProps {
  onBack?: () => void;
}

type Mode = 'arrive' | 'depart';

const pad = (n: number) => String(n).padStart(2, '0');

const formatKoreanTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `오늘 ${isPm ? '오후' : '오전'} ${h12}:${pad(m)}`;
};

// Pinned favorite (just an example; uses the same storage as QuickActions if present)
function loadPinnedFavorite(): RecentPlace | null {
  try {
    const raw = localStorage.getItem('favoritePlaces');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed[0]) {
      const p = parsed[0];
      return { name: p.name, address: p.address };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function HomePage({ onBack }: HomePageProps = {}) {
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<Mode>('arrive');
  const [time, setTime] = useState('09:00');
  const [showResults, setShowResults] = useState(false);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const [pinned, setPinned] = useState<RecentPlace | null>(null);

  useEffect(() => {
    setRecents(loadRecentPlaces());
    setPinned(loadPinnedFavorite());
    // Restore in-progress trip so returning to this screen shows the result again
    const trip = loadActiveTrip();
    if (trip) {
      setDestination(trip.destination);
      setTime(trip.arrivalTime);
      setShowResults(true);
    }
  }, []);

  const canSubmit = destination.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    pushRecentPlace({ name: destination, address: destination });
    setRecents(loadRecentPlaces());
    saveActiveTrip({ destination, arrivalTime: time });
    setShowResults(true);
  };

  const pickRecent = (place: RecentPlace) => {
    setDestination(place.address);
  };

  const list = useMemo(() => {
    const items: Array<RecentPlace & { kind: 'recent' | 'fav' }> = recents.map((r) => ({
      ...r,
      kind: 'recent',
    }));
    if (pinned) items.push({ ...pinned, kind: 'fav' });
    return items;
  }, [recents, pinned]);

  const endTrip = () => {
    clearActiveTrip();
    setShowResults(false);
    setDestination('');
    window.dispatchEvent(new CustomEvent('showToast', { detail: '안내를 종료합니다.' }));
  };

  if (showResults) {
    return (
      <DepartureResult
        destination={destination}
        arrivalTime={time}
        onBack={onBack ?? (() => setShowResults(false))}
        onClear={() => {
          clearActiveTrip();
          setShowResults(false);
        }}
        onEnd={endTrip}
        onSelectQuickPlace={(label) => {
          clearActiveTrip();
          setDestination(label);
          setShowResults(false);
        }}
      />
    );
  }

  return (
    <div className="size-full overflow-auto bg-[#FAFAFA]">
      <div className="max-w-md mx-auto min-h-full pb-28">
        {/* Header */}
        <div className="px-4 pt-2 pb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">어디로 가세요?</h1>
        </div>

        {/* Origin + Destination card */}
        <div className="px-4 mt-3">
          <div className="card-grad rounded-3xl p-4 shadow-md">
            <div className="flex items-center gap-3 py-2">
              <Adjust className="text-gray-700" />
              <span className="text-sm text-gray-800 truncate">현재 위치 · 덕진구 금암동</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-3 py-2">
              <Place className="text-emerald-700" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="목적지를 입력하세요"
                className="flex-1 outline-none text-sm bg-transparent min-w-0 placeholder:text-gray-400"
              />
              <Search className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Time card */}
        <div className="px-4 mt-3">
          <div className="card-grad rounded-3xl p-4 shadow-md">
            <p className="text-sm text-gray-600 mb-3">언제까지 도착하면 되나요?</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('arrive')}
                className={`rounded-2xl py-3 font-semibold text-sm transition-colors ${
                  mode === 'arrive'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                도착 시각 기준
              </button>
              <button
                type="button"
                onClick={() => setMode('depart')}
                className={`rounded-2xl py-3 font-semibold text-sm transition-colors ${
                  mode === 'depart'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                지금 출발
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2 text-center">{formatKoreanTime(time)}</p>
            <WheelTimePicker value={time} onChange={setTime} />
          </div>
        </div>

        {/* Recent search */}
        <div className="px-4 mt-5">
          <p className="text-sm text-gray-700 font-semibold mb-2">최근 검색</p>
          {list.length === 0 ? (
            <div className="card-grad rounded-2xl p-5 text-center text-sm text-gray-500 shadow-sm">
              최근 검색 기록이 없어요
            </div>
          ) : (
            <div className="card-grad rounded-2xl shadow-md divide-y divide-gray-100 overflow-y-auto" style={{ maxHeight: 5 * 64 }}>
              {list.map((item, i) => (
                <button
                  key={`${item.kind}-${item.address}-${i}`}
                  type="button"
                  onClick={() => pickRecent(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    {item.kind === 'fav' ? (
                      <Star className="text-emerald-700" />
                    ) : (
                      <History className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{item.name || item.address}</p>
                    <p className="text-xs text-gray-500 truncate">{item.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA — in-flow, right below the recent list */}
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-2xl py-4 font-extrabold text-base text-white shadow-md bg-emerald-700 flex items-center justify-center transition-opacity disabled:opacity-40"
          >
            경로 안내 시작
          </button>
        </div>
      </div>
    </div>
  );
}
