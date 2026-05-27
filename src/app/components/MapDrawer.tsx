import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  Map as MapIcon,
  MyLocation,
  DirectionsBus,
} from '@mui/icons-material';

interface MapDrawerProps {
  routeActive: boolean;
  busNumber?: string;
}

// SVG canvas
const W = 400;
const H = 320;
const USER = { x: W / 2, y: H / 2 + 20 };

// Bus route waypoints (in SVG coords). The route arcs across the city grid.
const ROUTE: { x: number; y: number }[] = [
  { x: 30, y: 250 },
  { x: 90, y: 230 },
  { x: 150, y: 210 },
  { x: 200, y: 185 },     // stop A
  { x: 240, y: 160 },
  { x: 280, y: 130 },     // stop B (near user)
  { x: 320, y: 100 },
  { x: 360, y: 70 },      // stop C
  { x: 380, y: 40 },
];

// Indices into ROUTE that should render as stops
const STOP_INDICES = [3, 5, 7];

// Linear interpolation between waypoints by progress 0..1
function pointAt(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const total = ROUTE.length - 1;
  const exact = clamped * total;
  const idx = Math.min(Math.floor(exact), total - 1);
  const t = exact - idx;
  const a = ROUTE[idx];
  const b = ROUTE[idx + 1];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    rotation: Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI),
  };
}

const routeD = ROUTE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

// Background road grid lines
const H_ROADS = [50, 110, 170, 230, 290];
const V_ROADS = [50, 120, 200, 280, 350];

export function MapDrawer({ routeActive, busNumber }: MapDrawerProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const startRef = useRef<number>(Date.now());

  // Drive bus position + a gentle "panning" feel for the navigation effect
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      // Bus completes a loop every 40s
      const p = (elapsed % 40) / 40;
      setProgress(p);
      // Subtle drift to fake "map moves with me"
      setPan({
        x: Math.sin(elapsed / 4) * 4,
        y: Math.cos(elapsed / 5) * 3,
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [open]);

  const bus = useMemo(() => pointAt(progress), [progress]);

  return (
    <div className="fixed bottom-16 inset-x-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto px-3">
        <div
          className={`pointer-events-auto bg-white rounded-t-3xl shadow-2xl border border-gray-200 transition-[max-height] duration-300 ease-out overflow-hidden ${
            open ? 'max-h-[70vh]' : 'max-h-14'
          }`}
        >
          {/* Handle / header */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex flex-col items-center pt-2 pb-1"
            aria-expanded={open}
          >
            <span className="block h-1 w-10 rounded-full bg-gray-300" />
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
              <MapIcon className="text-blue-600" sx={{ fontSize: 18 }} />
              <span className="font-semibold">
                {routeActive ? `${busNumber ?? ''}번 노선 지도` : '지도 보기'}
              </span>
              {open ? (
                <KeyboardArrowDown className="text-gray-500" sx={{ fontSize: 18 }} />
              ) : (
                <KeyboardArrowUp className="text-gray-500" sx={{ fontSize: 18 }} />
              )}
            </div>
          </button>

          {/* Map panel */}
          <div className="px-3 pb-3">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-[#E8EDE3]">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-72 block"
                preserveAspectRatio="xMidYMid slice"
              >
                {/* base land */}
                <rect x="0" y="0" width={W} height={H} fill="#E8EDE3" />
                {/* parks */}
                <rect x="0" y="0" width="120" height="80" fill="#CFE0BC" opacity="0.7" />
                <rect x={W - 80} y={H - 90} width="80" height="90" fill="#CFE0BC" opacity="0.6" />

                {/* Subtle pan group */}
                <g transform={`translate(${pan.x} ${pan.y})`}>
                  {/* road grid */}
                  {H_ROADS.map((y) => (
                    <line key={`h${y}`} x1="0" y1={y} x2={W} y2={y} stroke="#D6D6D6" strokeWidth="10" />
                  ))}
                  {V_ROADS.map((x) => (
                    <line key={`v${x}`} x1={x} y1="0" x2={x} y2={H} stroke="#D6D6D6" strokeWidth="10" />
                  ))}
                  {/* Major road accent */}
                  <line x1="0" y1="170" x2={W} y2="170" stroke="#C4B79A" strokeWidth="14" />
                </g>

                {/* route */}
                {routeActive && (
                  <>
                    <path
                      d={routeD}
                      fill="none"
                      stroke="#3B82F6"
                      strokeOpacity="0.25"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={routeD}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* stops (yellow) */}
                    {STOP_INDICES.map((i) => {
                      const p = ROUTE[i];
                      return (
                        <g key={`stop-${i}`}>
                          <circle cx={p.x} cy={p.y} r="9" fill="white" />
                          <circle cx={p.x} cy={p.y} r="6" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
                        </g>
                      );
                    })}
                  </>
                )}

                {/* User (center, pulse) */}
                <g>
                  <circle cx={USER.x} cy={USER.y} r="18" fill="#3B82F6" opacity="0.15">
                    <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={USER.x} cy={USER.y} r="7" fill="white" />
                  <circle cx={USER.x} cy={USER.y} r="5" fill="#2563EB" />
                </g>

                {/* Bus marker — moves along route */}
                {routeActive && (
                  <g transform={`translate(${bus.x} ${bus.y})`}>
                    <rect x="-18" y="-14" width="36" height="22" rx="6" fill="white" stroke="#0F172A" strokeWidth="1.5" />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#0F172A"
                    >
                      {busNumber ?? '버스'}
                    </text>
                    <rect x="-6" y="10" width="12" height="6" rx="2" fill="#FACC15" />
                  </g>
                )}
              </svg>

              {/* Recenter button (cosmetic — user is already centered) */}
              <button
                type="button"
                onClick={() => setPan({ x: 0, y: 0 })}
                className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-700"
                aria-label="내 위치로"
              >
                <MyLocation />
              </button>

              {/* Status chip */}
              {routeActive && (
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 shadow-sm">
                  <DirectionsBus className="text-blue-600" sx={{ fontSize: 14 }} />
                  <span className="text-xs font-semibold text-gray-800">
                    {busNumber ?? ''}번 실시간 위치
                  </span>
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                  내 위치
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600" />
                  정류장
                </span>
              </div>
              <span>실시간 추적 중</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
