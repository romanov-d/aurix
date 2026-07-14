import { useAuth } from '@/auth/context/auth-context';
import { GearSix, Moon, ShieldCheck, UserCircle } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { avatarUrl } from '@/lib/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export function UserDropdownMenu({ trigger }) {
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const raw = user?.raw || user;
  const isAdmin = (raw?.role || user?.role) === 'admin';

  const displayName =
    raw?.name ||
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Пользователь');
  const displayEmail = raw?.email || user?.email || '';
  const displayAvatar = avatarUrl(raw);

  const handleThemeToggle = (checked) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Шапка */}
        <div className="flex items-center gap-2 p-3">
          <img
            className="size-9 rounded-full border-2 border-primary object-cover"
            src={displayAvatar}
            alt="Аватар"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-mono font-semibold truncate">
              {displayName}
            </span>
            <a
              href={`mailto:${displayEmail}`}
              className="text-xs text-muted-foreground hover:text-primary truncate"
            >
              {displayEmail}
            </a>
          </div>
        </div>

        <DropdownMenuSeparator />

        {isAdmin ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/me" className="flex items-center gap-2">
                <UserCircle />
                Личный кабинет
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <GearSix />
                Настройки
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/audit" className="flex items-center gap-2">
                <ShieldCheck />
                Журнал действий
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/me" className="flex items-center gap-2">
              <UserCircle />
              Личный кабинет
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Тёмная тема */}
        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Тёмная тема
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>

        <div className="p-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={logout}
          >
            Выйти
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
