import { useEffect, useRef } from 'react';

interface WheelTimePickerProps {
  /** "HH:mm" 24h */
  value: string;
  onChange: (value: string) => void;
  /** Override minute choices (default: 0..59). Use e.g. [0, 30] for 30-minute step. */
  minuteOptions?: readonly number[];
  /** Override AM/PM labels (default: 'AM' / 'PM'). */
  ampmLabels?: { am: string; pm: string };
}

const ITEM_H = 40;     // px per row
const VISIBLE = 5;     // odd number; the middle row is the selected value
const PAD = Math.floor(VISIBLE / 2);

const pad = (n: number) => String(n).padStart(2, '0');

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const defaultMinutes = Array.from({ length: 60 }, (_, i) => i); // 0..59
const ampms = ['AM', 'PM'] as const;
type AmPm = (typeof ampms)[number];

interface WheelColumnProps<T> {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}

function WheelColumn<T>({ items, value, onChange, format }: WheelColumnProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const idx = Math.max(0, items.indexOf(value));

  // Keep scroll position in sync with controlled value
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
  }, [idx]);

  const handleScroll = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!ref.current) return;
      const newIdx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, newIdx));
      const next = items[clamped];
      if (next !== value) onChange(next);
      // Snap to the rounded position in case scroll stopped between rows
      const target = clamped * ITEM_H;
      if (Math.abs(ref.current.scrollTop - target) > 1) {
        ref.current.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 80);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="flex-1 overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
      style={{
        height: ITEM_H * VISIBLE,
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
      }}
    >
      <div style={{ height: ITEM_H * PAD }} />
      {items.map((item, i) => {
        const distance = Math.abs(i - idx);
        const isCenter = distance === 0;
        return (
          <div
            key={String(item)}
            className={`snap-center flex items-center justify-center select-none tabular-nums transition-all ${
              isCenter ? 'text-gray-900 font-extrabold' : 'text-gray-400 font-medium'
            }`}
            style={{
              height: ITEM_H,
              fontSize: isCenter ? 28 : 22,
            }}
          >
            {format(item)}
          </div>
        );
      })}
      <div style={{ height: ITEM_H * PAD }} />
    </div>
  );
}

export function WheelTimePicker({
  value,
  onChange,
  minuteOptions,
  ampmLabels,
}: WheelTimePickerProps) {
  const minutes = minuteOptions ?? defaultMinutes;
  const [h24Str, mStr] = value.split(':');
  const h24 = Number(h24Str);
  const rawM = Number(mStr);
  // Snap incoming minute to the nearest allowed option so the column always has a match.
  const m = minutes.reduce(
    (best, cur) => (Math.abs(cur - rawM) < Math.abs(best - rawM) ? cur : best),
    minutes[0],
  );
  const ampm: AmPm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (nextH12: number, nextM: number, nextAmpm: AmPm) => {
    let next24 = nextH12 % 12;
    if (nextAmpm === 'PM') next24 += 12;
    onChange(`${pad(next24)}:${pad(nextM)}`);
  };

  const labelFor = (v: AmPm) => (ampmLabels ? (v === 'AM' ? ampmLabels.am : ampmLabels.pm) : v);

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Center highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-[#B8E0D2] bg-[#EAF4F0]/60"
        style={{ top: ITEM_H * PAD, height: ITEM_H }}
      />
      <div className="flex">
        <WheelColumn
          items={hours12}
          value={h12}
          onChange={(v) => emit(v, m, ampm)}
          format={(v) => String(v)}
        />
        <div className="flex items-center font-extrabold text-2xl text-gray-400 select-none">
          :
        </div>
        <WheelColumn
          items={minutes}
          value={m}
          onChange={(v) => emit(h12, v, ampm)}
          format={(v) => pad(v)}
        />
        <WheelColumn
          items={ampms}
          value={ampm}
          onChange={(v) => emit(h12, m, v)}
          format={labelFor}
        />
      </div>
    </div>
  );
}
