import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBack,
  Edit,
  Home,
  School,
  DirectionsBus,
  Notifications,
  NotificationsActive,
  Login,
  ChevronRight,
  Add,
  DeleteOutline,
  Person,
  Place,
} from '@mui/icons-material';
import {
  loadProfile,
  saveProfile,
  loadPlaces,
  savePlaces,
  loadNotify,
  saveNotify,
  loadFavoriteRoutes,
  saveFavoriteRoutes,
  loadFavoriteStops,
  saveFavoriteStops,
  wipeAllProfileData,
  type FavoritePlace,
  type FavoriteRoute,
  type FavoriteStop,
  type NotifySettings,
} from '../lib/profileSettings';

interface ProfilePageProps {
  onBack: () => void;
}

type EditTarget = 'nickname' | 'home' | 'frequent' | 'route' | 'stop' | null;

const LEAD_OPTIONS = [3, 5, 10, 15];

function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('showToast', { detail: msg }));
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const [nickname, setNickname] = useState('');
  const [places, setPlaces] = useState<{ home: FavoritePlace | null; frequent: FavoritePlace | null }>({
    home: null,
    frequent: null,
  });
  const [notify, setNotify] = useState<NotifySettings>(() => loadNotify());
  const [routes, setRoutes] = useState<FavoriteRoute[]>([]);
  const [stops, setStops] = useState<FavoriteStop[]>([]);

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [draft, setDraft] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  useEffect(() => {
    setNickname(loadProfile().nickname);
    setPlaces(loadPlaces());
    setNotify(loadNotify());
    setRoutes(loadFavoriteRoutes());
    setStops(loadFavoriteStops());
  }, []);

  const greeting = useMemo(() => (nickname ? `${nickname}님` : '게스트'), [nickname]);

  const openEdit = (target: Exclude<EditTarget, null>) => {
    if (target === 'nickname') setDraft(nickname);
    else if (target === 'home') setDraft(places.home?.address ?? '');
    else if (target === 'frequent') setDraft(places.frequent?.address ?? '');
    else setDraft('');
    setEditTarget(target);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setDraft('');
  };

  const submitEdit = () => {
    const value = draft.trim();
    if (editTarget === 'nickname') {
      saveProfile({ nickname: value });
      setNickname(value);
      toast(value ? '닉네임이 변경되었어요.' : '닉네임을 비웠어요.');
    } else if (editTarget === 'home' || editTarget === 'frequent') {
      const updated = {
        ...places,
        [editTarget]: value ? { address: value } : null,
      };
      savePlaces(updated);
      setPlaces(updated);
      toast(value ? '주소가 저장되었어요.' : '주소를 삭제했어요.');
    } else if (editTarget === 'route') {
      if (!value) {
        closeEdit();
        return;
      }
      const next: FavoriteRoute[] = [
        ...routes,
        { id: `route-${Date.now()}`, routeNo: value },
      ];
      saveFavoriteRoutes(next);
      setRoutes(next);
      toast('노선이 추가되었어요.');
    } else if (editTarget === 'stop') {
      if (!value) {
        closeEdit();
        return;
      }
      const next: FavoriteStop[] = [
        ...stops,
        { id: `stop-${Date.now()}`, name: value },
      ];
      saveFavoriteStops(next);
      setStops(next);
      toast('정류장이 추가되었어요.');
    }
    closeEdit();
  };

  const removeRoute = (id: string) => {
    const next = routes.filter((r) => r.id !== id);
    saveFavoriteRoutes(next);
    setRoutes(next);
  };

  const removeStop = (id: string) => {
    const next = stops.filter((s) => s.id !== id);
    saveFavoriteStops(next);
    setStops(next);
  };

  const updateNotify = (patch: Partial<NotifySettings>) => {
    const next = { ...notify, ...patch };
    setNotify(next);
    saveNotify(next);
  };

  const handleWithdraw = () => {
    wipeAllProfileData();
    setConfirmWithdraw(false);
    toast('탈퇴되었습니다. 데이터가 삭제되었어요.');
    // Onboarding will re-show on next reload since its flag was wiped
    window.setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="size-full overflow-auto bg-white">
      <div className="max-w-md mx-auto min-h-full pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-2 pt-2 pb-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 active:bg-black/5 transition"
            aria-label="뒤로가기"
          >
            <ArrowBack />
          </button>
          <h1 className="text-[17px] font-extrabold text-[#14322E]">나의 정보</h1>
        </div>

        {/* Profile card */}
        <section className="mx-4 mt-2 rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#EAF4F0] text-[#007956] flex items-center justify-center shrink-0">
              <Person sx={{ fontSize: 32 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#5A6B66]">안녕하세요</p>
              <p className="text-[18px] font-extrabold text-[#14322E] truncate">{greeting}</p>
            </div>
            <button
              type="button"
              onClick={() => openEdit('nickname')}
              className="w-9 h-9 rounded-full text-gray-700 active:bg-gray-100 transition flex items-center justify-center"
              aria-label="닉네임 변경"
            >
              <Edit sx={{ fontSize: 18 }} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => toast('로그인 기능은 준비 중이에요.')}
            className="mt-3 w-full rounded-xl bg-gray-50 py-2.5 flex items-center justify-center gap-2 text-[14px] font-bold text-[#005C42] active:bg-gray-100 transition"
          >
            <Login sx={{ fontSize: 18 }} />
            로그인
          </button>
        </section>

        {/* 즐겨찾기 */}
        <SectionTitle>즐겨찾기</SectionTitle>
        <section className="mx-4 rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <FavoritePlaceRow
            Icon={Home}
            label="집"
            address={places.home?.address}
            onEdit={() => openEdit('home')}
          />
          <FavoritePlaceRow
            Icon={School}
            label="자주 가는 곳"
            address={places.frequent?.address}
            onEdit={() => openEdit('frequent')}
          />
        </section>

        <section className="mx-4 mt-3 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-[#14322E]">
              <DirectionsBus sx={{ fontSize: 20 }} />
              <span className="text-[14px] font-bold">즐겨찾는 노선</span>
            </div>
            <button
              type="button"
              onClick={() => openEdit('route')}
              className="text-[13px] font-bold text-[#007956] flex items-center gap-0.5 active:opacity-70"
            >
              <Add sx={{ fontSize: 18 }} />
              추가
            </button>
          </div>
          {routes.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-[#5A6B66]">
              아직 즐겨찾는 노선이 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {routes.map((r) => (
                <li key={r.id} className="flex items-center px-4 py-3">
                  <span className="flex-1 text-[14px] font-semibold text-[#14322E]">
                    {r.routeNo}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRoute(r.id)}
                    className="text-gray-400 active:opacity-70"
                    aria-label="노선 삭제"
                  >
                    <DeleteOutline sx={{ fontSize: 20 }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mx-4 mt-3 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-[#14322E]">
              <Place sx={{ fontSize: 20 }} />
              <span className="text-[14px] font-bold">즐겨찾는 정류장</span>
            </div>
            <button
              type="button"
              onClick={() => openEdit('stop')}
              className="text-[13px] font-bold text-[#007956] flex items-center gap-0.5 active:opacity-70"
            >
              <Add sx={{ fontSize: 18 }} />
              추가
            </button>
          </div>
          {stops.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-[#5A6B66]">
              아직 즐겨찾는 정류장이 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {stops.map((s) => (
                <li key={s.id} className="flex items-center px-4 py-3">
                  <span className="flex-1 text-[14px] font-semibold text-[#14322E] truncate">
                    {s.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStop(s.id)}
                    className="text-gray-400 active:opacity-70 shrink-0"
                    aria-label="정류장 삭제"
                  >
                    <DeleteOutline sx={{ fontSize: 20 }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 알림 설정 */}
        <SectionTitle>알림 설정</SectionTitle>
        <section className="mx-4 rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <ToggleRow
            Icon={NotificationsActive}
            label="도착 알림"
            sub="버스 도착 전 알려드려요"
            checked={notify.arrival}
            onChange={(v) => updateNotify({ arrival: v })}
          />
          <ToggleRow
            Icon={Notifications}
            label="출발 알림"
            sub="집에서 나가야 할 시간에 알려드려요"
            checked={notify.departure}
            onChange={(v) => updateNotify({ departure: v })}
          />
          <div className="px-4 py-3">
            <p className="text-[13px] font-bold text-[#14322E]">알림 시간</p>
            <p className="text-[11px] text-[#5A6B66] mt-0.5">도착 몇 분 전에 알릴까요?</p>
            <div className="mt-3 flex gap-2">
              {LEAD_OPTIONS.map((m) => {
                const active = notify.leadMinutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateNotify({ leadMinutes: m })}
                    className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition ${
                      active
                        ? 'bg-[#007956] text-white shadow-sm'
                        : 'bg-gray-50 text-[#14322E] active:bg-gray-100'
                    }`}
                  >
                    {m}분
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 탈퇴하기 */}
        <div className="mt-8 mx-4">
          <button
            type="button"
            onClick={() => setConfirmWithdraw(true)}
            className="w-full text-[12px] font-semibold text-gray-400 underline underline-offset-2 active:text-gray-600"
          >
            탈퇴하기
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditDialog
          target={editTarget}
          value={draft}
          onChange={setDraft}
          onCancel={closeEdit}
          onSubmit={submitEdit}
        />
      )}

      {/* Withdraw confirm */}
      {confirmWithdraw && (
        <ConfirmDialog
          title="정말 탈퇴하시겠어요?"
          body="저장된 닉네임·자주 가는 곳·알림 설정이 모두 삭제됩니다."
          confirmLabel="탈퇴하기"
          danger
          onCancel={() => setConfirmWithdraw(false)}
          onConfirm={handleWithdraw}
        />
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-5 pt-5 pb-2 text-[12px] font-bold text-[#5A6B66] uppercase tracking-wide">
      {children}
    </h2>
  );
}

interface FavoritePlaceRowProps {
  Icon: typeof Home;
  label: string;
  address?: string;
  onEdit: () => void;
}

function FavoritePlaceRow({ Icon, label, address, onEdit }: FavoritePlaceRowProps) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition"
    >
      <Icon sx={{ fontSize: 22 }} className="text-gray-900 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#14322E]">{label}</p>
        <p className="text-[12px] text-[#5A6B66] truncate mt-0.5">
          {address || '주소를 등록해주세요'}
        </p>
      </div>
      <ChevronRight sx={{ fontSize: 20 }} className="text-gray-400" />
    </button>
  );
}

interface ToggleRowProps {
  Icon: typeof Notifications;
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ Icon, label, sub, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon sx={{ fontSize: 22 }} className="text-gray-900 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#14322E]">{label}</p>
        <p className="text-[11px] text-[#5A6B66] mt-0.5 truncate">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition shrink-0 ${
          checked ? 'bg-[#007956]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

interface EditDialogProps {
  target: Exclude<EditTarget, null>;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function EditDialog({ target, value, onChange, onCancel, onSubmit }: EditDialogProps) {
  const META: Record<Exclude<EditTarget, null>, { title: string; placeholder: string }> = {
    nickname: { title: '닉네임 변경', placeholder: '닉네임을 입력하세요' },
    home: { title: '집 주소', placeholder: '집 주소를 입력하세요' },
    frequent: { title: '자주 가는 곳', placeholder: '자주 가는 곳을 입력하세요' },
    route: { title: '노선 추가', placeholder: '예: 165' },
    stop: { title: '정류장 추가', placeholder: '예: 전북대정문' },
  };
  const { title, placeholder } = META[target];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-[16px] font-extrabold text-[#14322E]">{title}</h3>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] focus:outline-none focus:border-[#007956]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-[14px] font-bold text-gray-700 active:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 rounded-xl bg-[#007956] py-3 text-[14px] font-bold text-white active:bg-[#006548]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({ title, body, confirmLabel, danger, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-[16px] font-extrabold text-[#14322E]">{title}</h3>
        <p className="mt-2 text-[13px] text-[#5A6B66] leading-relaxed">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-[14px] font-bold text-gray-700 active:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 text-[14px] font-bold text-white active:opacity-90 ${
              danger ? 'bg-[#DC2626]' : 'bg-[#007956]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
