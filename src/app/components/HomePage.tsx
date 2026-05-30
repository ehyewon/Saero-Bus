import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBack,
  Adjust,
  Place,
  Search,
  History,
  Close,
} from '@mui/icons-material';
import { WheelTimePicker } from './WheelTimePicker';
import {
  loadRecentPlaces,
  pushRecentPlace,
  removeRecentPlace,
  type RecentPlace,
} from './RecentPlacesSection';
import { DepartureResult } from './DepartureResult';
import { MOCK_NOW_TOTAL_MIN, fmt } from './ActiveTripCard';
import { saveActiveTrip, clearActiveTrip, loadActiveTrip } from '../lib/activeTrip';
import { type PlaceSearchResult } from '../lib/placeSearch';
import { PlacePickerPage } from './PlacePickerPage';
import { blogApi, type LatLng, type PlanResponse } from '../lib/blogApi';

interface HomePageProps {
  onBack?: () => void;
}

type Mode = 'arrive' | 'depart';
type SearchField = 'origin' | 'destination';

const pad = (n: number) => String(n).padStart(2, '0');
const FALLBACK_ORIGIN: LatLng = { lat: 35.8242, lng: 127.1480 };

const formatKoreanTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `오늘 ${isPm ? '오후' : '오전'} ${h12}:${pad(m)}`;
};

