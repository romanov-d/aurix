import { Link, Outlet } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

export function BrandedLayout() {
  return (
    <>
      <style>
        {`
          .branded-bg {
            background-image: radial-gradient(120% 120% at 80% 10%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 45%), linear-gradient(160deg, #0e0e10 0%, #050505 100%);
          }
        `}
      </style>
      <div className="grid lg:grid-cols-2 grow">
        <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">
              <Outlet />
            </CardContent>
          </Card>
        </div>

        <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg">
          <div className="flex flex-col p-8 lg:p-16 gap-4">
            <Link to="/">
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="h-[28px] max-w-none"
                alt=""
              />
            </Link>

            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-semibold text-mono">
                AURIX MOTORS
              </h3>
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
    </>
  );
}
