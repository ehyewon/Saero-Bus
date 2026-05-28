import { useEffect, useState } from 'react';
import {
  Home,
  School,
  KeyboardArrowDown,
  LocationOn,
  Search,
  CheckCircle,
  Work,
  MenuBook,
  MoreHoriz,
  NotificationsActive,
  MyLocation,
  MailOutlined,
  LockOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

/** localStorage keys — bump the suffix if the onboarding flow changes materially. */
export const ONBOARDING_KEY = 'saerobus.onboarded.v2';
const PLACES_KEY = 'saerobus.places.v1';
const PROFILE_KEY = 'saerobus.profile.v1';
const ACCOUNT_KEY = 'saerobus.account.v1';
const FAVORITE_PLACES_KEY = 'favoritePlaces';

type SocialProvider = 'kakao' | 'google';

interface SavedAccount {
  email: string;
  password: string;
  socialProvider: SocialProvider | null;
}

function saveAccount(account: SavedAccount) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch {
    /* ignore — non-critical persistence */
  }
}

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
  nickname: string;
  purpose: TravelPurpose;
  home: RegisteredPlace | null;
  frequent: RegisteredPlace | null;
  arrivalTime: string;
  notificationEnabled: boolean;
  locationEnabled: boolean;
}

function savePlaces(places: SavedPlaces) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        nickname: places.nickname,
        purpose: places.purpose,
        notificationEnabled: places.notificationEnabled,
        locationEnabled: places.locationEnabled,
      })
    );
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
  id: string;
  address: string;
  roadAddress?: string;
  jibunAddress?: string;
  lat: number;
  lng: number;
}

interface NaverGeocodeAddress {
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
  x: string;
  y: string;
}

interface NaverMapOptions {
  center: unknown;
  zoom: number;
}

type NaverGeocodeCallback = (
  status: string,
  response: { v2?: { addresses?: NaverGeocodeAddress[] } }
) => void;

declare global {
  interface Window {
    naver?: {
      maps: {
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (element: HTMLElement, options: NaverMapOptions) => unknown;
        Marker: new (options: { position: unknown; map: unknown }) => unknown;
        Service: {
          Status: { OK: string };
          geocode: (options: { query: string }, callback: NaverGeocodeCallback) => void;
        };
      };
    };
    __saerobusNaverMapsPromise?: Promise<void>;
  }
}

const NAVER_MAPS_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID as
  | string
  | undefined;

function loadNaverMaps(): Promise<void> {
  if (window.naver?.maps?.Service) return Promise.resolve();
  if (!NAVER_MAPS_CLIENT_ID) {
    return Promise.reject(new Error('Missing Naver Maps client ID'));
  }
  if (window.__saerobusNaverMapsPromise) return window.__saerobusNaverMapsPromise;

  window.__saerobusNaverMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({
      ncpKeyId: NAVER_MAPS_CLIENT_ID,
      submodules: 'geocoder',
    });
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${params.toString()}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Naver Maps'));
    document.head.appendChild(script);
  });

  return window.__saerobusNaverMapsPromise;
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

const ONBOARDING_STEPS = ['nickname', 'purpose', 'places', 'arrivalTime', 'permissions', 'account', 'summary'] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
type TravelPurpose = 'school' | 'work' | 'academy' | 'other';

const PURPOSE_OPTIONS: Array<{
  id: TravelPurpose;
  label: string;
  description: string;
  Icon: typeof School;
}> = [
  { id: 'school', label: '학교', description: '등하교 시간에 맞춰 안내', Icon: School },
  { id: 'work', label: '회사', description: '출퇴근 루틴 중심 안내', Icon: Work },
  { id: 'academy', label: '학원', description: '정해진 수업 시간에 맞춰 안내', Icon: MenuBook },
  { id: 'other', label: '기타', description: '자주 가는 일정 중심 안내', Icon: MoreHoriz },
];

function sanitizeNickname(value: string) {
  return value.replace(/[^A-Za-z가-힣\s]/g, '').replace(/\s{2,}/g, ' ').slice(0, 16);
}

