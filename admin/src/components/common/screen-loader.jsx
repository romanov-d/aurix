'use client';

import { toAbsoluteUrl } from '@/lib/helpers';

export function ScreenLoader() {
  return (
    <div className="flex flex-col items-center gap-2 justify-center fixed inset-0 z-50 transition-opacity duration-700 ease-in-out">
      <img
        className="h-[26px] max-w-none"
        src={toAbsoluteUrl('/media/app/mini-logo.svg')}
        alt="AURIX"
      />

      <div className="text-muted-foreground font-medium text-sm">
        Загрузка…
      </div>
    </div>
  );
}
