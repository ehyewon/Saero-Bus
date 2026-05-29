/**
 * "오늘의 오리버스" — 홈 하단 풍경 띠.
 * 배경 정지. 오리버스가 좌→정류장(3s 정차)→우 반복.
 */

function CityStrip() {
  // Single static copy now (no scroll), so fill the full container width.
  return (
    <svg viewBox="0 0 240 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden>
      {/* tree 1 */}
      <rect x="8" y="80" width="4" height="30" fill="#5C8F77" />
      <circle cx="10" cy="64" r="14" fill="#7FB89C" />

      {/* low building */}
      <rect x="26" y="50" width="46" height="60" fill="#B8D4C5" />
      <rect x="34" y="60" width="6" height="9" fill="#7FB89C" opacity="0.55" />
      <rect x="48" y="60" width="6" height="9" fill="#7FB89C" opacity="0.55" />
      <rect x="34" y="76" width="6" height="9" fill="#7FB89C" opacity="0.55" />
      <rect x="48" y="76" width="6" height="9" fill="#7FB89C" opacity="0.55" />

      {/* tree 2 */}
      <rect x="86" y="82" width="4" height="28" fill="#5C8F77" />
      <circle cx="88" cy="68" r="13" fill="#7FB89C" />

      {/* tall building */}
      <rect x="106" y="28" width="58" height="82" fill="#A8C2B5" />
      <rect x="116" y="40" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="130" y="40" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="144" y="40" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="116" y="56" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="130" y="56" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="144" y="56" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="116" y="72" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="130" y="72" width="6" height="9" fill="#9DC9B5" opacity="0.6" />
      <rect x="144" y="72" width="6" height="9" fill="#9DC9B5" opacity="0.6" />

      {/* tree 3 */}
      <rect x="178" y="78" width="4" height="32" fill="#5C8F77" />
      <circle cx="180" cy="62" r="15" fill="#7FB89C" />

      {/* short building */}
      <rect x="200" y="58" width="36" height="52" fill="#C7DAD0" />
      <rect x="208" y="68" width="6" height="9" fill="#9DC9B5" opacity="0.55" />
      <rect x="220" y="68" width="6" height="9" fill="#9DC9B5" opacity="0.55" />
      <rect x="208" y="84" width="6" height="9" fill="#9DC9B5" opacity="0.55" />
      <rect x="220" y="84" width="6" height="9" fill="#9DC9B5" opacity="0.55" />
    </svg>
  );
}

