import {
  WbSunny,
  Cloud,
  Umbrella,
  AcUnit,
  Masks,
  LocalDrink,
  Checkroom,
  BeachAccess,
} from '@mui/icons-material';

type IconType = typeof WbSunny;

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'haze';

export interface Weather {
  condition: WeatherCondition;
  tempC: number;
  pm10: number;
  humidity: number;
}

/** Korean PM10 air-quality bands. */
export function pm10Grade(pm: number): '좋음' | '보통' | '나쁨' | '매우 나쁨' {
  if (pm <= 30) return '좋음';
  if (pm <= 80) return '보통';
  if (pm <= 150) return '나쁨';
  return '매우 나쁨';
}

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  sunny: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈',
  haze: '안개',
};

/**
 * Returns a short note when weather is likely to affect the bus ride, otherwise null.
 * Data-message consistency: the message must match what the metrics already show
 * (e.g. don't say "미세먼지 나빠요" when the grade is 보통).
 */
export function busImpactNote(w: Weather): string | null {
  if (w.condition === 'rain') return '비 와요, 버스 지연될 수 있어요';
  if (w.condition === 'snow') return '눈 와요, 미끄러우니 천천히';
  const grade = pm10Grade(w.pm10);
  if (grade === '나쁨' || grade === '매우 나쁨') return '미세먼지 나빠요, 마스크 챙기세요';
  if (w.tempC >= 33) return '더워요, 대기 시 주의';
  if (w.tempC <= -10) return '추워요, 대기 시 주의';
  return null;
}

export const CONDITION_ICONS: Record<WeatherCondition, IconType> = {
  sunny: WbSunny,
  cloudy: Cloud,
  rain: Umbrella,
  snow: AcUnit,
  haze: Masks,
};

/** WWO weather codes used by wttr.in. https://www.worldweatheronline.com/developer/api/docs/weather-icons.aspx */
function wttrCodeToCondition(code: number): WeatherCondition {
  if (code === 113) return 'sunny';
  if ([116, 119, 122].includes(code)) return 'cloudy';
  if ([143, 248, 260].includes(code)) return 'haze'; // mist / fog
  if ([182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 371].includes(code)) return 'snow';
  return 'rain'; // remaining codes are all rain/drizzle/thunder
}

const REAL_WEATHER_CACHE_KEY = 'saerobus.weather.real.v1';
const REAL_WEATHER_TTL_MS = 30 * 60 * 1000; // 30 min — wttr.in updates roughly that often

interface CachedRealWeather {
  ts: number;
  weather: Weather;
}

/**
 * Fetch live weather for Jeonju from wttr.in (no API key needed, permissive
 * CORS). Returns null on any failure so the caller can fall back to mock.
 * Cached in sessionStorage for 30 minutes so navigating around doesn't refetch.
 * PM10 isn't provided by wttr.in — we keep a nominal value until a separate
 * air-quality API is wired up.
 */
export async function fetchRealWeather(): Promise<Weather | null> {
  try {
    const cached = sessionStorage.getItem(REAL_WEATHER_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedRealWeather;
      if (parsed?.weather && Date.now() - parsed.ts < REAL_WEATHER_TTL_MS) {
        return parsed.weather;
      }
    }
  } catch {
    /* ignore — fall through to network */
  }

  try {
    const res = await fetch('https://wttr.in/Jeonju?format=j1&lang=ko');
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current_condition?.[0];
    if (!current) return null;

    const code = Number(current.weatherCode);
    const tempC = Number(current.temp_C);
    const humidity = Number(current.humidity);
    if (!Number.isFinite(tempC) || !Number.isFinite(humidity)) return null;

    const weather: Weather = {
      condition: wttrCodeToCondition(code),
      tempC,
      humidity,
      pm10: 38, // wttr.in doesn't return PM10 — keep a nominal "보통" value
    };

    try {
      sessionStorage.setItem(
        REAL_WEATHER_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), weather } satisfies CachedRealWeather),
      );
    } catch {
      /* ignore */
    }
    return weather;
  } catch {
    return null;
  }
}

/**
 * Deterministic per-day mock weather. Same calendar day → same condition,
 * temperature follows a gentle circadian curve so it looks alive without
 * a real API. Keeps the UI stable across navigations.
 */
export function loadMockWeather(date = new Date()): Weather {
  const conditions: WeatherCondition[] = ['sunny', 'cloudy', 'rain', 'snow', 'haze'];
  const dayIdx = date.getDate() + date.getMonth() * 31;
  const condition = conditions[dayIdx % conditions.length];

  const hour = date.getHours() + date.getMinutes() / 60;
  // Peak around 14:00, low around 02:00 — same swing year-round for the mock.
  const baseTemp = condition === 'snow' ? -1 : condition === 'rain' ? 14 : 19;
  const tempC = baseTemp + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 6;

  return {
    condition,
    tempC: Math.round(tempC * 10) / 10,
    pm10: condition === 'haze' ? 95 : condition === 'rain' || condition === 'snow' ? 22 : 38,
    humidity: condition === 'rain' || condition === 'snow' ? 90 : condition === 'haze' ? 35 : 55,
  };
}

export interface WeatherTip {
  Icon: IconType;
  line: string;
  /** Foreground icon colour */
  accent: string;
  /** Pastel chip background to match the accent */
  bg: string;
}

/** Pick the single most useful "what to bring" line for the conditions. */
export function pickWeatherTip(w: Weather): WeatherTip {
  if (w.condition === 'rain') {
    return { Icon: Umbrella, line: '비 와요. 우산 꼭 챙기세요', accent: '#0E6E8B', bg: '#DBEAFE' };
  }
  if (w.condition === 'snow') {
    return { Icon: AcUnit, line: '눈 와요. 미끄러우니 천천히', accent: '#0EA5E9', bg: '#E0F2FE' };
  }
  if (w.condition === 'haze' || w.pm10 >= 80) {
    return { Icon: Masks, line: '미세먼지 나빠요. 마스크 챙기세요', accent: '#92400E', bg: '#FEF3C7' };
  }
  if (w.tempC >= 28) {
    return { Icon: LocalDrink, line: '더워요. 시원한 물 챙겨가요', accent: '#F4A82B', bg: '#FEF3C7' };
  }
  if (w.tempC >= 25 && w.condition === 'sunny') {
    return { Icon: BeachAccess, line: '햇볕 강해요. 양산도 좋아요', accent: '#F4A82B', bg: '#FEF3C7' };
  }
  if (w.tempC <= 3) {
    return { Icon: Checkroom, line: '많이 추워요. 따뜻하게 입어요', accent: '#5A6B66', bg: '#F3F4F6' };
  }
  if (w.tempC <= 10) {
    return { Icon: Checkroom, line: '쌀쌀해요. 겉옷 챙기세요', accent: '#5A6B66', bg: '#F3F4F6' };
  }
  if (w.condition === 'sunny') {
    return { Icon: WbSunny, line: '햇살 좋아요. 가볍게 다녀와요', accent: '#F4A82B', bg: '#FEF3C7' };
  }
  return { Icon: Cloud, line: '평범한 날씨예요. 편하게 다녀와요', accent: '#5A6B66', bg: '#F3F4F6' };
}
