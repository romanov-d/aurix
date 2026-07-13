'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { StatCardsSkeleton, BlockSkeleton } from '@/components/common/aurix-skeletons';
import { DashboardContent } from './dashboard-content';
import { DashboardDataContext } from './dashboard-data';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get('/admin/dashboard')
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message || 'Не удалось загрузить дашборд'); });
    return () => { active = false; };
  }, []);

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Дашборд" />
            <ToolbarDescription>Обзор проката AURIX</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        {error ? (
          <div className="py-10 text-center text-destructive">{error}</div>
        ) : !data ? (
          <div className="flex flex-col gap-5">
            <StatCardsSkeleton count={4} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <BlockSkeleton className="h-72" />
              <BlockSkeleton className="h-72" />
              <BlockSkeleton className="h-72" />
            </div>
            <BlockSkeleton className="h-64" />
          </div>
        ) : (
          <DashboardDataContext.Provider value={data}>
            <DashboardContent />
          </DashboardDataContext.Provider>
        )}
      </Container>
    </Fragment>
  );
}