export function HomePage({ onBack }: HomePageProps = {}) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationCoord, setDestinationCoord] = useState<LatLng | null>(null);
  const [pickingField, setPickingField] = useState<SearchField | null>(null);
  const [mode, setMode] = useState<Mode>('arrive');
  const [time, setTime] = useState('09:00');
  const [tripCreatedAt, setTripCreatedAt] = useState<number | undefined>(undefined);
  const [tripPlan, setTripPlan] = useState<PlanResponse | undefined>(undefined);
  const [noServiceReason, setNoServiceReason] = useState<string | undefined>(undefined);
  const [nextFirstBusTime, setNextFirstBusTime] = useState<string | undefined>(undefined);
  const [nextFirstBusLabel, setNextFirstBusLabel] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recents, setRecents] = useState<RecentPlace[]>([]);

  useEffect(() => {
    setRecents(loadRecentPlaces());
    // Restore in-progress trip so returning to this screen shows the result again
    const trip = loadActiveTrip();
    if (trip) {
      setOrigin(trip.origin || '');
      setDestination(trip.destination);
      setTime(trip.arrivalTime);
      setMode(trip.mode ?? 'arrive');
      setTripCreatedAt(trip.createdAt);
      setTripPlan(trip.plan);
      setNoServiceReason(trip.noServiceReason);
      setNextFirstBusTime(trip.nextFirstBusTime);
      setNextFirstBusLabel(trip.nextFirstBusLabel);
      setShowResults(true);
      return;
    }
    // Quick-pick from RouteHub (자주 가는 곳) — one-shot destination prefill.
    try {
      const quick = sessionStorage.getItem('saerobus.quickDestination');
      if (quick) {
        setDestination(quick);
        setDestinationCoord(null);
        sessionStorage.removeItem('saerobus.quickDestination');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const canSubmit = destination.trim().length > 0;

  const getCurrentCoord = () =>
    new Promise<LatLng>((resolve) => {
      if (!navigator.geolocation) {
        resolve(FALLBACK_ORIGIN);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(FALLBACK_ORIGIN),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
      );
    });

  const targetIsoFor = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(Number.isFinite(h) ? h : d.getHours(), Number.isFinite(m) ? m : d.getMinutes(), 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:00+09:00`;
  };

  const clockToMinutes = (value?: string | null): number | null => {
    const raw = value?.replace(/\D/g, '').padStart(4, '0');
    if (!raw) return null;
    const h = Number(raw.slice(0, 2));
    const m = Number(raw.slice(2, 4));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const getServiceAvailability = async (busNo?: string | null, maxWaitMin = 60) => {
    const routes = await blogApi.listRoutes();
    const scopedRoutes = busNo ? routes.filter((route) => route.brt_no === busNo) : routes;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let hasRemaining = false;
    let firstBusMin: number | null = null;

    await Promise.all(
      scopedRoutes.map(async (route) => {
        let slots: string[] = [];
        try {
          const departures = await blogApi.getRouteDepartures(route.stdid);
          slots = departures.departures;
        } catch {
          slots = [route.first_time, route.last_time].filter((v): v is string => Boolean(v));
        }

        const minutes = slots
          .map(clockToMinutes)
          .filter((value): value is number => value !== null);

        minutes.forEach((total) => {
          firstBusMin = firstBusMin === null ? total : Math.min(firstBusMin, total);
          const waitMin = total - nowMin;
          if (waitMin >= 0 && waitMin <= maxWaitMin) {
            hasRemaining = true;
          }
        });

        if (minutes.length === 0) {
          const first = clockToMinutes(route.first_time);
          const last = clockToMinutes(route.last_time);
          if (first !== null) {
            firstBusMin = firstBusMin === null ? first : Math.min(firstBusMin, first);
          }
          if (last !== null && last >= nowMin && last - nowMin <= maxWaitMin) {
          hasRemaining = true;
        }
      }
      }),
    );
    return {
      hasRemaining,
      nextFirstBusTime:
        firstBusMin === null
          ? undefined
          : `${pad(Math.floor(firstBusMin / 60))}:${pad(firstBusMin % 60)}`,
      nextFirstBusLabel:
        firstBusMin === null ? undefined : firstBusMin >= nowMin ? '오늘' : '내일',
    };
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const createdAt = Date.now();
    const arrivalTime =
      mode === 'depart'
        ? fmt(new Date(createdAt + MOCK_NOW_TOTAL_MIN * 60_000))
        : time;
    let plan: PlanResponse | undefined;
    let noService: string | undefined;
    let nextFirst: string | undefined;
    let nextFirstLabel: string | undefined;
    try {
      const originCoord = await getCurrentCoord();
      if (!noService) {
        plan = await blogApi.makePlan({
          origin: originCoord,
          destination: destinationCoord,
          destination_query: destination.trim(),
          target_arrival: targetIsoFor(arrivalTime),
          user_speed_mps: 1.3,
        });
      }
      const plannedBusNo = plan?.recommended.legs.find((leg) => leg.mode === 'bus')?.brt_no;
      if (mode === 'arrive' && plan) {
        const targetDate = new Date(targetIsoFor(arrivalTime));
        const apiArrival = new Date(plan.recommended.arrival_eta);
        const diffMin = Math.abs((apiArrival.getTime() - targetDate.getTime()) / 60_000);
        if (!Number.isFinite(apiArrival.getTime()) || diffMin > 15) {
          plan = undefined;
        }
      }
      if (mode === 'depart') {
        const service = await getServiceAvailability(plannedBusNo, 60);
        nextFirst = service.nextFirstBusTime;
        nextFirstLabel = service.nextFirstBusLabel;
        if (!service.hasRemaining) {
          noService = plannedBusNo
            ? `오늘 ${plannedBusNo}번은 더 이상 운행하지 않아요.`
            : '오늘 운행 가능한 버스가 더 이상 없어요.';
        }
      }
      if (!plan?.recommended.legs.some((leg) => leg.mode === 'bus')) {
        noService = '탑승 가능한 버스가 없어요.';
      }
    } catch {
      plan = undefined;
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: 'API 연결이 불안정해서 임시 경로로 보여드려요.',
        }),
      );
    }
    pushRecentPlace({ name: destination, address: destination });
    setRecents(loadRecentPlaces());
    saveActiveTrip({
      origin: origin.trim(),
      destination,
      arrivalTime,
      mode,
      plan,
      noServiceReason: noService,
      nextFirstBusTime: nextFirst,
      nextFirstBusLabel: nextFirstLabel,
    });
    setTime(arrivalTime);
    setTripCreatedAt(createdAt);
    setTripPlan(plan);
    setNoServiceReason(noService);
    setNextFirstBusTime(nextFirst);
    setNextFirstBusLabel(nextFirstLabel);
    setSubmitting(false);
    setShowResults(true);
  };

  const pickRecent = (place: RecentPlace) => {
    setDestination(place.name || place.address);
    setDestinationCoord(null);
  };

  const deleteRecent = (address: string) => {
    removeRecentPlace(address);
    setRecents(loadRecentPlaces());
  };

  const pickPlace = (place: PlaceSearchResult) => {
    if (pickingField === 'origin') {
      setOrigin(place.name);
      setPickingField(null);
      return;
    }
    setDestination(place.name);
    setDestinationCoord(
      typeof place.lat === 'number' && typeof place.lon === 'number'
        ? { lat: place.lat, lng: place.lon }
        : null,
    );
    pushRecentPlace({ name: place.name, address: place.address });
    setRecents(loadRecentPlaces());
    setPickingField(null);
  };

  const pickManualPlace = (field: SearchField, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPickingField(field);
      return;
    }
    if (field === 'origin') {
      setOrigin(value);
      return;
    }
    setDestination(value);
    setDestinationCoord(null);
  };

  const list = useMemo(() => {
    return recents;
  }, [recents]);

  const endTrip = () => {
    clearActiveTrip();
    setShowResults(false);
    setOrigin('');
    setDestination('');
    window.dispatchEvent(new CustomEvent('showToast', { detail: '안내를 종료합니다.' }));
  };

  if (showResults) {
    return (
      <DepartureResult
        origin={origin.trim() || '출발지 미설정'}
        destination={destination}
        arrivalTime={time}
        mode={mode}
        createdAt={tripCreatedAt}
        plan={tripPlan}
        noServiceReason={noServiceReason}
        nextFirstBusTime={nextFirstBusTime}
        nextFirstBusLabel={nextFirstBusLabel}
        onBack={onBack ?? (() => setShowResults(false))}
        onClear={() => {
          clearActiveTrip();
          setShowResults(false);
        }}
        onEnd={endTrip}
      />
    );
  }

  if (pickingField) {
    return (
      <PlacePickerPage
        field={pickingField}
        initialValue={pickingField === 'origin' ? origin : destination}
        onCancel={() => setPickingField(null)}
        onSelect={pickPlace}
      />
    );
  }

  return (
    <div className="size-full overflow-auto bg-[#EAF4F0]">
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
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 leading-none mb-1">출발지</p>
                <button
                  type="button"
                  onClick={() => setPickingField('origin')}
                  className={`w-full text-left text-sm truncate ${
                    origin ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {origin || '출발지를 입력하세요'}
                </button>
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-3 py-2">
              <Place className="text-emerald-700" />
              <button
                type="button"
                onClick={() => setPickingField('destination')}
                className={`flex-1 min-w-0 text-left text-sm truncate ${
                  destination ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {destination || '목적지를 입력하세요'}
              </button>
              <button
                type="button"
                onClick={() => setPickingField('destination')}
                className="text-gray-400"
                aria-label="목적지 검색"
              >
                <Search />
              </button>
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

            {mode === 'arrive' ? (
              <>
                <p className="text-xs text-gray-500 mb-2 text-center">{formatKoreanTime(time)}</p>
                <WheelTimePicker value={time} onChange={setTime} />
              </>
            ) : (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-5 text-center">
                <p className="text-sm font-extrabold text-emerald-900">시간 설정 없이 바로 계산해요</p>
                <p className="text-xs text-emerald-700 mt-1">
                  현재 시각 기준으로 가장 빨리 도착하는 버스 경로를 보여드릴게요.
                </p>
              </div>
            )}
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
                <div
                  key={`${item.address}-${i}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <button
                    type="button"
                    onClick={() => pickRecent(item)}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <History className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.name || item.address}</p>
                      <p className="text-xs text-gray-500 truncate">{item.address}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRecent(item.address)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                    aria-label={`${item.name || item.address} 삭제`}
                  >
                    <Close sx={{ fontSize: 18 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA — in-flow, right below the recent list */}
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-2xl py-4 font-extrabold text-base text-white shadow-md bg-emerald-700 flex items-center justify-center transition-opacity disabled:opacity-40"
          >
            {submitting ? 'API 경로 계산 중…' : mode === 'depart' ? '최적 경로 바로 보기' : '경로 안내 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
