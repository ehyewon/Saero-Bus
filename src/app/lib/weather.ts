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
  haze: '미세먼지',
};

export const CONDITION_ICONS: Record<WeatherCondition, IconType> = {
  sunny: WbSunny,
  cloudy: Cloud,
  rain: Umbrella,
  snow: AcUnit,
  haze: Masks,
};

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
