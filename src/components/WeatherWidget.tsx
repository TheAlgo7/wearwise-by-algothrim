'use client';

import { Squircle } from '@/components/oneui';
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
      <Squircle variant="raised" className={cn('p-5 min-h-[120px] animate-pulse', className)}>
        <div className="h-4 w-20 bg-ink-400 rounded" />
        <div className="mt-3 h-10 w-28 bg-ink-400 rounded" />
      </Squircle>
    );
  }

  const Icon = iconFor(weather.icon);
  const overridden = effectiveTempC !== undefined && Math.abs(effectiveTempC - weather.temp_c) > 0.1;

  return (
    <Squircle variant="raised" className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="oneui-hero-sub flex items-center gap-1.5">
            {tripCity ? <span className="text-crimson-300">TRIP · </span> : null}
            <span className="truncate">{weather.city}, {weather.country}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-[56px] leading-none font-bold tracking-tight text-fog-100">
              {Math.round(overridden ? effectiveTempC! : weather.temp_c)}°
            </span>
            {overridden && (
              <span className="text-oneui-cap text-fog-400 line-through">
                {Math.round(weather.temp_c)}°
              </span>
            )}
          </div>
          <p className="mt-1 text-oneui-body text-fog-200 capitalize">
            {weather.condition}
          </p>
        </div>
        <div className="shrink-0 h-20 w-20 rounded-full bg-ink-300/60 flex items-center justify-center">
          <Icon size={44} className="text-crimson-300" strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-5 text-oneui-cap text-fog-300">
        <span className="flex items-center gap-1.5"><Droplets size={14} />{weather.humidity}%</span>
        <span className="flex items-center gap-1.5"><Wind size={14} />{weather.wind_kph} kph</span>
        {weather.is_night && <span className="flex items-center gap-1.5 text-crimson-300"><Moon size={14} />night</span>}
      </div>
    </Squircle>
  );
}
