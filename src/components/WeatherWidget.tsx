'use client';

import { cn } from '@/lib/cn';
import { CloudRain, Cloud, CloudSun, Sun, Moon, Snowflake, CloudLightning, Wind, Droplets } from 'lucide-react';
import type { WeatherSnapshot } from '@/types';

interface Props {
  weather: WeatherSnapshot | null;
  loading?: boolean;
  effectiveTempC?: number;
  tripCity?: string | null;
  className?: string;
}

const iconFor = (code: string) => {
  if (!code) return Sun;
  const base = code.slice(0, 2);
  switch (base) {
    case '01': return code.endsWith('n') ? Moon : Sun;
    case '02': return CloudSun;
    case '03':
    case '04': return Cloud;
    case '09':
    case '10': return CloudRain;
    case '11': return CloudLightning;
    case '13': return Snowflake;
    default:   return Cloud;
  }
};

export function WeatherWidget({ weather, loading, effectiveTempC, tripCity, className }: Props) {
  if (loading || !weather) {
    return (
      <div className={cn('glass-card p-5 min-h-[130px] animate-pulse', className)}>
        <div className="h-3 w-20 bg-white/10 rounded-full" />
        <div className="mt-4 h-12 w-28 bg-white/10 rounded-full" />
        <div className="mt-3 h-3 w-32 bg-white/10 rounded-full" />
      </div>
    );
  }

  const Icon = iconFor(weather.icon);
  const overridden = effectiveTempC !== undefined && Math.abs(effectiveTempC - weather.temp_c) > 0.1;

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {tripCity && (
              <span className="text-[#E2335D] text-oneui-cap font-bold tracking-widest uppercase">TRIP ·</span>
            )}
            <span className="text-[#FF86A0] text-oneui-cap font-semibold tracking-wider uppercase truncate">
              {weather.city}, {weather.country}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-[60px] leading-none font-bold tracking-tight text-[#FFEDE8]">
              {Math.round(overridden ? effectiveTempC! : weather.temp_c)}°
            </span>
            {overridden && (
              <span className="text-oneui-cap text-[#FFD9DA]/50 line-through">
                {Math.round(weather.temp_c)}°
              </span>
            )}
          </div>
          <p className="mt-1 text-oneui-body text-[#FFD9DA]/80 capitalize">{weather.condition}</p>
        </div>
        <div className="shrink-0 h-[64px] w-[64px] rounded-full bg-white/[0.07] flex items-center justify-center">
          <Icon size={38} style={{ color: '#FF86A0' }} strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-5 text-oneui-cap text-[#FFD9DA]/60">
        <span className="flex items-center gap-1.5">
          <Droplets size={13} style={{ color: '#FF86A0' }} />
          {weather.humidity}%
        </span>
        <span className="flex items-center gap-1.5">
          <Wind size={13} style={{ color: '#FF86A0' }} />
          {weather.wind_kph} kph
        </span>
        {weather.is_night && (
          <span className="flex items-center gap-1.5" style={{ color: '#FF86A0' }}>
            <Moon size={13} />night
          </span>
        )}
      </div>
    </div>
  );
}
