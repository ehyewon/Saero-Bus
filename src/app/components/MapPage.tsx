import { useEffect, useRef, useState } from 'react';
import { ArrowBack, MyLocation, DirectionsBus, Refresh } from '@mui/icons-material';
import { loadNaverMaps } from '../lib/naverMaps';
import { blogApi, type StopSummary, type ArrivalBoard, type ArrivalItem } from '../lib/blogApi';
import {
  BusDetailView,
  busTypeFromNo,
  loadBusFavorites,
  saveBusFavorites,
  type BusInfo,
} from './BusPage';

const goHub = () =>
  window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }));

// Fallback when geolocation is denied or unavailable.
const JEONJU_CENTER = { lat: 35.8242, lng: 127.1480 };

type AnyNaverMap = {
  setCenter: (latlng: unknown) => void;
  setZoom: (z: number) => void;
};
type AnyNaverMarker = { setMap: (m: unknown) => void };

interface StopMarker {
  stop: StopSummary;
  marker: AnyNaverMarker;
}

const PIN_GREEN = '#007956';

function stopMarkerHtml(): string {
  return `
    <div style="position:relative;width:30px;height:38px;cursor:pointer;transform:translate(-15px,-38px);">
      <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0 C6.7 0 0 6.7 0 15 c0 8.6 9.1 16.2 14 22.5 a1.3 1.3 0 0 0 2 0 C20.9 31.2 30 23.6 30 15 30 6.7 23.3 0 15 0 Z"
              fill="${PIN_GREEN}"/>
        <g transform="translate(7.5 6.5)" fill="white">
          <rect x="0" y="0" width="15" height="13" rx="2.5" />
          <rect x="2" y="3" width="11" height="4" fill="${PIN_GREEN}" />
          <circle cx="3" cy="11.5" r="1.4" fill="${PIN_GREEN}" />
          <circle cx="12" cy="11.5" r="1.4" fill="${PIN_GREEN}" />
        </g>
      </svg>
    </div>`;
}

function userDotHtml(): string {
  return `
    <div style="width:18px;height:18px;border-radius:50%;background:#1d72e8;border:3px solid #ffffff;box-shadow:0 0 0 2px rgba(29,114,232,0.25);transform:translate(-9px,-9px);"></div>`;
}

