import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';

export function Sidebar() {
  const { settings } = useSettings();
  const { pathname } = useLocation();

  return (
    <div
      className={cn(
        'sidebar bg-background lg:border-e lg:border-border lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (settings.layouts.demo1.sidebarTheme === 'dark' ||
          pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="overflow-hidden grow flex flex-col">
        <div className="w-(--sidebar-default-width) grow overflow-y-auto">
          <SidebarMenu />
        </div>
        {/* Жёсткая ссылка на главную сайта (вне SPA панели) */}
        <div className="w-(--sidebar-default-width) shrink-0 p-4 pt-2">
          <a
            href="/"
            className="flex items-center gap-2 justify-center h-9 rounded-md border border-input text-sm text-secondary-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            ← Вернуться на сайт
          </a>
        </div>
      </div>
    </div>
  );
}
