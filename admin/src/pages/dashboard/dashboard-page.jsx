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
          <div className="py-10 text-center text-muted-foreground">Загрузка…</div>
        ) : (
          <DashboardDataContext.Provider value={data}>
            <DashboardContent />
          </DashboardDataContext.Provider>
        )}
      </Container>
    </Fragment>
  );
}