export function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyNaverMap | null>(null);
  const userMarkerRef = useRef<AnyNaverMarker | null>(null);
  const stopMarkersRef = useRef<StopMarker[]>([]);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopSummary | null>(null);
  const [arrivalBoard, setArrivalBoard] = useState<ArrivalBoard | null>(null);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [arrivalRefreshKey, setArrivalRefreshKey] = useState(0);
  const [selectedBus, setSelectedBus] = useState<BusInfo | null>(null);
  const [busRefreshKey, setBusRefreshKey] = useState(0);
  const [busFavorites, setBusFavorites] = useState<BusInfo[]>(() => loadBusFavorites());
  const [busRefreshSpinning, setBusRefreshSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setUserPos(JEONJU_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos(JEONJU_CENTER),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  // Initialise the map as soon as the SDK is ready — independent of geolocation
  // so a pending permission prompt never leaves the user with a blank card.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadNaverMaps()
      .then((naver) => {
        if (cancelled || !containerRef.current) return;
        const map = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(JEONJU_CENTER.lat, JEONJU_CENTER.lng),
          zoom: 15,
          minZoom: 11,
          logoControl: false,
          mapDataControl: false,
          scaleControl: false,
        }) as unknown as AnyNaverMap;
        mapRef.current = map;

        // Fire a resize once layout has settled — without this, tiles stay
        // blank when the container was momentarily 0px during construction.
        window.setTimeout(() => {
          if (!cancelled && mapRef.current) {
            naver.maps.Event.trigger(mapRef.current, 'resize');
          }
        }, 50);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userPos) return;
    loadNaverMaps().then((naver) => {
      if (!mapRef.current) return;
      const ll = new naver.maps.LatLng(userPos.lat, userPos.lng);
      mapRef.current.setCenter(ll);

      if (userMarkerRef.current) {
        (userMarkerRef.current as unknown as { setMap: (m: unknown) => void }).setMap(null);
      }
      userMarkerRef.current = new naver.maps.Marker({
        position: ll,
        map: mapRef.current,
        icon: {
          content: userDotHtml(),
          anchor: new naver.maps.Point(0, 0),
        },
        zIndex: 1000,
      }) as unknown as AnyNaverMarker;
    });
  }, [userPos]);

  useEffect(() => {
    if (!userPos) return;
    let cancelled = false;

    blogApi
      .getNearbyStops(userPos.lat, userPos.lng, 1500)
      .then((stops) => {
        if (cancelled || !mapRef.current) return;
        loadNaverMaps().then((naver) => {
          if (cancelled || !mapRef.current) return;
          for (const sm of stopMarkersRef.current) sm.marker.setMap(null);
          stopMarkersRef.current = stops.map((stop) => {
            const marker = new naver.maps.Marker({
              position: new naver.maps.LatLng(stop.lat, stop.lng),
              map: mapRef.current,
              icon: {
                content: stopMarkerHtml(),
                anchor: new naver.maps.Point(0, 0),
              },
            });
            naver.maps.Event.addListener(marker, 'click', () => {
              setSelectedStop(stop);
            });
            return { stop, marker: marker as unknown as AnyNaverMarker };
          });
        });
      })
      .catch(() => {
        /* swallow — pins just won't appear */
      });

    return () => {
      cancelled = true;
    };
  }, [userPos]);

  useEffect(() => {
    if (!selectedStop) {
      setArrivalBoard(null);
      setArrivalLoading(false);
      return;
    }
    let cancelled = false;
    setArrivalLoading(true);
    setArrivalBoard(null);
    blogApi
      .getStopArrivals(selectedStop.stop_id)
      .then((board) => {
        if (!cancelled) setArrivalBoard(board);
      })
      .catch(() => {
        /* swallow — UI shows "정보를 불러올 수 없어요" */
      })
      .finally(() => {
        if (!cancelled) setArrivalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStop, arrivalRefreshKey]);

  const busFromArrival = (item: ArrivalItem): BusInfo => ({
    stdid: item.stdid,
    number: item.brt_no,
    name: item.brt_no,
    type: busTypeFromNo(item.brt_no),
    firstBus: '--:--',
    lastBus: '--:--',
    interval: '-',
    source: 'api',
  });

  const toggleBusFavorite = (bus: BusInfo) => {
    setBusFavorites((prev) => {
      const exists = prev.some((f) => f.number === bus.number);
      const next = exists
        ? prev.filter((f) => f.number !== bus.number)
        : [...prev, bus];
      saveBusFavorites(next);
      return next;
    });
  };

  const handleBusRefresh = () => {
    setBusRefreshKey((k) => k + 1);
    setBusRefreshSpinning(true);
    window.setTimeout(() => setBusRefreshSpinning(false), 600);
  };

  const handleCenterOnUser = () => {
    if (!mapRef.current || !userPos) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        loadNaverMaps().then((naver) => {
          if (!mapRef.current) return;
          const ll = new naver.maps.LatLng(next.lat, next.lng);
          mapRef.current.setCenter(ll);
          mapRef.current.setZoom(16);
          if (userMarkerRef.current) {
            (userMarkerRef.current as unknown as { setPosition: (p: unknown) => void }).setPosition(ll);
          }
        });
      },
      () => {
        loadNaverMaps().then((naver) => {
          if (!mapRef.current) return;
          mapRef.current.setCenter(new naver.maps.LatLng(userPos.lat, userPos.lng));
          mapRef.current.setZoom(16);
        });
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

  if (selectedBus) {
    const isFav = busFavorites.some((f) => f.number === selectedBus.number);
    return (
      <>
        <BusDetailView
          key={`${selectedBus.stdid ?? selectedBus.number}-${busRefreshKey}`}
          bus={selectedBus}
          isFavorite={isFav}
          onBack={() => setSelectedBus(null)}
          onToggleFavorite={() => toggleBusFavorite(selectedBus)}
        />
        <button
          type="button"
          onClick={handleBusRefresh}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-emerald-700 text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          aria-label="새로고침"
        >
          <Refresh sx={{ fontSize: 22 }} className={busRefreshSpinning ? 'animate-spin' : ''} />
        </button>
      </>
    );
  }

  return (
    <div className="h-screen w-full bg-[#EAF4F0]">
      <div className="max-w-md mx-auto h-full flex flex-col">
      <div className="px-4 pt-2 pb-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={goHub}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
          aria-label="뒤로"
        >
          <ArrowBack />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">지도</h1>
      </div>

      {/* Explicit pixel height — flex-1 + overflow:hidden was clipping tiles
          on Safari/WebKit. */}
      <div className="relative mx-4 mb-4" style={{ height: 'calc(100vh - 80px)' }}>
        <div
          ref={containerRef}
          className="w-full h-full rounded-2xl border border-emerald-200 bg-emerald-50"
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur text-center px-6">
            <div>
              <p className="font-bold text-gray-900">지도를 불러올 수 없어요</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {selectedStop && (
          <StopDetailSheet
            stop={selectedStop}
            board={arrivalBoard}
            loading={arrivalLoading}
            onClose={() => setSelectedStop(null)}
            onRefresh={() => setArrivalRefreshKey((k) => k + 1)}
            onSelectBus={(item) => setSelectedBus(busFromArrival(item))}
          />
        )}

        <button
          type="button"
          onClick={handleCenterOnUser}
          className="absolute bottom-4 right-4 z-10 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-700"
          aria-label="내 위치로"
        >
          <MyLocation />
        </button>
      </div>
      </div>
    </div>
  );
}

function formatEta(item: ArrivalItem): string {
  if (typeof item.eta_sec === 'number' && item.eta_sec >= 0) {
    if (item.eta_sec < 60) return '곧 도착';
    return `${Math.round(item.eta_sec / 60)}분 뒤`;
  }
  if (typeof item.stops_away === 'number') {
    if (item.stops_away === 0) return '곧 도착';
    return `${item.stops_away}정거장 전`;
  }
  return '정보 없음';
}

interface StopDetailSheetProps {
  stop: StopSummary;
  board: ArrivalBoard | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectBus: (item: ArrivalItem) => void;
}

function StopDetailSheet({ stop, board, loading, onClose, onRefresh, onSelectBus }: StopDetailSheetProps) {
  return (
    <div className="absolute left-0 right-0 bottom-0 z-20 bg-white rounded-t-2xl shadow-2xl max-h-[55%] flex flex-col">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="min-w-0 flex-1 pr-3">
          <h2 className="text-base font-extrabold text-gray-900 truncate">{stop.stop_name}</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">정류장 ID · {stop.stop_id}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 mr-1"
          aria-label="새로고침"
        >
          <Refresh sx={{ fontSize: 18 }} className={loading ? 'animate-spin' : ''} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-3">
        {loading && (
          <p className="text-sm text-gray-500 py-6 text-center">도착 정보를 불러오는 중…</p>
        )}

        {!loading && !board && (
          <p className="text-sm text-gray-500 py-6 text-center">
            도착 정보를 불러올 수 없어요.
          </p>
        )}

        {!loading && board && board.arrivals.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">
            현재 도착 예정 버스가 없어요.
          </p>
        )}

        {!loading && board && board.arrivals.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {board.arrivals.map((item, idx) => (
              <li key={`${item.brt_no}-${item.stdid}-${idx}`}>
                <button
                  type="button"
                  onClick={() => onSelectBus(item)}
                  className="w-full py-3 flex items-center gap-3 text-left active:bg-gray-50"
                >
                  <span className="inline-flex items-center justify-center min-w-12 px-2.5 h-8 rounded-full bg-emerald-700 text-white text-sm font-bold">
                    {item.brt_no}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">{formatEta(item)}</p>
                    {typeof item.stops_away === 'number' && typeof item.eta_sec === 'number' && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {item.stops_away}정거장 전
                      </p>
                    )}
                  </div>
                  <DirectionsBus sx={{ fontSize: 18 }} className="text-gray-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