interface OnboardingProps {
  /** Called when the user finishes or skips onboarding. */
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('nickname');
  const [nickname, setNickname] = useState('');
  const [isComposingNickname, setIsComposingNickname] = useState(false);
  const [purpose, setPurpose] = useState<TravelPurpose | null>(null);
  const [home, setHome] = useState<RegisteredPlace | null>(null);
  const [frequent, setFrequent] = useState<RegisteredPlace | null>(null);
  const [arrivalTime, setArrivalTime] = useState('오전 9:00');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);
  const activeStepIndex = ONBOARDING_STEPS.indexOf(step);
  const trimmedNickname = nickname.trim();
  const trimmedEmail = email.trim();
  const selectedPurpose = PURPOSE_OPTIONS.find((item) => item.id === purpose);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const credentialsReady = emailLooksValid && password.length >= 6;
  const accountReady = credentialsReady || socialProvider !== null;
  const canGoNext =
    (step === 'nickname' && trimmedNickname.length > 0) ||
    (step === 'purpose' && Boolean(purpose)) ||
    step === 'places' ||
    step === 'arrivalTime' ||
    step === 'permissions' ||
    (step === 'account' && accountReady) ||
    step === 'summary';

  const finish = (save: boolean) => {
    if (save) {
      savePlaces({
        nickname: trimmedNickname,
        purpose: purpose ?? 'other',
        home,
        frequent,
        arrivalTime,
        notificationEnabled,
        locationEnabled,
      });
      saveAccount({
        email: trimmedEmail,
        password,
        socialProvider,
      });
    }
    markOnboardingSeen();
    onComplete();
  };

  const pickSocial = (provider: SocialProvider) => {
    setSocialProvider((current) => (current === provider ? null : provider));
  };

  const goNext = () => {
    if (!canGoNext) return;
    const nextIndex = Math.min(activeStepIndex + 1, ONBOARDING_STEPS.length - 1);
    setStep(ONBOARDING_STEPS[nextIndex]);
  };

  const goBack = () => {
    const prevIndex = Math.max(activeStepIndex - 1, 0);
    setStep(ONBOARDING_STEPS[prevIndex]);
  };

  return (
    <div className="fixed inset-0 overflow-auto overflow-x-hidden bg-[#EAF4F0]">
      <div className="w-full max-w-md mx-auto min-h-full box-border px-6 pt-5 pb-8 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ONBOARDING_STEPS.map((item, index) => (
              <span
                key={item}
                className={`h-2 rounded-full transition-all ${
                  index === activeStepIndex ? 'w-6 bg-[#007956]' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            className="text-sm font-semibold text-gray-400"
          >
            건너뛰기
          </button>
        </div>

        {step === 'nickname' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              어떻게<br />불러드릴까요?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              앱에서 사용할 별명을<br />한글이나 영어로 입력해주세요.
            </p>

            <div className="mt-8 rounded-2xl bg-white border border-gray-200 px-5 py-4">
              <label htmlFor="nickname" className="block text-xs text-gray-500">
                별명
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(event) => {
                  const value = event.target.value;
                  setNickname(isComposingNickname ? value : sanitizeNickname(value));
                }}
                onCompositionStart={() => setIsComposingNickname(true)}
                onCompositionEnd={(event) => {
                  setIsComposingNickname(false);
                  setNickname(sanitizeNickname(event.currentTarget.value));
                }}
                placeholder="예: 민지, Alex"
                autoComplete="nickname"
                className="mt-2 w-full bg-transparent text-[22px] font-extrabold text-gray-900 placeholder:text-gray-300 focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-400">한글, 영어만 입력할 수 있어요</span>
                <span className={trimmedNickname.length > 0 ? 'text-[#007956]' : 'text-gray-300'}>
                  {trimmedNickname.length}/16
                </span>
              </div>
            </div>
          </>
        )}

        {step === 'purpose' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              주로 어디에<br />가시나요?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              이동 목적에 맞춰<br />출발 안내를 조정할게요.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {PURPOSE_OPTIONS.map(({ id, label, description, Icon }) => {
                const selected = purpose === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPurpose(id)}
                    className={`min-h-[128px] rounded-2xl border bg-white p-4 text-left transition-colors ${
                      selected ? 'border-[#007956] ring-2 ring-[#007956]/20' : 'border-gray-200'
                    }`}
                  >
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                      selected ? 'bg-[#007956] text-white' : 'bg-[#EAF4F0] text-[#007956]'
                    }`}>
                      <Icon sx={{ fontSize: 23 }} />
                    </div>
                    <p className="font-extrabold text-gray-900">{label}</p>
                    <p className="mt-1 text-xs leading-snug text-gray-500">{description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'places' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              자주 가는 곳을<br />알려주세요
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              다음부터 앱을 켜면 바로<br />출발 시각을 알려드릴 수 있어요.
            </p>

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
          </>
        )}

        {step === 'arrivalTime' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              몇 시까지<br />도착해야 하나요?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              평소 도착 시간을 기준으로<br />출발 시각을 추천할게요.
            </p>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-5 py-5">
              <p className="text-xs text-gray-500">보통 도착 시각</p>
              <div className="relative mt-3">
                <select
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full appearance-none bg-transparent pr-8 text-[28px] font-extrabold text-gray-900 focus:outline-none cursor-pointer"
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
          </>
        )}

        {step === 'permissions' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              필요한 알림을<br />준비할게요
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              출발 전 알림과 위치 기반 안내를<br />원하는 대로 켜둘 수 있어요.
            </p>

            <div className="mt-8 space-y-3">
              <ToggleRow
                Icon={NotificationsActive}
                title="출발 전 알림"
                description="놓치지 않도록 출발 시간을 알려드려요"
                checked={notificationEnabled}
                onChange={setNotificationEnabled}
              />
              <ToggleRow
                Icon={MyLocation}
                title="위치 기반 정류장 안내"
                description="현재 위치에서 가까운 정류장을 찾을 때 사용해요"
                checked={locationEnabled}
                onChange={setLocationEnabled}
              />
            </div>
          </>
        )}

        {step === 'account' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              계정을<br />만들어주세요
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              이메일과 비밀번호로 가입하거나<br />소셜 계정으로 빠르게 시작할 수 있어요.
            </p>

            <div className="mt-8 space-y-3">
              <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <MailOutlined className="text-gray-500" fontSize="small" />
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSocialProvider(null);
                  }}
                  placeholder="이메일"
                  className="flex-1 outline-none text-sm bg-transparent min-w-0 placeholder:text-gray-400"
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <LockOutlined className="text-gray-500" fontSize="small" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSocialProvider(null);
                  }}
                  placeholder="비밀번호 (6자 이상)"
                  className="flex-1 outline-none text-sm bg-transparent min-w-0 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">또는 소셜로 시작</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => pickSocial('kakao')}
                className={`w-full rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-shadow ${
                  socialProvider === 'kakao'
                    ? 'bg-[#FEE500] text-[#191600] shadow-md ring-2 ring-[#191600]'
                    : 'bg-[#FEE500] text-[#191600] shadow-sm active:scale-[0.99]'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 3C6.477 3 2 6.582 2 11c0 2.84 1.86 5.33 4.66 6.76-.2.69-.71 2.43-.81 2.81-.13.47.17.46.36.34.15-.1 2.39-1.62 3.36-2.28.81.12 1.66.18 2.43.18 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
                  />
                </svg>
                {socialProvider === 'kakao' ? '카카오로 시작 (선택됨)' : '카카오로 시작'}
              </button>
              <button
                type="button"
                onClick={() => pickSocial('google')}
                className={`w-full rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 bg-white text-gray-800 border transition-shadow ${
                  socialProvider === 'google'
                    ? 'border-gray-800 ring-2 ring-gray-800 shadow-md'
                    : 'border-gray-200 shadow-sm active:scale-[0.99]'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                {socialProvider === 'google' ? 'Google로 시작 (선택됨)' : 'Google로 시작'}
              </button>
            </div>

            {!accountReady && (trimmedEmail.length > 0 || password.length > 0) && (
              <p className="mt-4 text-xs text-gray-400">
                이메일 형식과 6자 이상 비밀번호를 입력하거나, 소셜 로그인을 선택해주세요.
              </p>
            )}
          </>
        )}

        {step === 'summary' && (
          <>
            <h1 className="mt-8 text-[28px] leading-[1.3] font-extrabold text-gray-900">
              이대로<br />시작할까요?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
              입력한 설정은 나중에<br />언제든 다시 바꿀 수 있어요.
            </p>

            <div className="mt-8 space-y-3">
              <SummaryRow label="별명" value={trimmedNickname || '미설정'} />
              <SummaryRow label="목적" value={selectedPurpose?.label ?? '기타'} />
              <SummaryRow label="집" value={home?.address ?? '나중에 등록'} />
              <SummaryRow label="자주 가는 곳" value={frequent?.address ?? '나중에 등록'} />
              <SummaryRow label="도착 시각" value={arrivalTime} />
              <SummaryRow
                label="알림"
                value={`${notificationEnabled ? '출발 알림 켬' : '출발 알림 끔'} · ${
                  locationEnabled ? '위치 안내 켬' : '위치 안내 끔'
                }`}
              />
              <SummaryRow
                label="계정"
                value={
                  socialProvider === 'kakao'
                    ? '카카오 연동'
                    : socialProvider === 'google'
                    ? 'Google 연동'
                    : trimmedEmail || '미설정'
                }
              />
            </div>
          </>
        )}

        <div className="flex-1 min-h-8" />

        <button
          type="button"
          onClick={step === 'summary' ? () => finish(true) : goNext}
          disabled={!canGoNext}
          className="mt-2 w-full rounded-2xl py-4 text-base font-extrabold text-white bg-[#007956] shadow-md active:scale-[0.99] transition-transform disabled:bg-gray-300 disabled:shadow-none disabled:active:scale-100"
        >
          {step === 'summary' ? '시작하기' : '다음'}
        </button>
        <button
          type="button"
          onClick={step === 'nickname' ? () => finish(false) : goBack}
          className="mt-3 w-full py-2 text-sm font-semibold text-gray-400"
        >
          {step === 'nickname' ? '나중에 설정할게요' : '이전'}
        </button>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  Icon: typeof NotificationsActive;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ Icon, title, description, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF4F0] text-[#007956]">
        <Icon sx={{ fontSize: 24 }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-gray-500">{description}</p>
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#007956]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-base font-extrabold leading-snug text-gray-900">
        {value}
      </p>
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'missing-key' | 'error'>(
    NAVER_MAPS_CLIENT_ID ? 'idle' : 'missing-key'
  );

  useEffect(() => {
    if (!NAVER_MAPS_CLIENT_ID) {
      setStatus('missing-key');
      setResults([]);
      return;
    }

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

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        await loadNaverMaps();
        window.naver?.maps.Service.geocode({ query: trimmed }, (geocodeStatus, response) => {
          if (cancelled) return;
          if (geocodeStatus !== window.naver?.maps.Service.Status.OK) {
            setResults([]);
            setStatus('error');
            return;
          }

          const addresses = response.v2?.addresses ?? [];
          setResults(
            addresses.slice(0, 5).map((item, index) => {
              const address = item.roadAddress || item.jibunAddress || item.englishAddress || trimmed;
              return {
                id: `${item.x}-${item.y}-${index}`,
                address,
                roadAddress: item.roadAddress,
                jibunAddress: item.jibunAddress,
                lat: Number(item.y),
                lng: Number(item.x),
              };
            })
          );
          setStatus('idle');
        });
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setResults([]);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selected?.address]);

  const choose = (candidate: AddressCandidate) => {
    const place = {
      address: candidate.address,
      lat: candidate.lat,
      lng: candidate.lng,
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
        <Icon className="text-[#007956] shrink-0" sx={{ fontSize: 26 }} />
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

      {status === 'missing-key' && (
        <div className="border-t border-gray-100 px-5 py-3 text-sm text-amber-600">
          네이버 지도 API 키가 필요해요
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
              key={candidate.id}
              type="button"
              onClick={() => choose(candidate)}
              className="w-full flex items-start gap-3 px-5 py-3 text-left active:bg-gray-50"
            >
              <LocationOn className="mt-0.5 text-[#007956] shrink-0" sx={{ fontSize: 20 }} />
              <span className="min-w-0">
                <span className="block text-sm leading-snug text-gray-700 line-clamp-2">
                  {candidate.address}
                </span>
                {candidate.jibunAddress && candidate.jibunAddress !== candidate.address && (
                  <span className="mt-0.5 block text-xs text-gray-400 line-clamp-1">
                    {candidate.jibunAddress}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="h-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <NaverMiniMap place={selected} label={label} />
          </div>
        </div>
      )}
    </div>
  );
}

function NaverMiniMap({ place, label }: { place: RegisteredPlace; label: string }) {
  const mapRef = useState<HTMLDivElement | null>(null);
  const element = mapRef[0];
  const setElement = mapRef[1];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!element) return;
    let cancelled = false;

    loadNaverMaps()
      .then(() => {
        if (cancelled || !window.naver?.maps) return;
        const position = new window.naver.maps.LatLng(place.lat, place.lng);
        const map = new window.naver.maps.Map(element, {
          center: position,
          zoom: 16,
        });
        new window.naver.maps.Marker({ position, map });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [element, place.lat, place.lng]);

  if (!NAVER_MAPS_CLIENT_ID || failed) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
        네이버 지도 미리보기를 표시할 수 없어요
      </div>
    );
  }

  return <div ref={setElement} aria-label={`${label} 네이버 지도`} className="h-full w-full" />;
}
