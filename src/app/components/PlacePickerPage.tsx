import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowBack,
  Check,
  MyLocation,
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

function Marker({ place }: { place: PlaceSearchResult }) {
  const x = place.lon ? 50 + (place.lon - DEFAULT_CENTER.lon) * 1000 : 50;
  const y = place.lat ? 50 - (place.lat - DEFAULT_CENTER.lat) * 1250 : 50;
  const clampedX = Math.max(12, Math.min(88, x));
  const clampedY = Math.max(12, Math.min(88, y));

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ left: `${clampedX}%`, top: `${clampedY}%` }}
    >
      <span className="block bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
        {place.name}
      </span>
      <span className="mx-auto block w-3 h-3 bg-emerald-700 rotate-45 -mt-1" />
    </div>
  );
}

interface NaverMapPanelProps {
  markers: PlaceSearchResult[];
  mapError: string;
  setMapError: (value: string) => void;
  setMapLoadFailed: (value: boolean) => void;
  setMapReady: (value: boolean) => void;
  onPick: (place: PlaceSearchResult) => void;
  selectedMarkerRef: React.MutableRefObject<any>;
  resultMarkersRef: React.MutableRefObject<any[]>;
  liveLocationMarkerRef: React.MutableRefObject<any>;
  latestLivePositionRef: React.MutableRefObject<{ lat: number; lon: number } | null>;
  naverRef: React.MutableRefObject<any>;
  naverMapRef: React.MutableRefObject<any>;
  debugOpen: boolean;
  setDebugOpen: (updater: (open: boolean) => boolean) => void;
}

function NaverMapPanel({
  markers,
  mapError,
  setMapError,
  setMapLoadFailed,
  setMapReady,
  onPick,
  selectedMarkerRef,
  resultMarkersRef,
  liveLocationMarkerRef,
  latestLivePositionRef,
  naverRef,
  naverMapRef,
  debugOpen,
  setDebugOpen,
}: NaverMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [liveLocationActive, setLiveLocationActive] = useState(false);

  useEffect(() => {
    let disposed = false;
    let clickListener: any = null;
    let watchId: number | null = null;

    if (!getNaverMapKey()) {
      setFailed(true);
      setMapLoadFailed(true);
      setMapError('네이버 지도 키가 설정되지 않았습니다.');
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
          onPick(place);

          if (selectedMarkerRef.current) selectedMarkerRef.current.setMap(null);
          selectedMarkerRef.current = new naver.maps.Marker({
            position: new naver.maps.LatLng(lat, lon),
            map,
          });
        });

        if (navigator.geolocation) {
          const applyCurrentPosition = (lat: number, lon: number) => {
            latestLivePositionRef.current = { lat, lon };
            const current = new naver.maps.LatLng(lat, lon);
            if (!liveLocationMarkerRef.current) {
              liveLocationMarkerRef.current = new naver.maps.Marker({
                position: current,
                map,
                icon: {
                  content:
                    '<div style="width:18px;height:18px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 3px 10px rgba(0,0,0,.25);"></div>',
                  anchor: new naver.maps.Point(9, 9),
                },
                title: '내 현재 위치',
              });
            } else {
              liveLocationMarkerRef.current.setPosition(current);
            }
            map.panTo(current);
            map.setCenter(current);
            setLiveLocationActive(true);
          };

          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (disposed) return;
              applyCurrentPosition(position.coords.latitude, position.coords.longitude);
            },
            () => {
              if (disposed) return;
              setLiveLocationActive(false);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 3000,
              timeout: 10000,
            },
          );

          watchId = navigator.geolocation.watchPosition(
            (position) => {
              if (disposed) return;
              applyCurrentPosition(position.coords.latitude, position.coords.longitude);
            },
            () => {
              setLiveLocationActive(false);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 3000,
              timeout: 10000,
            },
          );
        }
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
      if (liveLocationMarkerRef.current) liveLocationMarkerRef.current.setMap(null);
      resultMarkersRef.current.forEach((marker) => marker.setMap(null));
      resultMarkersRef.current = [];
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [
    liveLocationMarkerRef,
    latestLivePositionRef,
    naverMapRef,
    naverRef,
    onPick,
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
          return marker;
        });
  }, [markers, naverMapRef, naverRef, ready, resultMarkersRef]);

  return (
    <div
      ref={containerRef}
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
          <Marker key={place.id} place={place} />
          ))}

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
      {ready && (
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5 align-middle" />
          {liveLocationActive ? '내 위치 추적 중' : '내 위치 권한 필요'}
        </div>
      )}
    </div>
  );
}

