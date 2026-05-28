import { motion } from 'motion/react';
import type { WeatherCondition } from '../lib/weather';

interface WeatherEffectProps {
  condition: WeatherCondition;
  tempC: number;
  /** PM10 reading — used to upgrade the "haze" effect when air is unusually bad. */
  pm10: number;
}

/** Decorative overlay rendered behind the greeting/weather card content. */
export function WeatherEffect({ condition, tempC, pm10 }: WeatherEffectProps) {
  if (condition === 'rain') return <RainParticles />;
  if (condition === 'snow') return <SnowParticles />;
  if (condition === 'haze' || pm10 >= 80) return <HazeParticles />;
  if (condition === 'sunny' && tempC >= 25) return <SunshineGlow />;
  return null;
}

function RainParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block w-px bg-[#3B82F6]/55"
          style={{
            left: `${(i * 7.5 + 3) % 100}%`,
            height: 8 + (i % 4) * 2,
          }}
          initial={{ y: '-15%' }}
          animate={{ y: '120%' }}
          transition={{
            duration: 0.65 + (i % 5) * 0.12,
            delay: (i % 7) * 0.18,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function SnowParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 5 + (i % 4);
        return (
          <motion.span
            key={i}
            className="absolute block rounded-full bg-white border border-[#0EA5E9]/30"
            style={{
              left: `${(i * 8 + 4) % 100}%`,
              width: size,
              height: size,
              boxShadow: '0 1px 3px rgba(14, 110, 139, 0.35)',
            }}
            initial={{ y: '-15%', x: 0 }}
            animate={{
              y: '125%',
              x: i % 2 === 0 ? [0, 10, -8, 0] : [0, -8, 10, 0],
            }}
            transition={{
              duration: 3.5 + (i % 4),
              delay: (i % 6) * 0.4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      })}
    </div>
  );
}

function SunshineGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {/* Warm halo top-right */}
      <motion.div
        className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#FACC15]/45 blur-2xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Tiny sparkles around the upper-right corner */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block w-1 h-1 rounded-full bg-[#F4A82B]"
          style={{
            top: `${10 + (i * 13) % 55}%`,
            right: `${5 + (i * 17) % 45}%`,
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.3, 0.6] }}
          transition={{
            duration: 1.6 + i * 0.3,
            delay: i * 0.22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function HazeParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {Array.from({ length: 8 }).map((_, i) => {
        const size = 3 + (i % 2);
        return (
          <motion.span
            key={i}
            className="absolute block rounded-full bg-[#92400E]/35"
            style={{
              top: `${10 + (i * 13) % 65}%`,
              width: size,
              height: size,
            }}
            initial={{ x: '-10%' }}
            animate={{ x: '115%' }}
            transition={{
              duration: 9 + (i % 4),
              delay: i * 0.8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      })}
    </div>
  );
}
