import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowBack,
  Check,
  MyLocation,
  Place,
  Search,
} from '@mui/icons-material';
import {
  reverseSearchPlace,
  searchPlaces,
  type PlaceSearchResult,
} from '../lib/placeSearch';
import {
  getNaverMapKey,
  getNaverMapsDebugState,
  getNaverMapsDebugUrl,
  loadNaverMaps,
} from '../lib/naverMaps';

interface PlacePickerPageProps {
  field: 'origin' | 'destination';
  initialValue: string;
  onCancel: () => void;
  onSelect: (place: PlaceSearchResult) => void;
}

const DEFAULT_CENTER = { lat: 35.8467, lon: 127.1337 };

const FEATURED_PLACES: PlaceSearchResult[] = [
  {
    id: 'featured-jbnu',
    name: '전북대학교 전주캠퍼스',
    address: '전북특별자치도 전주시 덕진구 백제대로 567',
    category: '장소',
    lat: 35.8467,
    lon: 127.1337,
  },
  {
    id: 'featured-jeonju-station',
    name: '전주역',
    address: '전북특별자치도 전주시 덕진구 동부대로 680',
    category: '장소',
    lat: 35.8498,
    lon: 127.1618,
  },
  {
    id: 'featured-hanok',
    name: '전주한옥마을',
    address: '전북특별자치도 전주시 완산구 기린대로 99',
    category: '장소',
    lat: 35.8151,
    lon: 127.1534,
  },
];

function coordFromClick(rect: DOMRect, clientX: number, clientY: number) {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return {
    lat: DEFAULT_CENTER.lat + (0.5 - y) * 0.08,
    lon: DEFAULT_CENTER.lon + (x - 0.5) * 0.1,
    x: x * 100,
    y: y * 100,
  };
}