function reverseSearchWithNaver(naver: any, lat: number, lon: number): Promise<PlaceSearchResult> {
  return new Promise((resolve) => {
    const fallback = () =>
      reverseSearchPlace(lat, lon)
        .then(resolve)
        .catch(() => {
          const name = '선택한 위치';
          resolve({
            id: `picked-${lat}-${lon}`,
            name,
            address: name,
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
        const land = address?.land;
        const addition0 = land?.addition0;
        const buildingName = addition0?.type === 'building' ? addition0?.value || '' : '';
        const name = buildingName || roadAddress || jibunAddress || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        const displayAddress = roadAddress || jibunAddress || name;
        if (!roadAddress && !jibunAddress) {
          fallback();
          return;
        }
        resolve({
          id: `naver-picked-${lat}-${lon}`,
          name,
          address: displayAddress,
          roadAddress,
          jibunAddress,
          category: roadAddress ? '도로명' : '지역',
          lat,
          lon,
        });
      },
    );
  });
}

function searchPlacesWithNaver(naver: any, query: string): Promise<PlaceSearchResult[]> {
  return new Promise((resolve) => {
    if (!naver?.maps?.Service?.geocode) {
      resolve([]);
      return;
    }

    naver.maps.Service.geocode({ query }, (status: any, response: any) => {
      if (status !== naver.maps.Service.Status.OK) {
        resolve([]);
        return;
      }

      const addresses = response?.v2?.addresses;
      if (!Array.isArray(addresses)) {
        resolve([]);
        return;
      }

      resolve(
        addresses.slice(0, 8).map((item: any, index: number) => {
          const roadAddress = item.roadAddress || '';
          const jibunAddress = item.jibunAddress || '';
          const displayAddress = roadAddress || jibunAddress || item.englishAddress || query;
          return {
            id: `naver-search-${item.x}-${item.y}-${index}`,
            name: displayAddress,
            address: displayAddress,
            roadAddress,
            jibunAddress,
            category: roadAddress ? '도로명' : '지역',
            lat: Number(item.y),
            lon: Number(item.x),
          };
        }),
      );
    });
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
  const [selectionSource, setSelectionSource] = useState<'search' | 'map' | null>(null);
  const [hasTypedQuery, setHasTypedQuery] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [mapError, setMapError] = useState('');
  const [debugOpen, setDebugOpen] = useState(false);
  const naverRef = useRef<any>(null);
  const naverMapRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const resultMarkersRef = useRef<any[]>([]);
  const liveLocationMarkerRef = useRef<any>(null);
  const latestLivePositionRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    if (selectionSource === 'map') {
      setResults(selected ? [selected] : []);
      setIsSearching(false);
      return () => {
        alive = false;
      };
    }
    if (q.length < 1) {
      setResults([]);
      setIsSearching(false);
      return () => {
        alive = false;
      };
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      const naver = naverRef.current;
      const search = q.length >= 2 && naver
        ? searchPlacesWithNaver(naver, q).then((naverResults) =>
            naverResults.length > 0 ? naverResults : searchPlaces(q),
          )
        : searchPlaces(q);

      search.then((next) => {
        if (!alive) return;
        setResults(next);
        setIsSearching(false);
      });
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [mapReady, query, selected, selectionSource]);

  const mapMarkers = useMemo(() => {
    const withCoords = results.filter((place) => place.lat && place.lon);
    return withCoords.length > 0 ? withCoords.slice(0, 5) : FEATURED_PLACES;
  }, [results]);

  const title = field === 'origin' ? '현재 위치 설정' : '목적지 설정';

  const selectPlace = (place: PlaceSearchResult, source: 'search' | 'map' = 'search') => {
    setSelected(place);
    setSelectionSource(source);
    setQuery(place.name);
    setHasTypedQuery(false);
    if (source === 'map') {
      setResults([place]);
    }

    const naver = naverRef.current;
    const map = naverMapRef.current;
    if (naver && map && place.lat && place.lon) {
      const position = new naver.maps.LatLng(place.lat, place.lon);
      map.panTo(position);
      if (selectedMarkerRef.current) selectedMarkerRef.current.setMap(null);
      selectedMarkerRef.current = new naver.maps.Marker({ position, map });
    }
  };

  const pickCurrentLocation = () => {
    const naver = naverRef.current;
    const map = naverMapRef.current;
    const latest = latestLivePositionRef.current;

    if (naver && map && latest) {
      const current = new naver.maps.LatLng(latest.lat, latest.lon);
      map.panTo(current);
      map.setCenter(current);
      if (!liveLocationMarkerRef.current) {
        liveLocationMarkerRef.current = new naver.maps.Marker({
          position: current,
          map,
          icon: {
            content:
              '<div style="width:18px;height:18px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 3px 10px rgba(0,0,0,.25);"></div>',
            anchor: new naver.maps.Point(9, 9),
          },
          title: '내 현재 위치',
        });
      } else {
        liveLocationMarkerRef.current.setPosition(current);
      }
      reverseSearchWithNaver(naver, current.lat(), current.lng()).then((place) =>
        selectPlace(place, 'map'),
      );
      return;
    }

    if (naver && map && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          latestLivePositionRef.current = { lat, lon };
          const current = new naver.maps.LatLng(lat, lon);
          map.panTo(current);
          map.setCenter(current);
          if (!liveLocationMarkerRef.current) {
            liveLocationMarkerRef.current = new naver.maps.Marker({
              position: current,
              map,
              icon: {
                content:
                  '<div style="width:18px;height:18px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 3px 10px rgba(0,0,0,.25);"></div>',
                anchor: new naver.maps.Point(9, 9),
              },
              title: '내 현재 위치',
            });
          } else {
            liveLocationMarkerRef.current.setPosition(current);
          }
          reverseSearchWithNaver(naver, current.lat(), current.lng()).then((place) =>
            selectPlace(place, 'map'),
          );
        },
        () => {
          const current = liveLocationMarkerRef.current?.getPosition?.() || map.getCenter();
          map.panTo(current);
          map.setCenter(current);
          reverseSearchWithNaver(naver, current.lat(), current.lng()).then((place) =>
            selectPlace(place, 'map'),
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 10000,
        },
      );
      return;
    }
    setMapError('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해 주세요.');
  };

  const visibleResults = selectionSource === 'map'
    ? []
    : results.length > 0
      ? results
      : [];
  const showResultsPanel = selectionSource !== 'map' && hasTypedQuery && results.length > 0;

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
    <div className="size-full overflow-auto bg-[#EAF4F0]">
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
                  setHasTypedQuery(true);
                  setSelected(null);
                  setSelectionSource(null);
                }}
                autoFocus
                placeholder="장소명, 건물명, 주소 검색"
                className="flex-1 min-w-0 outline-none bg-transparent text-sm placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={pickCurrentLocation}
                className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"
                aria-label="현위치로 설정"
              >
                <MyLocation sx={{ fontSize: 20 }} />
              </button>
            </div>
            {showResultsPanel && (
              <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                <div className="px-4 py-2 text-[11px] font-bold text-gray-400">
                  {isSearching ? '검색 중' : '검색 결과'}
                </div>
                {visibleResults.map((place) => {
                  const active = selected?.id === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => selectPlace(place, 'search')}
                      className="w-full px-4 py-3 flex items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 shrink-0">
                        {place.category}
                      </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{place.name}</p>
                      {place.roadAddress && (
                        <p className="text-xs text-gray-500 truncate">도로명 {place.roadAddress}</p>
                      )}
                      {place.jibunAddress && (
                        <p className="text-xs text-gray-500 truncate">지번 {place.jibunAddress}</p>
                      )}
                      {!place.roadAddress && !place.jibunAddress && (
                        <p className="text-xs text-gray-500 truncate">{place.address}</p>
                      )}
                    </div>
                      {active && <Check className="text-emerald-700 shrink-0" sx={{ fontSize: 20 }} />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
            <NaverMapPanel
                markers={mapMarkers}
                mapError={mapError}
                setMapError={setMapError}
                setMapLoadFailed={setMapLoadFailed}
                setMapReady={setMapReady}
                onPick={(place) => selectPlace(place, 'map')}
                selectedMarkerRef={selectedMarkerRef}
                resultMarkersRef={resultMarkersRef}
                liveLocationMarkerRef={liveLocationMarkerRef}
                latestLivePositionRef={latestLivePositionRef}
                naverRef={naverRef}
                naverMapRef={naverMapRef}
                debugOpen={debugOpen}
                setDebugOpen={setDebugOpen}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              검색창 옆 현위치 버튼으로 현재 위치를 맞출 수 있어요.
            </p>

            <button
              type="button"
              onClick={confirm}
              disabled={!query.trim()}
              className="mt-4 w-full rounded-2xl py-4 font-extrabold text-base text-white shadow-md bg-emerald-700 flex items-center justify-center transition-opacity disabled:opacity-40"
            >
              이 위치로 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