export function OriBusScene() {
  return (
    <div className="relative mt-6 h-44 rounded-2xl overflow-hidden bg-gradient-to-b from-[#EAF4F0] to-[#D8EBE2]">
      <style>{`
        @keyframes saero-cloud-drift {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-120px); }
        }
        /* enter from left → arrive at bus-stop (≈3s hold) → leave right → repeat
           tighter cycle: shorter off-screen wait so re-entry feels alive */
        @keyframes saero-duck-pass {
          0%   { transform: translateX(-60vw); }
          35%  { transform: translateX(0); }
          56%  { transform: translateX(0); }
          91%  { transform: translateX(60vw); }
          100% { transform: translateX(60vw); }
        }
        @keyframes saero-duck-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .saero-cloud-1   { animation: saero-cloud-drift 50s linear infinite; }
        .saero-cloud-2   { animation: saero-cloud-drift 70s linear infinite; animation-delay: -25s; }
        .saero-duck-pass { animation: saero-duck-pass 14s linear infinite; will-change: transform; }
        .saero-duck-bob  { animation: saero-duck-bob 0.9s ease-in-out infinite; }
      `}</style>

      {/* Sky / hills (static) */}
      <svg
        viewBox="0 0 400 176"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <path
          d="M0,120 Q60,108 110,116 T220,114 T340,118 T400,116 L400,176 L0,176 Z"
          fill="#C7E2D3"
          opacity="0.55"
        />
      </svg>

      {/* Static city strip — background no longer scrolls */}
      <div
        className="absolute left-0 right-0"
        style={{ bottom: 10, height: 120 }}
      >
        <CityStrip />
      </div>

      {/* Thin road */}
      <div className="absolute left-0 right-0 bottom-0 h-[10px] bg-[#5C5C5C]" />
      <div className="absolute left-0 right-0 bottom-[10px] h-[1.5px] bg-[#9A9A9A]" />
      <div
        className="absolute left-0 right-0 bottom-[4px] h-[1.5px] opacity-75"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, #FFFFFF 0 10px, transparent 10px 22px)',
        }}
      />

      {/* Drifting clouds (kept, since the rest of the scene is now static) */}
      <svg
        className="saero-cloud-1 absolute top-4 left-0"
        width="54" height="16" viewBox="0 0 54 16" aria-hidden
      >
        <ellipse cx="14" cy="10" rx="12" ry="6" fill="#FFFFFF" opacity="0.85" />
        <ellipse cx="32" cy="8" rx="16" ry="7" fill="#FFFFFF" opacity="0.85" />
      </svg>
      <svg
        className="saero-cloud-2 absolute top-10 left-0"
        width="40" height="14" viewBox="0 0 40 14" aria-hidden
      >
        <ellipse cx="11" cy="8" rx="10" ry="5" fill="#FFFFFF" opacity="0.7" />
        <ellipse cx="24" cy="7" rx="12" ry="6" fill="#FFFFFF" opacity="0.7" />
      </svg>

      {/* Bus stop booth — roofed shelter only */}
      <div
        className="absolute"
        style={{ left: 'calc(50% + 8px)', bottom: 10 }}
        aria-hidden
      >
        <svg width="96" height="78" viewBox="0 0 96 78">
          <rect x="0" y="0" width="96" height="8" rx="1" fill="#3D2A1F" />
          <rect x="0" y="0" width="96" height="2.5" fill="#5C3F30" />
          <rect x="4" y="8" width="3.5" height="70" fill="#5C5C5C" />
          <rect x="88.5" y="8" width="3.5" height="70" fill="#5C5C5C" />
          <rect x="7.5" y="8" width="81" height="60" fill="#EAF4F0" opacity="0.45" />
          <rect x="34" y="8" width="0.8" height="60" fill="#A8C2B5" opacity="0.7" />
          <rect x="60" y="8" width="0.8" height="60" fill="#A8C2B5" opacity="0.7" />
          <rect x="12" y="16" width="22" height="14" rx="1" fill="#FFFFFF" opacity="0.85" />
          <rect x="14" y="19" width="14" height="1.4" fill="#007956" opacity="0.7" />
          <rect x="14" y="22" width="18" height="1.2" fill="#9A9A9A" opacity="0.7" />
          <rect x="14" y="24.5" width="16" height="1.2" fill="#9A9A9A" opacity="0.7" />
          <rect x="14" y="27" width="12" height="1.2" fill="#9A9A9A" opacity="0.7" />
          <rect x="12" y="54" width="72" height="6" rx="1" fill="#A89888" />
          <rect x="12" y="54" width="72" height="1.5" fill="#C2A892" />
          <rect x="18" y="60" width="3" height="16" fill="#7C7C7C" />
          <rect x="75" y="60" width="3" height="16" fill="#7C7C7C" />
        </svg>
      </div>

      {/* BUS STOP standing sign */}
      <div
        className="absolute"
        style={{ left: 'calc(50% + 110px)', bottom: 10 }}
        aria-hidden
      >
        <svg width="52" height="88" viewBox="0 0 52 88">
          <rect x="24" y="24" width="4" height="64" fill="#7C7C7C" />
          <rect x="24" y="24" width="2" height="64" fill="#9A9A9A" />
          <rect x="2" y="2" width="48" height="22" rx="3" fill="#FFFFFF" />
          <rect
            x="2" y="2" width="48" height="22" rx="3"
            fill="none" stroke="#007956" strokeWidth="1.8"
          />
          <text
            x="26" y="15" textAnchor="middle"
            fontSize="6" fontWeight="800" fill="#007956"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.3"
          >
            BUS STOP
          </text>
        </svg>
      </div>

      {/* Ori-bus — enter left, hold at stop ~3s, exit right, loop.
          Bus parks well inside the booth — beak reaches roughly the booth center,
          so the bus visually pulls into the stop from the right. */}
      <div
        className="saero-duck-pass absolute"
        style={{ left: 'calc(50% - 10px)', bottom: 10 }}
      >
        <div className="saero-duck-bob">
          <svg width="88" height="60" viewBox="0 0 88 60" aria-hidden>
            <rect x="6" y="20" width="64" height="30" rx="9" fill="#FFCE3A" />
            <rect x="14" y="25" width="20" height="14" rx="2.5" fill="#9ED6F1" />
            <rect x="38" y="25" width="14" height="14" rx="2.5" fill="#9ED6F1" />
            <circle cx="66" cy="22" r="12" fill="#FFCE3A" />
            <path d="M66,9 Q69,5 72,9" stroke="#E8A91F" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="70" cy="19" r="2.1" fill="#1A1A1A" />
            <circle cx="70.7" cy="18.3" r="0.7" fill="#FFFFFF" />
            <path d="M76,22 L86,23.5 L76,26 Z" fill="#FF8A3D" />
            <circle cx="22" cy="51" r="7" fill="#2A2A2A" />
            <circle cx="54" cy="51" r="7" fill="#2A2A2A" />
            <circle cx="22" cy="51" r="3" fill="#FFCE3A" />
            <circle cx="54" cy="51" r="3" fill="#FFCE3A" />
            <circle cx="9" cy="30" r="2" fill="#FFFFFF" opacity="0.9" />
          </svg>
        </div>
      </div>
    </div>
  );
}