function Marker({
  place,
  onSelect,
}: {
  place: PlaceSearchResult;
  onSelect: (place: PlaceSearchResult) => void;
}) {
  const x = place.lon ? 50 + (place.lon - DEFAULT_CENTER.lon) * 1000 : 50;
  const y = place.lat ? 50 - (place.lat - DEFAULT_CENTER.lat) * 1250 : 50;
  const clampedX = Math.max(12, Math.min(88, x));
  const clampedY = Math.max(12, Math.min(88, y));

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(place);
      }}
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${clampedX}%`, top: `${clampedY}%` }}
      aria-label={`${place.name} 선택`}
    >
      <span className="block bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
        {place.name}
      </span>
      <span className="mx-auto block w-3 h-3 bg-emerald-700 rotate-45 -mt-1" />
    </button>
  );
}

interface NaverMapPanelProps {
  markers: PlaceSearchResult[];
  onSelect: (place: PlaceSearchResult) => void;
  onFallbackClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  pickedPoint: { x: number; y: number } | null;
  mapError: string;
  setMapError: (value: string) => void;
  setMapLoadFailed: (value: boolean) => void;
  setMapReady: (value: boolean) => void;
  selectedMarkerRef: React.MutableRefObject<any>;
  resultMarkersRef: React.MutableRefObject<any[]>;
  naverRef: React.MutableRefObject<any>;
  naverMapRef: React.MutableRefObject<any>;
  debugOpen: boolean;
  setDebugOpen: (updater: (open: boolean) => boolean) => void;
}

function NaverMapPanel({
  markers,
  onSelect,
  onFallbackClick,
  pickedPoint,
  mapError,
  setMapError,
  setMapLoadFailed,
  setMapReady,
  selectedMarkerRef,
  resultMarkersRef,
  naverRef,
  naverMapRef,
  debugOpen,
  setDebugOpen,
}: NaverMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let clickListener: any = null;

    if (!getNaverMapKey()) {
      setFailed(true);
      setMapLoadFailed(true);
      setMapError('VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.');
      return () => {
        disposed = true;
      };
    }

    loadNaverMaps()
      .then((naver) => {
        if (disposed || !containerRef.current) return;
        naverRef.current = naver;
        const center = new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lon);
        const map = new naver.maps.Map(containerRef.current, {
          center,
          zoom: 15,
          minZoom: 8,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
          },
        });
        naverMapRef.current = map;
        setReady(true);
        setMapReady(true);

        window.setTimeout(() => {
          naver.maps.Event.trigger(map, 'resize');
          map.setCenter(center);
        }, 150);

        clickListener = naver.maps.Event.addListener(map, 'click', async (event: any) => {
          const coord = event.coord;
          const lat = coord.lat();
          const lon = coord.lng();
          const place = await reverseSearchWithNaver(naver, lat, lon);
          if (disposed) return;
          onSelect(place);

          if (selectedMarkerRef.current) selectedMarkerRef.current.setMap(null);
          selectedMarkerRef.current = new naver.maps.Marker({
            position: new naver.maps.LatLng(lat, lon),
            map,
          });
        });
      })
      .catch((error) => {
        setFailed(true);
        setMapLoadFailed(true);
        setMapError(error instanceof Error ? error.message : '네이버 지도 SDK를 불러오지 못했습니다.');
      });

    return () => {
      disposed = true;
      if (naverRef.current && clickListener) {
        naverRef.current.maps.Event.removeListener(clickListener);
      }
      if (selectedMarkerRef.current) selectedMarkerRef.current.setMap(null);
      resultMarkersRef.current.forEach((marker) => marker.setMap(null));
      resultMarkersRef.current = [];
    };
  }, [
    naverMapRef,
    naverRef,
    onSelect,
    resultMarkersRef,
    selectedMarkerRef,
    setMapError,
    setMapLoadFailed,
    setMapReady,
  ]);

  useEffect(() => {
    const naver = naverRef.current;
    const map = naverMapRef.current;
    if (!naver || !map || !ready) return;

    resultMarkersRef.current.forEach((marker) => marker.setMap(null));
    resultMarkersRef.current = markers
      .filter((place) => place.lat && place.lon)
      .map((place) => {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(place.lat, place.lon),
          map,
          title: place.name,
        });
        naver.maps.Event.addListener(marker, 'click', () => {
          onSelect(place);
          map.panTo(marker.getPosition());
        });
        return marker;
      });
  }, [markers, naverMapRef, naverRef, onSelect, ready, resultMarkersRef]);

  return (
    <div
      ref={containerRef}
      onClick={ready ? undefined : onFallbackClick}
      className="relative mt-3 h-80 overflow-hidden rounded-3xl border border-emerald-100 bg-[#E8EDE3]"
    >
      {!ready && (
        <>
          <div className="absolute inset-0 opacity-80">
            <div className="absolute left-[-10%] top-[22%] h-5 w-[120%] rotate-[-9deg] bg-white/80" />
            <div className="absolute left-[-8%] top-[48%] h-7 w-[120%] rotate-[4deg] bg-[#d8d3c1]" />
            <div className="absolute left-[18%] top-[-10%] h-[120%] w-5 rotate-[13deg] bg-white/80" />
            <div className="absolute left-[62%] top-[-10%] h-[120%] w-4 rotate-[-7deg] bg-white/80" />
            <div className="absolute left-[4%] top-[4%] h-20 w-28 rounded-3xl bg-emerald-200/60" />
            <div className="absolute right-[-8%] bottom-[-4%] h-28 w-36 rounded-3xl bg-emerald-200/50" />
          </div>

          {markers.map((place) => (
            <Marker key={place.id} place={place} onSelect={onSelect} />
          ))}

          {pickedPoint && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${pickedPoint.x}%`, top: `${pickedPoint.y}%` }}
            >
              <Place className="text-rose-600 drop-shadow" sx={{ fontSize: 38 }} />
            </div>
          )}

          {failed && (
            <div className="absolute left-3 top-3 right-3 rounded-2xl bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm">
              <p className="font-bold text-gray-900">네이버 지도를 불러오지 못했어요.</p>
              <p className="mt-0.5">{mapError || '콘솔의 Maps 설정을 확인해 주세요.'}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDebugOpen((open) => !open);
                }}
                className="mt-2 rounded-full bg-gray-900 px-3 py-1 text-[11px] font-bold text-white"
              >
                진단 정보
              </button>
              {debugOpen && (
                <pre className="mt-2 max-h-28 overflow-auto rounded-xl bg-gray-100 p-2 text-[10px] leading-relaxed text-gray-700">
                  {JSON.stringify(getNaverMapsDebugState(), null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function reverseSearchWithNaver(naver: any, lat: number, lon: number): Promise<PlaceSearchResult> {
  return new Promise((resolve) => {
    const fallback = () =>
      reverseSearchPlace(lat, lon).then(resolve).catch(() => {
        resolve({
          id: `picked-${lat}-${lon}`,
          name: '지도에서 선택한 위치',
          address: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          category: '장소',
          lat,
          lon,
        });
      });

    if (!naver?.maps?.Service?.reverseGeocode) {
      fallback();
      return;
    }

    naver.maps.Service.reverseGeocode(
      {
        coords: new naver.maps.LatLng(lat, lon),
        orders: [
          naver.maps.Service.OrderType.ROAD_ADDR,
          naver.maps.Service.OrderType.ADDR,
        ].join(','),
      },
      (status: any, response: any) => {
        if (status !== naver.maps.Service.Status.OK) {
          fallback();
          return;
        }

        const address = response?.v2?.address;
        const roadAddress = address?.roadAddress || '';
        const jibunAddress = address?.jibunAddress || '';
        const name = roadAddress.split(' ').slice(-2).join(' ') || jibunAddress.split(' ').slice(-2).join(' ');
        resolve({
          id: `naver-picked-${lat}-${lon}`,
          name: name || '지도에서 선택한 위치',
          address: roadAddress || jibunAddress || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          category: roadAddress ? '도로명' : '지역',
          lat,
          lon,
        });
      },
    );
  });
}

export function PlacePickerPage({
  field,
  initialValue,
  onCancel,
  onSelect,
}: PlacePickerPageProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{ x: number; y: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [mapError, setMapError] = useState('');
  const [debugOpen, setDebugOpen] = useState(false);
  const naverRef = useRef<any>(null);
  const naverMapRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const resultMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsSearching(false);
      return () => {
        alive = false;
      };
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      searchPlaces(q).then((next) => {
        if (!alive) return;
        setResults(next);
        setIsSearching(false);
      });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const mapMarkers = useMemo(() => {
    const withCoords = results.filter((place) => place.lat && place.lon);
    return withCoords.length > 0 ? withCoords.slice(0, 5) : FEATURED_PLACES;
  }, [results]);

  const title = field === 'origin' ? '현재 위치 설정' : '목적지 설정';

  const selectPlace = (place: PlaceSearchResult) => {
    setSelected(place);
    setQuery(place.name);

    const naver = naverRef.current;
    const map = naverMapRef.current;
    if (naver && map && place.lat && place.lon) {
      const position = new naver.maps.LatLng(place.lat, place.lon);
      map.panTo(position);
      if (selectedMarkerRef.current) selectedMarkerRef.current.setMap(null);
      selectedMarkerRef.current = new naver.maps.Marker({ position, map });
    }
  };

  const handleFallbackMapClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const point = coordFromClick(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
    setPickedPoint({ x: point.x, y: point.y });
    const place = await reverseSearchPlace(point.lat, point.lon);
    setSelected(place);
    setQuery(place.name);
  };

  const confirm = () => {
    if (selected) {
      onSelect(selected);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    onSelect({
      id: `manual-${trimmed}`,
      name: trimmed,
      address: trimmed,
      category: '장소',
    });
  };

  return (
    <div className="size-full overflow-auto bg-[#FAFAFA]">
      <div className="max-w-md mx-auto min-h-full pb-28">
        <div className="px-4 pt-2 pb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
        </div>

        <div className="px-4 mt-3">
          <div className="card-grad rounded-3xl p-4 shadow-md">
            <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3">
              <Search className="text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                }}
                autoFocus
                placeholder="장소명, 건물명, 주소 검색"
                className="flex-1 min-w-0 outline-none bg-transparent text-sm placeholder:text-gray-400"
              />
            </div>

            <div className="relative">
              <NaverMapPanel
                markers={mapMarkers}
                onSelect={selectPlace}
                onFallbackClick={handleFallbackMapClick}
                pickedPoint={pickedPoint}
                mapError={mapError}
                setMapError={setMapError}
                setMapLoadFailed={setMapLoadFailed}
                setMapReady={setMapReady}
                selectedMarkerRef={selectedMarkerRef}
                resultMarkersRef={resultMarkersRef}
                naverRef={naverRef}
                naverMapRef={naverMapRef}
                debugOpen={debugOpen}
                setDebugOpen={setDebugOpen}
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const naver = naverRef.current;
                  const map = naverMapRef.current;
                  if (naver && map) {
                    const center = map.getCenter();
                    reverseSearchWithNaver(naver, center.lat(), center.lng()).then(selectPlace);
                    return;
                  }
                  selectPlace(FEATURED_PLACES[0]);
                  setPickedPoint({ x: 50, y: 50 });
                }}
                className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-emerald-700"
                aria-label="현재 지도 중심으로"
              >
                <MyLocation />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              지도 위 장소를 누르거나 원하는 지점을 터치해서 설정할 수 있어요.
            </p>
          </div>
        </div>

        <div className="px-4 mt-4">
          <p className="text-sm font-bold text-gray-800 mb-2">
            {isSearching ? '검색 중' : results.length > 0 ? '검색 결과' : '추천 장소'}
          </p>
          <div className="card-grad rounded-2xl shadow-md divide-y divide-gray-100 overflow-hidden">
            {(results.length > 0 ? results : FEATURED_PLACES).map((place) => {
              const active = selected?.id === place.id;
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    selectPlace(place);
                  }}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left"
                >
                  <div className="mt-0.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 shrink-0">
                    {place.category}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{place.name}</p>
                    <p className="text-xs text-gray-500 truncate">{place.address}</p>
                  </div>
                  {active && <Check className="text-emerald-700 shrink-0" sx={{ fontSize: 20 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-16 inset-x-0 z-30 pointer-events-none">
          <div className="max-w-md mx-auto px-4 pb-3 pointer-events-auto">
            <button
              type="button"
              onClick={confirm}
              disabled={!query.trim()}
              className="w-full rounded-2xl py-4 font-extrabold text-base text-white shadow-md bg-emerald-700 flex items-center justify-center transition-opacity disabled:opacity-40"
            >
              이 위치로 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
