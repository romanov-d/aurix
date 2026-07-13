import { Link, Outlet } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import SafeShader from '@/components/common/safe-shader';

export function BrandedLayout() {
  return (
    <div className="grid lg:grid-cols-2 grow">
      <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
        <Card className="w-full max-w-[400px]">
          <CardContent className="p-6">
            <Outlet />
          </CardContent>
        </Card>
      </div>

      <div className="relative overflow-hidden lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2">
        {/* Анимированный WebGL-фон (десктоп) / статичный градиент (мобилки) */}
        <div className="absolute inset-0 z-0">
          <SafeShader
            colorBack="hsl(0,0%,0%)"
            softness={0.55}
            intensity={0.6}
            noise={0}
            shape="corners"
            offsetX={0}
            offsetY={0}
            scale={1}
            rotation={0}
            speed={1.6}
            colors={['hsl(46,65%,55%)', 'hsl(42,60%,40%)', 'hsl(32,45%,15%)']}
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        <div className="relative z-10 flex flex-col p-8 lg:p-16 gap-4">
          <Link to="/">
            <img
              src={toAbsoluteUrl('/media/app/mini-logo.svg')}
              className="h-[28px] max-w-none"
              alt=""
            />
          </Link>

          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-semibold text-mono">AURIX MOTORS</h3>
            <div className="text-base font-medium text-secondary-foreground">
              Панель управления прокатом премиум-авто.
              <br /> Вход для&nbsp;
              <span className="text-mono font-semibold">
                сотрудников и клиентов
              </span>
              &nbsp;AURIX.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
