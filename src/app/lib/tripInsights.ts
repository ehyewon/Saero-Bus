export type TravelPurpose = 'school' | 'work' | 'academy' | 'other';

interface ProfileState {
  nickname?: string;
  purpose?: TravelPurpose;
}

export type WeatherSummary = {
  label: string;
  icon: 'rain' | 'cloud' | 'sun' | 'snow' | 'fog';
};

const PROFILE_KEY = 'saerobus.profile.v1';

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileState;
    return {
      nickname: typeof parsed.nickname === 'string' && parsed.nickname.trim() ? parsed.nickname.trim() : null,
      purpose: parsed.purpose ?? null,
    };
  } catch {
    return null;
  }
}

export function estimateWalkingSpeedMpm(purpose?: TravelPurpose | null) {
  switch (purpose) {
    case 'school':
      return 76;
    case 'work':
      return 74;
    case 'academy':
      return 70;
    case 'other':
    default:
      return 72;
  }
}

export function formatWalkingSpeed(mpm: number) {
  return `분당 ${mpm}m`;
}

export function weatherCodeToSummary(code: number): WeatherSummary {
  if ([0].includes(code)) return { label: '맑아요', icon: 'sun' };
  if ([1, 2, 3, 45, 48].includes(code)) return { label: '흐려요', icon: 'cloud' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
    return { label: '비가 와요', icon: 'rain' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈이 와요', icon: 'snow' };
  return { label: '날씨를 확인 중이에요', icon: 'fog' };
}
