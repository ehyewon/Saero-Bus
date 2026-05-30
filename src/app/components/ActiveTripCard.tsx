import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Warning,
  DirectionsWalk,
  Close,
  DeviceThermostat,
  WaterDrop,
  Air,
  SwapHoriz,
  Cloud,
  WbSunny,
  Thunderstorm,
  AcUnit,
} from '@mui/icons-material';
import {
  estimateWalkingSpeedMpm,
  formatWalkingSpeed,
  loadProfile,
  weatherCodeToSummary,
} from '../lib/tripInsights';

interface ActiveTripCardProps {
  origin?: string;
  destination: string;
  arrivalTime: string; // "HH:mm"
  mode?: 'arrive' | 'depart';
  createdAt?: number;
  homeLabel?: string;
  destinationLabel?: string;
  onEnd?: () => void;
  showInsights?: boolean;
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
export const MOCK_NOW_WAIT_MIN = 3;
export const MOCK_NOW_TOTAL_MIN = MOCK_WALK_MIN + MOCK_NOW_WAIT_MIN + MOCK_RIDE_MIN;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatMinutesUntil = (minutes: number) => {
  if (minutes <= 0) return '지금';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분 뒤`;
  if (mins === 0) return `${hours}시간 뒤`;
  return `${hours}시간 ${mins}분 뒤`;
};

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

const haversineMeters = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) => {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
};

const FALLBACK_WEATHER_COORD = { lat: 35.8242, lon: 127.1480 };

type WeatherSnapshot = {
  label: string;
  icon: 'rain' | 'cloud' | 'sun' | 'snow' | 'fog';
  tempC: number | null;
  humidity: number | null;
  pm25: number | null;
  pm10: number | null;
};

type TransferSnapshot = {
  busNumber: string;
  transferStop: string;
  chance: number;
  reason: string;
};

const resolveWeather = async (): Promise<WeatherSnapshot | null> => {
  const coords = await new Promise<{ lat: number; lon: number }>((resolve) => {
    if (!navigator.geolocation) {
      resolve(FALLBACK_WEATHER_COORD);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(FALLBACK_WEATHER_COORD),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 5000 },
    );
  });

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(coords.lat));
  url.searchParams.set('longitude', String(coords.lon));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code');
  url.searchParams.set('timezone', 'auto');

  const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  airUrl.searchParams.set('latitude', String(coords.lat));
  airUrl.searchParams.set('longitude', String(coords.lon));
  airUrl.searchParams.set('current', 'pm2_5,pm10');
  airUrl.searchParams.set('timezone', 'auto');

  const [weatherRes, airRes] = await Promise.all([fetch(url.toString()), fetch(airUrl.toString())]);
  if (!weatherRes.ok) return null;

  const weatherData = await weatherRes.json();
  const airData = airRes.ok ? await airRes.json() : null;
  const code = Number(weatherData?.current?.weather_code);
  if (Number.isNaN(code)) return null;
  const summary = weatherCodeToSummary(code);

  return {
    label: summary.label,
    icon: summary.icon,
    tempC:
      typeof weatherData?.current?.temperature_2m === 'number'
        ? Number(weatherData.current.temperature_2m)
        : null,
    humidity:
      typeof weatherData?.current?.relative_humidity_2m === 'number'
        ? Number(weatherData.current.relative_humidity_2m)
        : null,
    pm25:
      typeof airData?.current?.pm2_5 === 'number'
        ? Number(airData.current.pm2_5)
        : null,
    pm10:
      typeof airData?.current?.pm10 === 'number'
        ? Number(airData.current.pm10)
        : null,
  };
};

const shouldShowTransferCard = (destination: string) =>
  /역|병원|터미널|시청|한옥마을|객사|대학교|대학|캠퍼스|시장|아파트/.test(destination);

const buildTransferPlan = (
  destination: string,
  weather: WeatherSnapshot | null,
  minutesUntilDepart: number,
): TransferSnapshot | null => {
  if (!shouldShowTransferCard(destination)) return null;

  const dest = destination.toLowerCase();
  let busNumber = '119';
  let transferStop = '금암동 환승 정류장';
  let reason = '도심 구간에서 환승이 한 번 필요할 가능성이 있어요.';

  if (dest.includes('전주역')) {
    busNumber = '1000';
    transferStop = '전주역 환승센터';
    reason = '역 방향은 혼잡 시간이 짧아 환승 동선이 명확해요.';
  } else if (dest.includes('전북대') || dest.includes('전북대학교')) {
    busNumber = '536';
    transferStop = '전북대 정문';
    reason = '대학가 구간은 환승 후 도보 이동이 짧은 편이에요.';
  } else if (dest.includes('한옥마을') || dest.includes('객사')) {
    busNumber = '165';
    transferStop = '전동성당·한옥마을';
    reason = '구도심은 환승 후 마지막 구간을 도보로 마무리하는 경우가 많아요.';
  } else if (dest.includes('병원')) {
    busNumber = '108';
    transferStop = '전주병원 앞';
    reason = '병원 주변은 정류장 간격이 가까워 환승 성공률이 높아요.';
  }

  let chance = 86;
  if (weather?.icon === 'rain') chance -= 10;
  if (weather?.icon === 'snow') chance -= 16;
  if ((weather?.pm25 ?? 0) >= 36) chance -= 6;
  if (minutesUntilDepart < 15) chance -= 8;
  if (minutesUntilDepart > 60) chance += 3;
  chance = Math.max(55, Math.min(97, chance));

  return {
    busNumber,
    transferStop,
    chance,
    reason,
  };
};

export function ActiveTripCard({
  origin,
  destination,
  arrivalTime,
  mode = 'arrive',
  createdAt,
  homeLabel = '집',
  destinationLabel,
  onEnd,
  showInsights = true,
  showSubheader = true,
}: ActiveTripCardProps) {
  const [now, setNow] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [walkingSpeedMpm, setWalkingSpeedMpm] = useState<number>(72);
  const [walkingSpeedLive, setWalkingSpeedLive] = useState(false);
  const prevPositionRef = useRef<{ lat: number; lon: number; ts: number } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const profile = loadProfile();
    setWalkingSpeedMpm(estimateWalkingSpeedMpm(profile?.purpose ?? null));
  }, []);

  useEffect(() => {
    let alive = true;
    resolveWeather()
      .then((result) => {
        if (alive) setWeather(result);
      })
      .catch(() => {
        if (alive) setWeather(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ts: pos.timestamp,
        };

        let liveSpeed: number | null = null;
        if (typeof pos.coords.speed === 'number' && Number.isFinite(pos.coords.speed)) {
          liveSpeed = Math.max(0, Math.round(pos.coords.speed * 60));
        } else if (prevPositionRef.current) {
          const prev = prevPositionRef.current;
          const distance = haversineMeters(
            { lat: prev.lat, lon: prev.lon },
            { lat: current.lat, lon: current.lon },
          );
          const elapsedMin = Math.max((current.ts - prev.ts) / 60_000, 0.01);
          liveSpeed = Math.round(distance / elapsedMin);
        }

        if (liveSpeed && liveSpeed > 0) {
          setWalkingSpeedMpm(liveSpeed);
          setWalkingSpeedLive(true);
        }

        prevPositionRef.current = current;
      },
      () => {
        setWalkingSpeedLive(false);
      },
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 10_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const departureBaseDate = useMemo(
    () => (createdAt ? new Date(createdAt) : new Date()),
    [createdAt],
  );
  const arrivalDate = useMemo(() => {
    if (mode === 'depart') return addMin(departureBaseDate, MOCK_NOW_TOTAL_MIN);
    return toToday(arrivalTime);
  }, [arrivalTime, departureBaseDate, mode]);
  const departDate = useMemo(
    () => {
      if (mode === 'depart') return departureBaseDate;
      return arrivalDate ? addMin(arrivalDate, -MOCK_PREP_MIN) : null;
    },
    [arrivalDate, departureBaseDate, mode],
  );
  const stopArriveDate = useMemo(
    () => (departDate ? addMin(departDate, mode === 'depart' ? MOCK_WALK_MIN : MOCK_WALK_MIN + 1) : null),
    [departDate, mode],
  );
  const busBoardDate = useMemo(
    () => (departDate ? addMin(departDate, MOCK_WALK_MIN + MOCK_NOW_WAIT_MIN) : null),
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
    ? Math.max(0, Math.ceil((departDate.getTime() - now.getTime()) / 60000))
    : 0;

  const originLabel = origin || homeLabel || '집';
  const destLabel = destinationLabel || destination || '목적지';
  const transferPlan = buildTransferPlan(destination || destLabel, weather, minutesUntilDepart);
  const weatherLine = weather
    ? `오늘은 ${weather.label}이고, 기온 ${weather.tempC ?? '--'}°C · 습도 ${weather.humidity ?? '--'}% · 미세먼지 ${weather.pm25 ?? '--'}µg/m³예요.`
    : '오늘 날씨를 확인하고 있어요.';
  const transferChanceLabel = transferPlan ? `${transferPlan.chance}%` : '';
  const speedLine = walkingSpeedLive
    ? `현재 속도는 ${formatWalkingSpeed(walkingSpeedMpm)} 정도예요.`
    : `기준 속도는 ${formatWalkingSpeed(walkingSpeedMpm)} 정도예요.`;
  const WeatherGlyph = !weather
    ? Cloud
    : weather.icon === 'sun'
      ? WbSunny
      : weather.icon === 'rain'
        ? Thunderstorm
        : weather.icon === 'snow'
          ? AcUnit
          : Cloud;

  return (
    <div>
      {showSubheader && (
        <p className="text-sm text-gray-600 mb-2">
          오늘의 이동 ·{' '}
          <span className="text-gray-900 font-semibold">
            {originLabel} → {destLabel}
          </span>
        </p>
      )}

      {/* Main departure card */}
      <div className="card-grad rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-600 leading-snug">
          {mode === 'depart'
            ? `${destination || '목적지'} · 지금 출발 기준 최적 경로`
            : `${destination || '목적지'} · ${arrivalTime} 도착`}
        </p>

        {mode === 'depart' ? (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tabular-nums text-gray-900">
                {arrivalDate ? fmt(arrivalDate) : '--:--'}
              </span>
              <span className="text-lg text-gray-700">도착</span>
            </div>
            <p className="text-sm text-emerald-700 font-extrabold mt-2">
              지금 출발하면 가장 빨라요
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tabular-nums text-gray-900">
              {departDate ? fmt(departDate) : '--:--'}
            </span>
            <span className="text-lg text-gray-700">에 출발</span>
          </div>
        )}

        <p className="text-sm text-gray-700 mt-2">
          {mode === 'depart' ? (
            <>
              도보 <span className="font-bold text-gray-900">{MOCK_WALK_MIN}분</span> 후{' '}
              <span className="font-bold text-gray-900">{MOCK_BUS}번</span>을 타면 총{' '}
              <span className="text-emerald-700 font-bold">{MOCK_NOW_TOTAL_MIN}분</span>
              만에 도착해요.
            </>
          ) : (
            <>
              <span className="font-bold text-gray-900 tabular-nums">
                {formatMinutesUntil(minutesUntilDepart)}
              </span>{' '}
              나가면{' '}
              <span className="text-emerald-700 font-bold">
                {MOCK_BUFFER_MIN}분 여유
              </span>
              로 도착해요.
            </>
          )}
        </p>

        <div className="h-px bg-gray-100 my-4" />

        <div className="flex items-start gap-3">
          <span className="bg-emerald-700 text-white font-extrabold text-sm rounded-lg px-3 py-1.5 tabular-nums shrink-0">
            {MOCK_BUS}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium">
              {MOCK_STOP} ·{' '}
              {mode === 'depart'
                ? `${busBoardDate ? fmt(busBoardDate) : '--:--'} 탑승`
                : `${stopArriveDate ? fmt(stopArriveDate) : '--:--'} 도착`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <DirectionsWalk sx={{ fontSize: 14 }} />
              {mode === 'depart'
                ? `도보 ${MOCK_WALK_MIN}분 · 대기 ${MOCK_NOW_WAIT_MIN}분 · 도착 예상 ${
                    arrivalDate ? fmt(arrivalDate) : '--:--'
                  }`
                : `도보 ${MOCK_WALK_MIN}분 · 도착 예상 ${
                    arrivalDate ? fmt(addMin(arrivalDate, -6)) : '--:--'
                  }`}
            </p>
          </div>
        </div>
      </div>

      {/* Miss warning */}
      <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 flex items-center gap-2 text-sm">
        <Warning className="text-rose-500 shrink-0" sx={{ fontSize: 18 }} />
        <p className="text-gray-800">
          {mode === 'depart' ? (
            <>
              이 경로가 현재 기준 가장 빠른 후보예요. 늦게 나가면 다음{' '}
              <span className="font-bold">
                {MOCK_NEXT_BUS}번 {nextBusDate ? fmt(nextBusDate) : '--:--'}
              </span>
              으로 밀릴 수 있어요.
            </>
          ) : (
            <>
              놓치면 다음{' '}
              <span className="font-bold">
                {MOCK_NEXT_BUS}번 {nextBusDate ? fmt(nextBusDate) : '--:--'}
              </span>{' '}
              → 도착 {nextBusArrivalDate ? fmt(nextBusArrivalDate) : '--:--'}{' '}
              <span className="text-rose-600 font-bold">지각 위험</span>
            </>
          )}
        </p>
      </div>

      {showInsights && (
        <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <WeatherGlyph className="text-sky-600" sx={{ fontSize: 18 }} />
            <DeviceThermostat className="text-sky-600" sx={{ fontSize: 18 }} />
            날씨
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{weatherLine}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <div className="flex items-center gap-1 font-semibold text-sky-700">
                <Cloud sx={{ fontSize: 14 }} />
                체감
              </div>
              <p className="mt-1 font-bold text-gray-900">
                {weather ? weather.label : '확인 중'}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <div className="flex items-center gap-1 font-semibold text-sky-700">
                <WaterDrop sx={{ fontSize: 14 }} />
                습도
              </div>
              <p className="mt-1 font-bold text-gray-900">
                {weather?.humidity ?? '--'}%
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <div className="flex items-center gap-1 font-semibold text-sky-700">
                <Air sx={{ fontSize: 14 }} />
                미세먼지
              </div>
              <p className="mt-1 font-bold text-gray-900">
                {weather?.pm25 ?? '--'} / {weather?.pm10 ?? '--'}µg/m³
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <DirectionsWalk className="text-emerald-600" sx={{ fontSize: 18 }} />
          속도
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{speedLine}</p>
        <p className="mt-1 text-xs text-gray-500">
          걷는 속도 변화가 있으면 다음 계산부터 바로 반영돼요.
        </p>
      </div>

      {showInsights && transferPlan && (
        <div className="mt-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <SwapHoriz className="text-violet-600" sx={{ fontSize: 18 }} />
            환승 가능성
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {transferPlan.transferStop}에서 <span className="font-bold text-gray-900">{transferPlan.busNumber}번</span>을
            타는 흐름이에요. 이 버스를 탈 수 있을 확률은{' '}
            <span className="font-bold text-violet-700">{transferChanceLabel}</span> 정도로 봐요.
          </p>
          <p className="mt-2 text-xs text-gray-500">{transferPlan.reason}</p>
        </div>
      )}

      {onEnd && (
        <button
          type="button"
          onClick={onEnd}
          className="mt-3 w-full rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-800 bg-white border-2 border-gray-500"
        >
          <Close sx={{ fontSize: 18 }} />
          경로 안내 종료
        </button>
      )}

    </div>
  );
}
