import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Набор переиспользуемых скелетонов для состояний загрузки страниц AURIX.

// Ряд KPI-карточек (дашборд).
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 flex flex-col gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Прямоугольник-заглушка под график/крупный блок.
export function BlockSkeleton({ className = 'h-72' }) {
  return (
    <Card>
      <CardHeader className="border-0">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${className}`} />
      </CardContent>
    </Card>
  );
}

// Список строк внутри карточки (FAQ, блог, тарифы, аудит).
export function CardListSkeleton({ rows = 6, title = true }) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-3 py-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-md shrink-0" />
            <div className="flex flex-col gap-2 grow">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Профиль/детальная карточка: шапка-герой + блоки.
export function HeroDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <Skeleton className="size-[100px] rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-4 gap-6 w-full max-w-xl mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BlockSkeleton className="h-48" />
        <BlockSkeleton className="h-48" />
      </div>
    </div>
  );
}

// Инбокс чата: список диалогов + область сообщений.
export function ChatSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex flex-col gap-2 grow">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-10 rounded-lg ${i % 2 ? 'w-1/2 self-end' : 'w-2/3'}`}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Форма (настройки).
export function FormSkeleton({ fields = 3 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5 py-4 max-w-md">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}
