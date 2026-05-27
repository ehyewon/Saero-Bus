import { useState } from 'react';
import { Search, DirectionsBus, ArrowBack } from '@mui/icons-material';

interface BusInfo {
  number: string;
  name: string;
  type: 'express' | 'trunk' | 'branch' | 'local';
  firstBus: string;
  lastBus: string;
  interval: string;
}

const goHub = () =>
  window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }));

const busBadgeBg: Record<BusInfo['type'], string> = {
  express: 'bg-emerald-800',
  trunk: 'bg-emerald-700',
  branch: 'bg-emerald-500',
  local: 'bg-emerald-400',
};

const busTypeName: Record<BusInfo['type'], string> = {
  express: '광역',
  trunk: '간선',
  branch: '지선',
  local: '마을',
};

export function BusPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const allBuses: BusInfo[] = [
    { number: '140', name: '강남역 - 서울역', type: 'trunk', firstBus: '05:30', lastBus: '23:00', interval: '10-15분' },
    { number: '146', name: '강남역 - 양재역', type: 'branch', firstBus: '06:00', lastBus: '22:30', interval: '15-20분' },
    { number: '301', name: '수서역 - 강남역', type: 'trunk', firstBus: '05:00', lastBus: '23:30', interval: '8-12분' },
    { number: '360', name: '강남역 - 잠실역', type: 'trunk', firstBus: '05:15', lastBus: '23:45', interval: '12-18분' },
    { number: '401', name: '선릉역 - 삼성역', type: 'branch', firstBus: '06:30', lastBus: '22:00', interval: '20-25분' },
  ];

  const displayBuses = searchQuery
    ? allBuses.filter(
        (b) =>
          b.number.includes(searchQuery) ||
          b.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allBuses.slice(0, 5);

  return (
    <div className="size-full bg-[#FAFAFA] overflow-auto">
      <div className="max-w-md mx-auto min-h-full pb-6">
        {/* Header */}
        <div className="px-4 pt-2 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goHub}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-800"
            aria-label="뒤로"
          >
            <ArrowBack />
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">버스 검색</h1>
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="card-grad rounded-full px-4 py-3 flex items-center gap-2 shadow-sm">
            <Search className="text-gray-400" />
            <input
              type="text"
              placeholder="버스 번호나 노선명을 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none bg-transparent text-sm min-w-0"
            />
          </div>
        </div>

        {/* Results */}
        <div className="p-4">
          {displayBuses.length > 0 ? (
            <>
              <h2 className="text-sm font-bold text-gray-600 mb-3">
                {searchQuery ? `검색 결과 (${displayBuses.length})` : '인기 노선'}
              </h2>
              <div className="space-y-3">
                {displayBuses.map((bus, index) => (
                  <div key={index} className="card-grad rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`${busBadgeBg[bus.type]} text-white rounded-lg px-4 py-2 min-w-[70px] text-center shrink-0`}
                        >
                          <div className="font-bold text-lg">{bus.number}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{bus.name}</div>
                          <div className="text-xs text-gray-500">{busTypeName[bus.type]}버스</div>
                        </div>
                      </div>
                      <DirectionsBus className="text-emerald-700 shrink-0" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">첫차</div>
                        <div className="font-medium">{bus.firstBus}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">막차</div>
                        <div className="font-medium">{bus.lastBus}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">배차간격</div>
                        <div className="font-medium">{bus.interval}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <DirectionsBus sx={{ fontSize: 64, opacity: 0.3 }} className="text-emerald-700" />
              <p className="mt-4 text-center">
                {searchQuery ? '검색 결과가 없습니다' : '버스 번호를 검색해보세요'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
