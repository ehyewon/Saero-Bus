import { MyLocation, Layers, ArrowBack } from '@mui/icons-material';

const goHub = () =>
  window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }));

export function MapPage() {
  return (
    <div className="size-full bg-[#FAFAFA] overflow-auto">
      <div className="max-w-md mx-auto min-h-full pb-6 relative">
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
          <h1 className="text-xl font-extrabold text-gray-900">지도</h1>
        </div>

        {/* Map placeholder */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden border border-emerald-200">
          <div className="relative h-[480px] bg-emerald-50">
            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                type="button"
                className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-700"
              >
                <Layers />
              </button>
              <button
                type="button"
                className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-700"
              >
                <MyLocation />
              </button>
            </div>

            {/* Placeholder content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="card-grad text-center p-6 rounded-2xl shadow-md max-w-xs">
                <Layers
                  sx={{ fontSize: 56, opacity: 0.5 }}
                  className="text-emerald-700 mb-3"
                />
                <h3 className="font-bold text-lg text-gray-900 mb-1">지도 기능</h3>
                <p className="text-sm text-gray-600 mb-4">
                  주변 버스 정류장과<br />
                  실시간 버스 위치를 확인하세요
                </p>
                <div className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-full text-sm font-semibold">
                  곧 출시 예정
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
